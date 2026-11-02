# Markdown Reader

Markdown Reader is a secure, cross-platform Markdown reader built with Tauri 2, Svelte 5 and TypeScript.

## Canonical commands

- `npm run check` — Svelte and TypeScript diagnostics
- `npm test` — Vitest unit tests
- `npm run e2e` — Playwright end-to-end tests
- `cargo test --manifest-path src-tauri/Cargo.toml` — Rust tests
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` — Rust linting

## Structure

- `src/lib/native/` — typed boundary to native APIs
- `src/lib/markdown/` — safe Markdown rendering pipeline
- `src/lib/state/` — tabs, settings, recents and session
- `src/components/` — Svelte UI components
- `src-tauri/` — Rust backend and Tauri configuration
- `tests/e2e/` — Playwright tests and fixtures
- `docs/superpowers/plans/` — implementation plans

## Rules

- Every native call goes through `src/lib/native`.
- All UI text goes through `t()`.
- The only `{@html}` is the one in `Viewer.svelte`.
- Do not touch `legacy/`.
