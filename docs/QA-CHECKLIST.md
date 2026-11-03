# Manual QA checklist

Run these checks on each supported desktop OS before publishing a release. Use the five documents under `examples/Mis Notas - Café y Ciencia/` for Markdown, links, code, metadata, and relative-image checks.

## Windows

- [x] Install the Windows MSI and launch Markdown Reader. (User-confirmed, 2026-11-02.)
- [ ] Double-click a `.md` file to open the app; double-click a second file with the app already running and confirm it opens in a new tab.
- [x] Drag and drop two Markdown documents; both open as tabs. (User-confirmed, 2026-11-02.)
- [x] Open a document and its relative image from a folder and filename containing spaces and accents in the dev app. (User-confirmed, 2026-11-02; packaged build still needs rechecking.)
- [ ] Open a UTF-16 LE Markdown file saved by Notepad and check that accents display correctly without a BOM.
- [ ] Switch to the dark theme and verify the rendered document remains readable.
- [x] Save an open document from an external editor and confirm the app refreshes it. (User-confirmed; the refresh looked like a close/reopen. E2E additionally verifies that the tab and scroll position are preserved.)
- [x] Scroll the document: only the document scrolls and the tab header stays visible. (User-confirmed on the rebuilt local app, 2026-11-02.)
- [x] Load the local relative image in `05-links-images-security.md`. (User-confirmed on the rebuilt local app, 2026-11-02.)
- [ ] Check the shortcuts for opening, closing, reloading, searching, zooming, and switching tabs.
- [ ] Close and reopen the app; verify tabs, active document, scroll position, and window size are restored.
- [ ] Open a workspace with at least 10,000 files; confirm folder listing, quick open, and navigation stay responsive.
- [ ] Search for text across a large folder; confirm results, previews, and opening a result at the matching location.
- [ ] Export to PDF using the system print dialog and export standalone HTML; verify images and page layout.
- [ ] With AI enabled, summarize a README and ask a question not answered by it; confirm it acknowledges missing information. Prefer local Ollama for the release QA run.
- [ ] On a `2.0.0-beta.1` installation, check for updates and verify the signed `2.0.0` update can be downloaded and installed.

### Windows findings (2026-11-02)

- The first MSI build showed an outer window scrollbar in addition to the document scrollbar. The layout fix was verified manually in the rebuilt local app (2026-11-02).
- Windows Security blocked the unsigned NSIS uninstaller (`Un.exe`) because its publisher could not be verified. Do not bypass this protection; distributing NSIS requires signing the installer and uninstaller with a trusted code-signing certificate.
- In `05-links-images-security.md`, the raw HTML image near “Raw HTML test follows” intentionally points to `missing-image` and should appear broken. The separate Markdown image under “Local and remote images” is the actual local-image check.
- The first packaged build's local image behavior was rechecked and confirmed fixed in the rebuilt local app (2026-11-02).

## macOS

- [ ] Install and launch the package.
- [ ] Verify `.md` file association, opening another file in the existing instance, and drag and drop.
- [ ] Verify relative images in paths with spaces and accents.
- [ ] Verify dark theme, shortcuts, external-editor reload, and restored tabs/window state.
- [ ] Open a workspace with 10,000+ files and run folder search.
- [ ] Export a document to PDF via the system print dialog.
- [ ] Verify AI with local Ollama: summarize a README and ask about information absent from it.

## Linux

- [ ] Install and launch the package on a supported desktop environment.
- [ ] Verify `.md` file association, opening another file in the existing instance, and drag and drop.
- [ ] Verify relative images in paths with spaces and accents.
- [ ] Verify dark theme, shortcuts, external-editor reload, and restored tabs/window state.
- [ ] Open a workspace with 10,000+ files and run folder search.
- [ ] Export a document to PDF via the system print dialog.
- [ ] Verify AI with local Ollama: summarize a README and ask about information absent from it.

## Upgrade QA

- [ ] Upgrade from `2.0.0-beta.1` to `2.0.0` using the signed automatic updater and verify open documents/settings remain usable.

## Automated verification

Run `npm run check`, `npm test`, `npm run e2e`, `cargo test --manifest-path src-tauri/Cargo.toml`, and `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` before packaging.
