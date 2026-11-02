# Markdown Reader — Refactor plan (rewrite from scratch)

> Date: November 2026 · Status: proposal
> Goal: rebuild the app with current, cross-platform technology. Keep what works, fix what is broken and add new features, including optional AI.

---

## 1. Summary

| | Today | Proposal |
|---|---|---|
| Runtime | NeutralinoJS 5.4.0 (current release is 6.8) | **Tauri 2** (Rust + the OS WebView) |
| Frontend | HTML + global JS + Tailwind never compiled | **TypeScript + Svelte 5 + Vite + Tailwind 4** |
| Markdown | `marked` v13 copied by hand, no sanitizing | **unified (remark/rehype)** + sanitizing + Shiki + KaTeX + Mermaid |
| Platforms | Windows / macOS / Linux (never verified) | Windows, macOS, Linux; **Android/iOS** in phase 3 |
| AI | — | Optional and private: **local (Ollama / llama.cpp)** or **cloud (Claude / OpenAI)** |
| Quality | No tests, no CI | Vitest + Playwright, GitHub Actions CI, signed releases, auto-update |
| Repository | Old Git history on GitHub | **History restarted**: v1 archived in `legacy/`, old history kept in a local backup bundle |

---

## 2. Inventory of the current app

Code reviewed: `resources/index.html`, `resources/js/main.js`, `resources/styles.scss`, `neutralino.config.json`, `tailwind.config.js`.

### 2.1 Current features

| # | Feature | How it works today |
|---|---|---|
| F1 | Open file | *File → Open* menu, native dialog filtered by `md, mkd, mdwn, mdown, mdtxt, mdtext, markdown, text` |
| F2 | Drag and drop | A file dropped on the central area is read with `FileReader` and rendered |
| F3 | Markdown rendering | `marked.parse()` → `innerHTML` |
| F4 | Recent files | Last 5 in `Neutralino.storage`, listed in the *File* menu |
| F5 | External links | Clicking an `<a>` in the document opens it in the system browser |
| F6 | Tray menu | "Get version" and "Quit" (disabled on macOS because of a Neutralino bug) |
| F7 | Footer | Shows CPU model and OS (with an artificial 2 s delay) |
| F8 | *About* window | Version, author, hard-coded "Last updated" date (10/01/2024) |
| F9 | Exit | *File → Exit* and window close |
| F10 | Window state | Neutralino saves size/position (`.tmp/window_state.config.json`) |

### 2.2 What the README promises but does **not** exist

- Table of contents / heading navigation.
- Syntax highlighting in code blocks.
- Appearance customization.
- Pending TODOs: recent files on drop, search, dark mode, images/media.

### 2.3 Problems found

**Security**
1. **XSS**: `marked` output goes straight into `innerHTML` without sanitizing. A `.md` with `<img src=x onerror=...>` runs code with access to the native API (`os.*` and `filesystem.readFile` are allowed).
2. `enableInspector: true` and the whole `os.*` namespace enabled in production.

**Bugs**
3. `resources/styles.css` is **empty** in the repo: the Tailwind build step is undocumented and there is no `package.json`, even though the README says `npm install`.
4. Dropped files are **not** added to recent files (the path is logged to the console and discarded).
5. The recent files list is built only at startup: opening a file does not update it until restart.
6. If a recent file no longer exists, `readFile` throws an unhandled exception.
7. Clicks in the document always call `preventDefault()`: internal links (`#section`) do not work, and a link with nested content (`<a><code>…</code></a>`) does not open because the code checks `target.tagName === "A"`.
8. Images with paths relative to the `.md` do not load (the server root is `/resources/`).
9. Extension validation is case-sensitive (`README.MD` is rejected) and accepts `.text` but not `.txt`.
10. When several files are dropped, each overwrites the previous one; only the last one is shown.

**Technical debt**
11. Global variables (`var`), no modules or types; library copied by hand instead of a dependency.
12. Template leftovers: `applicationId: "js.neutralino.sample"`, `globalVariables TEST1/2/3`, unused `cloud`/`chrome` modes.
13. Version and *About* date written by hand.
14. `.tmp/` committed to git.
15. No accessibility: menus built with `<a href="#">`, no keyboard navigation or shortcuts.

