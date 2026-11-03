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
    if event.data == "[DONE]" {
        return Piece::Stop(None);
    }
    let Ok(value) = serde_json::from_str::<Value>(&event.data) else {
        return Piece::Ignore;
    };
    if let Some(message) = value.pointer("/error/message").and_then(Value::as_str) {
        return Piece::Error(message.to_string());
    }
    let Some(choice) = value.pointer("/choices/0") else {
        return Piece::Ignore;
    };
    if let Some(content) = choice.pointer("/delta/content").and_then(Value::as_str) {
        return Piece::Text(content.to_string());
    }
    if let Some(reason) = choice.get("finish_reason").and_then(Value::as_str) {
        return Piece::Stop(Some(reason.to_string()));
    }
    Piece::Ignore
}

pub fn request_body(model: &str, system: &str, messages: &[ChatMessage]) -> Value {
    let mut transcript = Vec::with_capacity(messages.len() + 1);
    transcript.push(json!({ "role": "system", "content": system }));
    transcript.extend(messages.iter().map(|message| {
        json!({
            "role": message.role.as_str(),
            "content": message.content,
        })
    }));
    json!({ "model": model, "stream": true, "messages": transcript })
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

    #[test]
    fn parses_openai_text_and_completion_sentinel() {
        assert_eq!(
            parse(&SseEvent {
                event: None,
                data: r#"{"choices":[{"delta":{"content":"Ho"}}]}"#.into()
            }),
            Piece::Text("Ho".into())
        );
        assert_eq!(
            parse(&SseEvent {
                event: None,
                data: "[DONE]".into()
            }),
            Piece::Stop(None)
        );
    }

    #[test]
    fn builds_the_openai_compatible_chat_body() {
        let messages = [ChatMessage {
            role: Role::Assistant,
            content: "answer".into(),
        }];
        let body = request_body("local-model", "system", &messages);
        assert_eq!(body["model"], "local-model");
        assert_eq!(body["stream"], true);
        assert_eq!(body["messages"][0]["role"], "system");
        assert_eq!(body["messages"][1]["role"], "assistant");
    }
}
