pub mod anthropic;
pub mod openai;
pub mod sse;

use crate::{error::AppError, secrets};
use futures_util::StreamExt;
use reqwest::{header, Client, StatusCode};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::time::Duration;
use tauri::{ipc::Channel, State};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AiProvider {
    OpenaiCompatible,
    Anthropic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConfig {
    pub provider: AiProvider,
    pub base_url: String,
    pub model: String,
    pub secret_account: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    User,
    Assistant,
}

impl Role {
    fn as_str(&self) -> &'static str {
        match self {
            Self::User => "user",
            Self::Assistant => "assistant",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub role: Role,
    pub content: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AiEvent {
    Delta { text: String },
    Done { stop_reason: Option<String> },
    Error { message: String },
}

#[derive(Default)]
pub struct AiRequests(pub Mutex<HashMap<String, Arc<AtomicBool>>>);

fn client() -> Result<Client, AppError> {
    Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .build()
        .map_err(|error| AppError::Io(error.to_string()))
}

fn endpoint(config: &AiConfig, suffix: &str) -> String {
    match config.provider {
        AiProvider::OpenaiCompatible => openai::endpoint(&config.base_url, suffix),
        AiProvider::Anthropic => anthropic::endpoint(&config.base_url, suffix),
    }
}

async fn read_secret(config: &AiConfig) -> Option<String> {
    config
        .secret_account
        .as_deref()
        .and_then(|account| secrets::secret_get(account).ok().flatten())
}

fn configure_anthropic_headers(
    builder: reqwest::RequestBuilder,
    key: Option<&str>,
    model: &str,
) -> reqwest::RequestBuilder {
    let mut builder = builder.header("anthropic-version", "2023-06-01");
    if let Some(secret) = key {
        builder = builder.header("x-api-key", secret);
    }
    if anthropic::uses_server_fallback(model) {
        builder.header("anthropic-beta", "server-side-fallback-2026-07-01")
    } else {
        builder
    }
}

pub async fn run_chat(
    client: &Client,
    config: &AiConfig,
    key: Option<&str>,
    system: &str,
    messages: &[ChatMessage],
    cancel: Arc<AtomicBool>,
    mut emit: impl FnMut(AiEvent),
) {
    let is_anthropic = matches!(config.provider, AiProvider::Anthropic);
    let url = endpoint(
        config,
        if is_anthropic {
            "/v1/messages"
        } else {
            "/chat/completions"
        },
    );
    let body = if is_anthropic {
        anthropic::request_body(&config.model, system, messages)
    } else {
        openai::request_body(&config.model, system, messages)
    };

    let request = client
        .post(&url)
        .header(header::ACCEPT, "text/event-stream")
        .json(&body);
    let request = if is_anthropic {
        configure_anthropic_headers(request, key, &config.model)
    } else {
        if let Some(secret) = key {
            request.bearer_auth(secret)
        } else {
            request
        }
    };

    let response = match request.send().await {
        Ok(response) => response,
        Err(error) => {
            emit(AiEvent::Error {
                message: format!("Request to {url} failed: {error}"),
            });
            return;
        }
    };
    if !response.status().is_success() {
        emit(AiEvent::Error {
            message: response_error(response).await,
        });
        return;
    }

    let mut stream = response.bytes_stream();
    let mut parser = sse::SseParser::new();
    while let Some(chunk) = stream.next().await {
        if cancel.load(Ordering::Acquire) {
            emit(AiEvent::Done {
                stop_reason: Some("cancelled".into()),
            });
            return;
        }
        let chunk = match chunk {
            Ok(chunk) => chunk,
            Err(error) => {
                emit(AiEvent::Error {
                    message: format!("Streaming from {url} failed: {error}"),
                });
                return;
            }
        };
        for event in parser.push(&chunk) {
            if cancel.load(Ordering::Acquire) {
                emit(AiEvent::Done {
                    stop_reason: Some("cancelled".into()),
                });
                return;
            }
            if let Some(done) = process_event(is_anthropic, &event, &mut emit) {
                emit(AiEvent::Done { stop_reason: done });
                return;
            }
        }
    }
    for event in parser.finish() {
        if let Some(done) = process_event(is_anthropic, &event, &mut emit) {
            emit(AiEvent::Done { stop_reason: done });
            return;
        }
    }
    if cancel.load(Ordering::Acquire) {
        emit(AiEvent::Done {
            stop_reason: Some("cancelled".into()),
        });
    } else {
        emit(AiEvent::Done { stop_reason: None });
    }
}

fn process_event(
    is_anthropic: bool,
    event: &sse::SseEvent,
    emit: &mut impl FnMut(AiEvent),
) -> Option<Option<String>> {
    if is_anthropic {
        match anthropic::parse(event) {
            anthropic::Piece::Text(text) => {
                emit(AiEvent::Delta { text });
                None
            }
            anthropic::Piece::Stop(reason) => Some(reason),
            anthropic::Piece::Error(message) => {
                emit(AiEvent::Error { message });
                Some(None)
            }
            anthropic::Piece::Ignore => None,
        }
    } else {
        match openai::parse(event) {
            openai::Piece::Text(text) => {
                emit(AiEvent::Delta { text });
                None
            }
            openai::Piece::Stop(reason) => Some(reason),
            openai::Piece::Error(message) => {
                emit(AiEvent::Error { message });
                Some(None)
            }
            openai::Piece::Ignore => None,
        }
    }
}

async fn response_error(response: reqwest::Response) -> String {
    let status: StatusCode = response.status();
    let body = response.text().await.unwrap_or_default();
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(&body) {
        if let Some(message) = value
            .pointer("/error/message")
            .and_then(serde_json::Value::as_str)
        {
            return message.to_string();
        }
    }
    let excerpt: String = body.chars().take(300).collect();
    if excerpt.is_empty() {
        format!("AI request failed with HTTP {status}")
    } else {
        format!("AI request failed with HTTP {status}: {excerpt}")
    }
}

#[tauri::command]
pub async fn ai_list_models(config: AiConfig) -> Result<Vec<String>, AppError> {
    let is_anthropic = matches!(config.provider, AiProvider::Anthropic);
    let url = endpoint(
        &config,
        if is_anthropic {
            "/v1/models"
        } else {
            "/models"
        },
    );
    let client = client()?;
    let mut request = client.get(&url);
    if is_anthropic {
        request = configure_anthropic_headers(
            request,
            read_secret(&config).await.as_deref(),
            &config.model,
        );
    } else if let Some(key) = read_secret(&config).await {
        request = request.bearer_auth(key);
    }
    let response = request
        .send()
        .await
        .map_err(|error| AppError::Io(format!("Request to {url} failed: {error}")))?;
    if !response.status().is_success() {
        return Err(AppError::Io(response_error(response).await));
    }
    let value: serde_json::Value = response
        .json()
        .await
        .map_err(|error| AppError::Io(error.to_string()))?;
    let mut models = value
        .get("data")
        .and_then(serde_json::Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|model| {
            model
                .get("id")
                .and_then(serde_json::Value::as_str)
                .map(str::to_string)
        })
        .collect::<Vec<_>>();
    models.sort_unstable();
    Ok(models)
}

#[tauri::command]
pub async fn ai_chat(
    state: State<'_, AiRequests>,
    request_id: String,
    config: AiConfig,
    system: String,
    messages: Vec<ChatMessage>,
    on_event: Channel<AiEvent>,
) -> Result<(), AppError> {
    let cancel = Arc::new(AtomicBool::new(false));
    {
        let mut requests = state
            .0
            .lock()
            .map_err(|_| AppError::Io("AI request registry is unavailable".into()))?;
        if let Some(previous) = requests.insert(request_id.clone(), Arc::clone(&cancel)) {
            previous.store(true, Ordering::Release);
        }
    }
    let key = read_secret(&config).await;
    match client() {
        Ok(client) => {
            run_chat(
                &client,
                &config,
                key.as_deref(),
                &system,
                &messages,
                Arc::clone(&cancel),
                |event| {
                    let _ = on_event.send(event);
                },
            )
            .await
        }
        Err(error) => {
            let _ = on_event.send(AiEvent::Error {
                message: error.to_string(),
            });
        }
    }
    let mut requests = state
        .0
        .lock()
        .map_err(|_| AppError::Io("AI request registry is unavailable".into()))?;
    if requests
        .get(&request_id)
        .is_some_and(|registered| Arc::ptr_eq(registered, &cancel))
    {
        requests.remove(&request_id);
    }
    Ok(())
}

#[tauri::command]
pub fn ai_cancel(state: State<'_, AiRequests>, request_id: String) {
    if let Ok(requests) = state.0.lock() {
        if let Some(cancel) = requests.get(&request_id) {
            cancel.store(true, Ordering::Release);
        }
    }
}

#[cfg(test)]
mod tests;