---

## 3. Features of the new version

Legend: ✅ kept · 🔧 improved · ➕ new · ❌ removed

### 3.1 What is kept, improved or removed

| Current | Decision | Detail |
|---|---|---|
| F1 Open file | 🔧 | Native dialog, multiple selection, case-insensitive extensions, `.txt` included |
| F2 Drag and drop | 🔧 | Real file path (for recents, relative images and reload), several files → several tabs, folders too |
| F3 Rendering | 🔧 | New safe and complete pipeline (see 3.2) |
| F4 Recent files | 🔧 | 20 entries, pin favorites, remove missing ones, recent folders too |
| F5 External links | 🔧 | External → browser; `#anchors` → internal scroll; `other.md` → open in a tab |
| F6 Tray | ❌ | Adds nothing to a reader. Replaced by real OS integration (see 3.3) |
| F7 CPU/OS in the footer | ❌ | Replaced by a useful status bar: words, reading time, encoding, path |
| F8 About | 🔧 | Version and date read from the build; repo link, third-party licenses, check for updates |
| F9 Exit | ✅ | With `Ctrl/Cmd+Q` |
| F10 Window state | 🔧 | Also restore the session: open tabs, scroll position, theme |

### 3.2 Reading and rendering

**MVP**
- ➕ Full GitHub Flavored Markdown: tables, task lists, strikethrough, autolinks, footnotes.
- ➕ GitHub-style alerts (`> [!NOTE]`, `> [!WARNING]`…).
- ➕ Syntax highlighting with **Shiki** (same themes as VS Code) and a "copy" button on each block.
- ➕ Side **table of contents** generated from the headings, highlighting the visible section.
- ➕ Heading anchors (copy a link to a section).
- ➕ Images relative to the file, local and remote (remote images can be blocked for privacy).
- ➕ YAML front-matter shown as a metadata card (title, date, tags).
- ➕ **Automatic reload** when the file changes on disk (keeping the scroll position).
- ➕ Find in document (`Ctrl/Cmd+F`) with highlighting and navigation between matches.
- ➕ Strict HTML sanitizing (no scripts or inline event handlers).

**v1.1**
- ➕ Math with **KaTeX** (`$…$`, `$$…$$`).
- ➕ **Mermaid** diagrams (lazy-loaded, only when the document has them).
- ➕ `:shortcode:` emoji and definition lists.
- ➕ Image viewer (lightbox) and document zoom (`Ctrl +/-`).
- ➕ Large documents: rendering in a Web Worker so the UI never blocks.

### 3.3 Organization and navigation

**MVP**
- ➕ **Tabs** (open several documents, reorder, close with `Ctrl+W`).
- ➕ OS integration: `.md` file association ("Open with…"), single instance (opening a second file adds it as a tab), command line `markdown-reader file.md`.

**v1.1**
- ➕ **Folder / workspace mode**: tree of the `.md` files in a folder.
- ➕ **Quick open** (`Ctrl/Cmd+P`) with fuzzy name search.
- ➕ Command palette (`Ctrl/Cmd+Shift+P`).
- ➕ Full-text search across the whole folder (engine in Rust).
- ➕ Back/forward history between documents (`Alt+←/→`).
- ➕ Bookmarks inside documents.

**v2**
- ➕ Wiki links `[[note]]` and a **backlinks** panel (which documents link to the current one).

### 3.4 Appearance and customization

**MVP**
- ➕ Light / dark / system theme.
- ➕ Configurable typography: font, size, line height, maximum reading width.
- ➕ Settings screen (instead of editing files).
- ➕ Interface language: English (default) and Spanish (used when the OS language is Spanish), with i18n from day one.

**v1.1**
- ➕ Reading themes (GitHub, Sepia, High contrast) and user custom CSS.
- ➕ Focus / distraction-free full-screen mode.

### 3.5 Export and sharing

**v1.1**
- ➕ Export to **PDF** (via WebView printing) and to self-contained **HTML**.
- ➕ Print with print styles.
- ➕ Copy as HTML / rich text (to paste into email or documents).

