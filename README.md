# Markdown Reader

![Markdown Reader showing a rendered Markdown document](readme_assets/markdown-reader.png)

Markdown Reader is a secure, cross-platform desktop app for reading Markdown files. It is built with Tauri 2, Rust, Svelte 5, TypeScript, and Vite.

## Features

- Safe Markdown rendering with GitHub Flavored Markdown, alerts, heading links, and Shiki syntax highlighting.
- Inline and display math rendered locally with KaTeX (`$...$` and `$$` on separate lines).
- Mermaid diagrams rendered on demand with strict SVG sanitization and light/dark themes.
- Folder workspaces with a recursive, `.gitignore`-aware Markdown tree and live refresh.
- Multiple tabs, drag-and-drop, recent files, pinned files, and session/scroll restoration.
- Table of contents, word count, estimated reading time, and encoding information.
- Relative local images, optional blocking of remote images, and automatic file reload while preserving the reading position.
- Find in document, English and Spanish UI, keyboard shortcuts, native menus, and configurable theme and typography.
- Windows file association, single-instance handling, and command-line file opening.
- Signed automatic updates, with an optional periodic update check and a manual check in Help/About.

## Download

Installers are published as draft releases on the [GitHub Releases](https://github.com/abelrgr/markdown-reader/releases) page. The current development version is `2.0.0-beta.1`.

## Development

Requirements: Node.js 24 LTS with npm, Rust stable 1.85 or newer, and the [Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/) for your operating system.

```sh
npm ci
npm run tauri dev
npm test
npm run e2e
```

Other checks: `npm run check`, `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml`, and `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`.

### Release signing and updates

Updater artifacts are signed with the Tauri updater key. Generate and keep the private key on a trusted release machine (`npx tauri signer generate -w ~/.tauri/markdown-reader.key`); put only its public key in `src-tauri/tauri.conf.json` and store the private key and password as the `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` GitHub Actions secrets. Never commit the private key. Windows code signing and macOS notarization are optional and require paid certificates/accounts; configure `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`, `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID` as repository secrets when available.

## Project structure

- `src/` — Svelte UI, native API boundary, Markdown pipeline, state, and DOM utilities.
- `src-tauri/` — Rust backend and Tauri configuration.
- `tests/e2e/` — Playwright tests and Markdown fixtures.
- `docs/` — refactor specification, plans, and QA checklist.
- `examples/` — sample Markdown documents for testing reader features.
- `legacy/` — archived NeutralinoJS v1 application, retained for reference.

## License

MIT. See [LICENSE](LICENSE).
