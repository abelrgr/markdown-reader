#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SseEvent {
    pub event: Option<String>,
    pub data: String,
}

#[derive(Default)]
pub struct SseParser {
    buffer: Vec<u8>,
    event: Option<String>,
    data: Vec<String>,
}

impl SseParser {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn push(&mut self, chunk: &[u8]) -> Vec<SseEvent> {
        self.buffer.extend_from_slice(chunk);
        self.process_lines(false)
    }

    pub fn finish(&mut self) -> Vec<SseEvent> {
        self.process_lines(true)
    }

    fn process_lines(&mut self, flush: bool) -> Vec<SseEvent> {
        let mut events = Vec::new();
        while let Some(newline) = self.buffer.iter().position(|byte| *byte == b'\n') {
            let mut line = self.buffer.drain(..=newline).collect::<Vec<_>>();
            line.pop();
            if line.last() == Some(&b'\r') {
                line.pop();
            }
            self.process_line(&line, &mut events);
        }
        if flush && !self.buffer.is_empty() {
            let line = std::mem::take(&mut self.buffer);
            self.process_line(&line, &mut events);
        }
        if flush {
            self.dispatch(&mut events);
        }
        events
    }

    fn process_line(&mut self, raw: &[u8], events: &mut Vec<SseEvent>) {
        if raw.is_empty() {
            self.dispatch(events);
            return;
        }
        if raw.starts_with(b":") {
            return;
        }
        let line = String::from_utf8_lossy(raw);
        let (field, value) = line.split_once(':').unwrap_or((&line, ""));
        let value = value.strip_prefix(' ').unwrap_or(value);
        match field {
            "event" => self.event = Some(value.to_string()),
            "data" => self.data.push(value.to_string()),
            _ => {}
        }
    }

    fn dispatch(&mut self, events: &mut Vec<SseEvent>) {
        if !self.data.is_empty() {
            events.push(SseEvent {
                event: self.event.take(),
                data: self.data.join("\n"),
            });
        } else {
            self.event = None;
        }
        self.data.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::{SseEvent, SseParser};

    #[test]
    fn buffers_partial_events_and_joins_data_lines() {
        let mut parser = SseParser::new();
        assert!(parser
            .push(b"event: content_block_delta\ndata: {\"a\"")
            .is_empty());
        assert_eq!(
            parser.push(b":1}\n\ndata: second\ndata: line\n\n"),
            vec![
                SseEvent {
                    event: Some("content_block_delta".into()),
                    data: "{\"a\":1}".into()
                },
                SseEvent {
                    event: None,
                    data: "second\nline".into()
                }
            ]
        );
    }

    #[test]
    fn accepts_crlf_and_ignores_comment_lines() {
        let mut parser = SseParser::new();
        assert_eq!(
            parser.push(b": keepalive\r\ndata: ok\r\n\r\n"),
            vec![SseEvent {
                event: None,
                data: "ok".into()
            }]
        );
    }
}