**v2**
- ➕ Presentation mode: slides separated by `---`.

### 3.6 Editing (optional, v2)

The app is a reader; editing is a natural extension but not essential.
- ➕ Edit mode with **CodeMirror 6** and editor/preview split view with synced scrolling.
- ➕ Auto-save, undo, quick formatting (bold, links, tables).
- ➕ Pasting images → saved next to the `.md`.

### 3.7 Accessibility and quality

- ➕ Full keyboard navigation and documented shortcuts (`F1` shows the list).
- ➕ Correct ARIA roles on menus, tabs and dialogs; AA contrast.
- ➕ Signed auto-updates.
- ➕ Local error log (no telemetry by default).

---

## 4. AI features

Principles:
- **Optional and off by default.** The app works the same without AI.
- **Privacy first:** it can run 100% locally; nothing leaves the computer unless the user turns it on.
- **Pluggable provider:** one "OpenAI-compatible" interface covers Ollama, llama.cpp (`llama-server`), LM Studio, OpenAI and others; Claude is integrated through the Anthropic API. API keys live in the OS keychain, never in plain text.

### 4.1 Proposed features

| Priority | Feature | Description |
|---|---|---|
| v1.1 | **Summarize document** | TL;DR, key points and a summary per section |
| v1.1 | **Explain selection** | Select text or a code block → "what does this do?" |
| v1.1 | **Translate** | View the document translated, keeping the Markdown format |
| v1.1 | **Ask the document** | Side chat that answers only from the document's content, citing the section |
| v2 | **Ask the folder (RAG)** | Indexes the folder with embeddings and answers citing the source files |
| v2 | **Semantic search** | Search by meaning ("how is login configured") as well as by text |
| v2 | **Related notes** | Suggest documents similar to the current one |
| v2 | **Generate diagrams** | Describe a flow → the AI writes the Mermaid block |
| v2 | **Alt text** | Suggest descriptions for images without `alt` (accessibility) |
| v2 (with editing) | **Writing assistant** | Fix spelling and style, rewrite, continue text, build tables |
| v2 | **Read aloud** | Text-to-speech with the system voices (no external AI) |
| v2 | **MCP server** | Expose the document library to external assistants (Claude Desktop, IDEs) through the Model Context Protocol, so they can search and read your notes |

### 4.2 How to implement it

- **Recommended local AI: Ollama or `llama-server` (llama.cpp)** as a separate process. The app detects whether Ollama is installed; the user picks the model.
- **AI inside the WebView (WebLLM / Transformers.js with WebGPU):** useful for small tasks such as embeddings, but WebGPU support inside Tauri's WebViews (WebView2, WKWebView, WebKitGTK) is uneven. Use it only as a complement, with capability detection.
- **Cloud:** Claude or OpenAI with the user's own key, for those who prefer quality over privacy.
- **RAG index:** SQLite inside the app data folder; the Markdown syntax tree allows chunking by section.
- **Streaming responses** with a cancel button; always show which section or file each answer comes from.

---

## 5. Technology choice

### 5.1 Requirements

1. Windows, macOS and Linux; mobile desirable.
2. Small installer and low memory use (it is a reader; it must open fast).
3. Native access: file system, change watching, file association, dialogs, keychain.
4. Reuse the web ecosystem for Markdown (remark, Shiki, KaTeX, Mermaid).
5. Security: fine-grained permissions, untrusted content isolated.
6. Maintained project with a community.

### 5.2 Comparison

| Framework | Languages | Desktop | Mobile | App size | Web Markdown ecosystem | Maturity | Verdict |
|---|---|---|---|---|---|---|---|
| **Tauri 2** | Rust + TS/JS | ✅ Win/Mac/Linux | ✅ Android/iOS (since 2.0, Oct 2024) | A few MB | ✅ full | Stable, v2.11 (2026), official plugins | **Recommended** |
| Electron | JS/TS (Node) | ✅ | ❌ | ~100–270 MB | ✅ full | Very mature | Works, but heavy for a reader |
| Electrobun | TS (Bun) | ✅ | ❌ | Small | ✅ | Stable v1, small community | Promising, still young |
| Wails v3 | Go + TS/JS | ✅ | ❌ (not confirmed) | Small | ✅ | v3 close to stable | Good if you prefer Go |
| NeutralinoJS 6 | JS | ✅ | ❌ | Very small | ✅ | Limited native API, no fine-grained security | What you have today; falls short |
| Flutter | Dart | ✅ | ✅ | Medium | ⚠️ rendering, code, math and diagrams must be reimplemented | Very mature | Best on mobile, but loses the web Markdown ecosystem |

