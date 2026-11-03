use super::{run_chat, AiConfig, AiEvent, AiProvider, ChatMessage, Role};
use std::sync::{atomic::AtomicBool, Arc};
use wiremock::{
    matchers::{method, path},
    Mock, MockServer, ResponseTemplate,
};

fn config(base_url: String) -> AiConfig {
    AiConfig {
        provider: AiProvider::OpenaiCompatible,
        base_url,
        model: "model-a".into(),
        secret_account: None,
    }
}

fn messages() -> Vec<ChatMessage> {
    vec![ChatMessage {
        role: Role::User,
        content: "Hola".into(),
    }]
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap()
}

#[tokio::test]
async fn emits_three_openai_deltas_and_done() {
    let server = MockServer::start().await;
    Mock::given(method("POST")).and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).insert_header("content-type", "text/event-stream")
            .set_body_string("data: {\"choices\":[{\"delta\":{\"content\":\"a\"}}]}\n\ndata: {\"choices\":[{\"delta\":{\"content\":\"b\"}}]}\n\ndata: {\"choices\":[{\"delta\":{\"content\":\"c\"}}]}\n\ndata: [DONE]\n\n"))
        .mount(&server).await;
    let mut events = Vec::new();
    run_chat(
        &client(),
        &config(server.uri() + "/v1"),
        None,
        "system",
        &messages(),
        Arc::new(AtomicBool::new(false)),
        |event| events.push(event),
    )
    .await;
    assert_eq!(
        events,
        vec![
            AiEvent::Delta { text: "a".into() },
            AiEvent::Delta { text: "b".into() },
            AiEvent::Delta { text: "c".into() },
            AiEvent::Done { stop_reason: None }
        ]
    );
}

#[tokio::test]
async fn reports_json_http_errors_without_exposing_headers() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .respond_with(
            ResponseTemplate::new(401)
                .set_body_json(serde_json::json!({"error":{"message":"invalid key"}})),
        )
        .mount(&server)
        .await;
    let mut events = Vec::new();
    run_chat(
        &client(),
        &config(server.uri()),
        Some("must-not-leak"),
        "system",
        &messages(),
        Arc::new(AtomicBool::new(false)),
        |event| events.push(event),
    )
    .await;
    assert_eq!(
        events,
        vec![AiEvent::Error {
            message: "invalid key".into()
        }]
    );
    assert!(!format!("{events:?}").contains("must-not-leak"));
}

#[tokio::test]
async fn connection_failure_mentions_the_target_url() {
    let mut events = Vec::new();
    run_chat(
        &client(),
        &config("http://127.0.0.1:1".into()),
        None,
        "system",
        &messages(),
        Arc::new(AtomicBool::new(false)),
        |event| events.push(event),
    )
    .await;
    assert!(
        matches!(&events[..], [AiEvent::Error { message }] if message.contains("http://127.0.0.1:1/chat/completions"))
    );
}

#[tokio::test]
async fn cancellation_stops_after_the_first_delta() {
    let server = MockServer::start().await;
    Mock::given(method("POST")).respond_with(ResponseTemplate::new(200).insert_header("content-type", "text/event-stream")
        .set_body_string("data: {\"choices\":[{\"delta\":{\"content\":\"first\"}}]}\n\ndata: {\"choices\":[{\"delta\":{\"content\":\"second\"}}]}\n\ndata: [DONE]\n\n"))
        .mount(&server).await;
    let cancel = Arc::new(AtomicBool::new(false));
    let cancel_from_emit = Arc::clone(&cancel);
    let mut events = Vec::new();
    run_chat(
        &client(),
        &config(server.uri()),
        None,
        "system",
        &messages(),
        cancel,
        |event| {
            if matches!(event, AiEvent::Delta { .. }) {
                cancel_from_emit.store(true, std::sync::atomic::Ordering::Release);
            }
            events.push(event);
        },
    )
    .await;
    assert_eq!(
        events,
        vec![
            AiEvent::Delta {
                text: "first".into()
            },
            AiEvent::Done {
                stop_reason: Some("cancelled".into())
            }
        ]
    );
}

#[tokio::test]
async fn clean_stream_end_without_done_finishes_normally() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .respond_with(
            ResponseTemplate::new(200)
                .insert_header("content-type", "text/event-stream")
                .set_body_string("data: {\"choices\":[{\"delta\":{\"content\":\"partial\"}}]}\n\n"),
        )
        .mount(&server)
        .await;
    let mut events = Vec::new();
    run_chat(
        &client(),
        &config(server.uri()),
        None,
        "system",
        &messages(),
        Arc::new(AtomicBool::new(false)),
        |event| events.push(event),
    )
    .await;
    assert_eq!(
        events,
        vec![
            AiEvent::Delta {
                text: "partial".into()
            },
            AiEvent::Done { stop_reason: None }
        ]
    );
}
