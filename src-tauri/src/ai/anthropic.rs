use super::sse::SseEvent;
use super::ChatMessage;
use serde_json::{json, Value};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Piece {
    Text(String),
    Stop(Option<String>),
    Error(String),
    Ignore,
}

pub fn parse(event: &SseEvent) -> Piece {
    let Ok(value) = serde_json::from_str::<Value>(&event.data) else {
        return Piece::Ignore;
    };
    let event_type = value
        .get("type")
        .and_then(Value::as_str)
        .or(event.event.as_deref());
    match event_type {
        Some("content_block_delta") => {
            if value.pointer("/delta/type").and_then(Value::as_str) == Some("text_delta") {
                value
                    .pointer("/delta/text")
                    .and_then(Value::as_str)
                    .map(|text| Piece::Text(text.to_string()))
                    .unwrap_or(Piece::Ignore)
            } else {
                Piece::Ignore
            }
        }
        Some("message_delta") => value
            .pointer("/delta/stop_reason")
            .and_then(Value::as_str)
            .map(|reason| Piece::Stop(Some(reason.to_string())))
            .unwrap_or(Piece::Ignore),
        Some("message_stop") => Piece::Stop(None),
        Some("error") => Piece::Error(
            value
                .pointer("/error/message")
                .and_then(Value::as_str)
                .unwrap_or("Anthropic request failed")
                .to_string(),
        ),
        _ => Piece::Ignore,
    }
}

pub fn request_body(model: &str, system: &str, messages: &[ChatMessage]) -> Value {
    let mut body = json!({
        "model": model,
        "max_tokens": 64000,
        "stream": true,
        "system": system,
        "messages": messages.iter().map(|message| json!({
            "role": message.role.as_str(),
            "content": message.content,
        })).collect::<Vec<_>>(),
    });
    if uses_server_fallback(model) {
        body["fallbacks"] = json!("default");
    }
    body
}

pub fn uses_server_fallback(model: &str) -> bool {
    [
        "claude-opus-5-5",
        "claude-fable-5-1",
        "claude-opus-5",
        "claude-sonnet-5-5",
    ]
    .iter()
    .any(|prefix| model.starts_with(prefix))
}

pub fn endpoint(base_url: &str, suffix: &str) -> String {
    format!(
        "{}/{}",
        base_url.trim_end_matches('/'),
        suffix.trim_start_matches('/')
    )
}

#[cfg(test)]
mod tests {
    use super::{parse, request_body, Piece};
    use crate::ai::sse::SseEvent;
    use crate::ai::{ChatMessage, Role};

    fn event(data: &str) -> SseEvent {
        SseEvent {
            event: None,
            data: data.into(),
        }
    }

    #[test]
    fn parses_text_ignores_thinking_and_preserves_refusal_stop() {
        assert_eq!(
            parse(&event(
                r#"{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hola"}}"#
            )),
            Piece::Text("Hola".into())
        );
        assert_eq!(
            parse(&event(
                r#"{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"…"}}"#
            )),
            Piece::Ignore
        );
        assert_eq!(
            parse(&event(
                r#"{"type":"message_delta","delta":{"stop_reason":"refusal"},"usage":{"output_tokens":3}}"#
            )),
            Piece::Stop(Some("refusal".into()))
        );
    }

    #[test]
    fn adds_fallback_only_for_eligible_models_and_never_sampling_parameters() {
        let messages = [ChatMessage {
            role: Role::User,
            content: "hola".into(),
        }];
        let fallback = request_body("claude-opus-5-5", "system", &messages);
        assert_eq!(fallback["fallbacks"], "default");
        assert!(fallback.get("temperature").is_none());
        let standard = request_body("claude-haiku-5-5", "system", &messages);
        assert!(standard.get("fallbacks").is_none());
    }
}