Some figures (installer sizes, Wails v3 status) come from blogs rather than official documentation.

### 5.3 Recommendation: Tauri 2

- **One codebase for desktop and mobile**, using web technology you already know.
- **Lightweight**: uses the OS WebView instead of bundling Chromium.
- **Permission-based security** (*capabilities*): each window can only access what it declares — ideal for showing untrusted Markdown.
- **Official plugins** for what we need: `fs` (with change watching), `dialog`, `store`, `opener`, `single-instance`, `updater`, `window-state`, `log`.
- **Rust** for the heavy work: folder search, indexing, file watching, AI requests.

Risk: WebViews differ between systems (WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux). Mitigation: test on all three in CI and avoid very new web APIs without feature detection.

Alternative if you do not want to touch Rust: **Electron** (or Electrobun if a younger project is acceptable). If mobile ever became the absolute priority: **Flutter**.

### 5.4 Proposed stack

| Layer | Choice | Why |
|---|---|---|
| Native shell | Tauri 2 | See above |
| Frontend | **Svelte 5 + TypeScript + Vite** | Small, fast bundle, little boilerplate |
| Styles | Tailwind CSS 4 + `@tailwindcss/typography` | Already used; `prose` gives ready-made reading typography |
| Markdown | `unified`: `remark-parse`, `remark-gfm`, `remark-frontmatter`, `remark-math`, `remark-rehype`, `rehype-sanitize`, `rehype-slug`, `rehype-autolink-headings` | Reusable syntax tree for TOC, search and AI; plugins for everything |
| Code | Shiki | VS Code-quality highlighting, light/dark |
| Math | KaTeX | Fast, no network dependencies |
| Diagrams | Mermaid (lazy-loaded) | De facto standard in Markdown |
| Editor (v2) | CodeMirror 6 | Light, extensible, Markdown support |
| Rust backend | `ignore` (folder walking), `encoding_rs`, `reqwest` (AI streaming), `keyring` (API keys), `rusqlite` (AI index) | Standard, maintained crates |
| Tests | Vitest (unit), Playwright (UI, Chromium + WebKit), `cargo test` | |
| CI/CD | GitHub Actions + `tauri-action` | Win/Mac/Linux builds, signing and update publishing |

---

## 6. Architecture

```
markdown-reader/
├─ legacy/                 # v1 NeutralinoJS app, archived
├─ src/                    # Frontend (Svelte + TS)
│  ├─ lib/native/          # The single typed boundary to native code (real Tauri + in-memory fake for E2E)
│  ├─ lib/markdown/        # Render pipeline: text → safe HTML + TOC (no Tauri dependencies, testable)
│  ├─ lib/ai/              # AI prompts, context selection and session state
│  ├─ lib/state/           # State: tabs, settings, recents, session
│  ├─ components/          # Viewer, Sidebar (TOC/tree), Tabs, CommandPalette, Settings, AiPanel
│  └─ app.css
├─ src-tauri/              # Rust backend
│  ├─ src/                 # documents, folders, search, ai, secrets, index, mcp
│  ├─ capabilities/        # Per-window permissions
│  └─ tauri.conf.json
├─ tests/e2e/              # Playwright
└─ .github/workflows/      # build and release
```

Key decisions:
- **Rendering is an async pure function** `renderMarkdown(markdown) → { html, toc, frontmatter, stats }`. It can be tested without the app and reused in a web version.
- **The document is shown sanitized** under a strict Content-Security-Policy; the user's HTML never has access to the Tauri API.
- **Files are always read by path from Rust**, so recents, reload and relative images work (through Tauri's asset protocol, limited to the document's folder).
- **Settings and recents** live in `tauri-plugin-store` (JSON in the user data folder, not in the repo).
- **AI requests run in Rust**, so API keys never reach the WebView.

