# Markdown Reader

![Markdown Reader showing a rendered Markdown document](readme_assets/markdown-reader.png)

Markdown Reader is a secure, cross-platform desktop app for reading Markdown files. It is built with Tauri 2, Rust, Svelte 5, TypeScript, and Vite.

## Features

- Safe GitHub Flavored Markdown rendering, alerts, heading links, Shiki syntax highlighting, math, and Mermaid diagrams.
- Folder workspaces with a recursive, `.gitignore`-aware Markdown tree, live refresh, quick open, and full-text search across Markdown files.
- Multiple tabs, drag-and-drop, recent and pinned files, and session/scroll restoration.
- Table of contents, word count, estimated reading time, and encoding information.
- Relative local images, optional blocking of remote images, and automatic file reload while preserving the reading position.
- Find in document, English and Spanish UI, keyboard shortcuts, native menus, configurable themes and typography, and focus mode.
- Export the current document as standalone HTML or print it / save it as PDF through the operating system's print dialog.
- Optional AI assistant: summarize, explain a selection, translate, and ask questions about the current document.
- Windows file association, single-instance handling, signed automatic updates, and command-line file opening.

## AI and privacy

AI is off by default. When enabled, the app sends the selected document context and your prompt to the provider configured in Settings. The provider processes that content according to its own privacy policy. Remote providers require explicit per-host approval before document context is sent; you can revoke approved hosts in Settings. The app does not add telemetry.

For local processing, install [Ollama](https://ollama.com), download a model (for example, `ollama pull qwen2.5:3b`), start it with `ollama serve`, then enable AI in Settings and choose the Ollama preset and a model. The document remains on your computer when using a local provider.

For a remote provider, choose a preset or configure a compatible endpoint in Settings. Enter the API key in the protected key field; it is stored in the operating system keychain and is not shown again. Do not put API keys in Markdown files, screenshots, or issue reports.

## Download

Installers are published on the [GitHub Releases](https://github.com/abelrgr/markdown-reader/releases) page. The current version is `2.0.0`.

## Development

Requirements: Node.js 24 LTS with npm, Rust stable 1.85 or newer, and the [Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/) for your operating system.

```sh
npm ci
npm run tauri dev
npm run check
npm test
npm run e2e
```

Other checks: `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml`, and `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`.

### Release signing and updates

Updater artifacts are signed with the Tauri updater key. Generate and keep the private key on a trusted release machine (`npx tauri signer generate -w ~/.tauri/markdown-reader.key`); put only its public key in `src-tauri/tauri.conf.json` and store the private key and password as the `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` GitHub Actions secrets. Never commit the private key. Windows code signing and macOS notarization are optional and require paid certificates/accounts; configure the relevant GitHub Actions secrets when available.

## Project structure

- `src/` — Svelte UI, typed native API boundary, Markdown pipeline, AI prompts/session, state, and DOM utilities.
- `src-tauri/src/` — Rust backend, including `ai/`, `folders.rs`, and `search.rs`.
- `tests/e2e/` — Playwright tests and Markdown fixtures.
- `docs/` — refactor specification, plans, and QA checklist.
- `examples/` — sample Markdown documents for testing reader features.
- `legacy/` — archived NeutralinoJS v1 application, retained for reference.

## License

MIT. See [LICENSE](LICENSE).
