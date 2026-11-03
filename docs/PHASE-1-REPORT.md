# Phase 1 verification report

## Automated verification

The release verification passed in GitHub Actions run [41700246911](https://github.com/abelrgr/markdown-reader/actions/runs/41700246911) at commit `8255df6`. The run covered frontend checks, unit tests, production build, E2E tests, Rust formatting/lint/tests on Windows, macOS, and Linux, and signed Windows installer/updater packaging. At the `2.0.0` release version, local `npm run check` and `npm run build` also passed.

## Windows manual QA confirmed by the user (2026-11-02)

- Installed and launched the Windows MSI.
- Dragged and dropped two Markdown documents; both opened as tabs.
- Opened a Markdown file and relative image from a path containing spaces and accents in the development app.
- Confirmed an external-editor save refreshes the open document; the refresh appeared as a close/reopen. E2E separately verifies tab and scroll-position preservation.
- Confirmed the tab header stays visible while scrolling the document.
- Confirmed the local Markdown image in `05-links-images-security.md` loads.

## Outstanding release QA

The remaining manual checks are listed unchecked in [`QA-CHECKLIST.md`](QA-CHECKLIST.md), including Windows file association, UTF-16 LE without BOM, dark-theme readability, shortcuts, session/window restoration, large-workspace/search behavior, HTML/PDF export, real-provider/local-Ollama AI checks, and upgrade from `2.0.0-beta.1`. macOS and Linux package/device checks also remain outstanding. Do not mark the manual QA gate complete until these checks are actually performed and recorded.