---

## 7. Roadmap

| Phase | Content | Result |
|---|---|---|
| **0. Setup** | Back up the old history to a local bundle, archive the Neutralino code in `legacy/` and **restart the Git history on GitHub** (with the owner's approval). Create the Tauri 2 + Svelte + TS project, CI building on the 3 systems, new README | Empty window building in CI, fresh repository |
| **1. MVP reader** | Open/drag files, safe rendering with GFM + Shiki, TOC, tabs, recents, auto-reload, find in document, light/dark theme, typography settings, zoom, English/Spanish UI, file association, single instance | Fully replaces the current version |
| **2. v1.1** | Folder mode, quick open, command palette, folder search, KaTeX, Mermaid, PDF/HTML export, reading themes, history and bookmarks, auto-update. **Basic AI**: summarize, explain, translate, ask the document | First public release |
| **3. v2** | Edit mode, wiki links and backlinks, RAG over a folder, semantic search, writing assistant, read aloud, presentation mode, MCP server, mobile (Android/iOS), accessibility pass | Complete product |

Detailed implementation plans (to run with an AI agent, task by task):
- [Phase 0 + 1 — foundation and MVP](superpowers/plans/2026-11-02-phase-0-1-foundation-and-mvp.md)
- [Phase 2 — v1.1](superpowers/plans/2026-11-02-phase-2-v1-1.md)
- [Phase 3 — v2](superpowers/plans/2026-11-02-phase-3-v2.md)
- [Implementation prompt](IMPLEMENTATION-PROMPT.md)

Deliberate omissions: Markdown abbreviations (`*[HTML]: …`) are dropped because no maintained plugin exists; "Open with…" from other apps on Android/iOS is not included.

"Done" criteria for each phase: green tests in CI on the 3 systems, an installer generated and manually tested at least on Windows.

---

## 8. Sources

- [Tauri 2.0 Stable Release](https://v2.tauri.app/blog/tauri-20/) and [Tauri 2.0 Release Candidate](https://v2.tauri.app/blog/tauri-2-0-0-release-candidate/) — mobile support and its maturity
- [Tauri — release history](https://tauri.app/release/tauri/all-versions/) — v2.11.x (2026)
- [Tauri (Wikipedia)](https://en.wikipedia.org/wiki/Tauri_(software_framework))
- [Web to desktop framework comparison](https://github.com/Elanis/web-to-desktop-framework-comparison) — compared sizes and performance
- [Cross-platform desktop apps 2026: Tauri 2, Electron, Wails, Neutralino, Flutter](https://www.youngju.dev/blog/culture/2026-05-16-cross-platform-desktop-apps-2026-tauri-2-electron-wails-neutralinojs-flutter-desktop-sciter-deep-dive)
- [Cross-platform dev tools comparison 2026](https://codenote.net/en/posts/cross-platform-dev-tools-comparison-2026/)
- [Neutralinojs v6.8.0](https://sourceforge.net/projects/neutralinojs/files/v6.8.0/)
- [Electrobun v1](https://blackboard.sh/blog/electrobun-v1/) and [2.x changelog](https://framework.blackboard.sh/electrobun/guides/changelog/v2-x/)
- [Building Local LM Desktop Applications with Tauri](https://medium.com/@dillon.desilva/building-local-lm-desktop-applications-with-tauri-f54c628b13d9) — llama.cpp as a sidecar
- [What is Ollama (2026)](https://futureagi.com/blog/what-is-ollama-2026) and [Local LLM guide 2026](https://fungies.io/how-to-run-local-llms-guide-2026/)
- [WebLLM (paper)](https://arxiv.org/abs/2412.15803v1), [MLC blog](https://blog.mlc.ai/2024/06/13/webllm-a-high-performance-in-browser-llm-inference-engine) and [LLMs in the browser with WebGPU](https://pinggy.io/blog/run_llm_in_browser_webgpu/)
- [Awesome Markdown Editors](https://github.com/mundimark/awesome-markdown-editors) — editor references (Milkdown, Tiptap, CodeMirror)
