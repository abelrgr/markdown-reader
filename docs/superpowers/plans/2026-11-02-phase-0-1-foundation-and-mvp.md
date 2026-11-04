# Markdown Reader v2 — Phase 0 + Phase 1 (foundation and MVP) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite Markdown Reader from scratch with Tauri 2 + Svelte 5 + TypeScript in the same folder, moving the NeutralinoJS version to `legacy/`, until there is an MVP that fully replaces the current version.

**Architecture:** A single Tauri project: Svelte 5 (runes) frontend served by Vite in `src/`, Rust backend in `src-tauri/`. Every native call goes through a single typed boundary (`src/lib/native/`), with a real implementation (Tauri) and a fake one (browser E2E tests). Markdown rendering is a pure, async function (`renderMarkdown`) that returns already-sanitized HTML + a table of contents.

**Tech Stack:** Tauri 2.11+, Rust stable ≥ 1.85, Node 24 LTS + npm, Vite, Svelte 5, TypeScript strict, Tailwind CSS 4 + `@tailwindcss/typography`, unified (remark/rehype), Shiki, Vitest + jsdom, Playwright.

**Spec:** `docs/REFACTOR-PLAN.md` (read it before starting). Next plans: `2026-11-02-phase-2-v1-1.md`, `2026-11-02-phase-3-v2.md`.

**How to use this plan:** run the tasks in order. Each task ends with green tests and a commit. Work directly on `master` of the fresh repository created in Task 1 (no feature branch). Never push without the owner's explicit approval. Do not move on if any verification command fails. If a tool (CLI, plugin) has changed a name or flag compared to what is written here, check its official documentation, adapt, and note the change in the commit message.

## Global Constraints

- Node ≥ 24 LTS with **npm** (no pnpm/yarn). Rust stable ≥ 1.85. Tauri `2.x` (≥ 2.11), `@tauri-apps/api` `^2`, all plugins `^2`.
- Svelte 5 in runes mode only (`$state`, `$derived`, `$effect`, `$props`). `svelte/store` (`writable`, etc.) is forbidden.
- TypeScript `strict: true`. No `any` except at the boundary with untyped libraries (commented).
- App identifier `com.abelgallo.markdownreader`, `productName` `Markdown Reader`, binary `markdown-reader`, version `2.0.0-beta.1` when Phase 1 closes.
- Markdown extensions (case-insensitive): `md, mkd, mdwn, mdown, mdtxt, mdtext, markdown, text, txt`.
- Maximum openable file size: **20 MiB** (20 × 1024 × 1024 bytes).
- Recent files: at most **20** unpinned; pinned entries do not count toward the limit.
- No UI text hard-coded in components: everything goes through `t()` (English and Spanish). English is the default; Spanish is used when the OS language starts with `es`.
- No telemetry. The only network connections allowed in Phase 1 are the document's remote images (can be disabled).
- All document HTML goes through `rehype-sanitize`. The only `{@html}` allowed in the whole project is the one in `Viewer.svelte` (and, in later phases, the ones that receive `renderMarkdown` output).
- Content-Security-Policy (production), exact:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: http://asset.localhost https: data: blob:; font-src 'self' data:; connect-src ipc: http://ipc.localhost asset: http://asset.localhost; worker-src 'self' blob:; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'`
- LF line endings across the repo (`.gitattributes`), 2-space indentation, Prettier `printWidth: 100`.
- Conventional Commits in English (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `ci:`), no attribution lines.
- Canonical commands (must work at the end of every task from Task 2 on):
  - `npm run check` → svelte-check with no errors
  - `npm test` → Vitest
  - `npm run e2e` → Playwright (from Task 10 on)
  - `cargo test --manifest-path src-tauri/Cargo.toml`
  - `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`

## Review Focus

1. **File encodings**: a `.md` saved with Notepad as UTF-16 LE with BOM, UTF-8 with BOM, or Windows-1252 (accents and ñ) must show the correct text, with no `�` and no visible BOM. → test in Task 4 (`decode_text`).
2. **Paths and anchors with accents, spaces and duplicates**: `C:\Mis Notas\Introducción.md`, image `img/mi foto.png` (written `img/mi%20foto.png`), link `[ir](#introducción)` encoded as `#introducci%C3%B3n`, and two identical headings → everything navigates to the right place. → tests in Tasks 5, 6 and 7.
3. **Atomic save or deletion of the open file**: editors like VS Code save by writing a temp file and renaming it; the file can be deleted while open → auto-reload must keep working and, if the file disappears, the tab shows "file not available" without breaking. → tests in Tasks 5 and 15.
4. **Unknown code languages or aliases** (` ```foobar `, ` ```sh `, ` ```yml `, no language) → shown as a code block without throwing errors. → test in Task 6.
5. **The same file opened twice** (from the dialog, by dragging it, from recent files, or by double-clicking in the file explorer while the app is already open, even with different casing on Windows) → the existing tab is activated, not duplicated. → tests in Tasks 4, 8 and 11.

---

## Final file structure (Phase 1)

```
markdown-reader/
├─ legacy/                        # original NeutralinoJS version (Task 1)
│  ├─ README.md
│  ├─ neutralino.config.json
│  ├─ tailwind.config.js
│  └─ resources/...
├─ docs/
│  ├─ REFACTOR-PLAN.md
│  ├─ IMPLEMENTATION-PROMPT.md
│  └─ superpowers/plans/*.md
├─ readme_assets/                 # kept (README)
├─ .github/workflows/
│  ├─ ci.yml
│  └─ release.yml
├─ src/
│  ├─ main.ts
│  ├─ App.svelte
│  ├─ app.css
│  ├─ vite-env.d.ts
│  ├─ components/
│  │  ├─ EmptyState.svelte   TabBar.svelte   Viewer.svelte   Sidebar.svelte
│  │  ├─ StatusBar.svelte    MetaCard.svelte FindBar.svelte  Toasts.svelte
│  │  ├─ DropOverlay.svelte  Dialog.svelte   AboutDialog.svelte
│  │  └─ SettingsDialog.svelte  ShortcutsDialog.svelte
│  └─ lib/
│     ├─ fs/paths.ts (+ .test.ts)
│     ├─ native/types.ts  tauri.ts  fake.ts  index.ts  watch-filter.ts (+ .test.ts)
│     ├─ markdown/types.ts  render.ts  pipeline.ts  highlighter.ts  stats.ts
│     ├─ markdown/plugins/frontmatter.ts  alerts.ts  toc.ts  local-images.ts
│     ├─ markdown/render.test.ts  alerts.test.ts
│     ├─ dom/links.ts  enhance.ts  find.ts (+ .test.ts for each)
│     ├─ state/recents.ts  settings.ts  session.ts (+ .test.ts)
│     ├─ state/settings.svelte.ts  tabs.svelte.ts (+ tabs.test.ts)  toasts.svelte.ts  app.svelte.ts
│     ├─ i18n/index.svelte.ts  en.ts  es.ts  i18n.test.ts
│     ├─ commands.ts (+ .test.ts)  app-commands.ts
│     └─ menu.ts (+ .test.ts)
├─ src-tauri/
│  ├─ Cargo.toml  build.rs  tauri.conf.json
│  ├─ capabilities/default.json
│  ├─ icons/...
│  └─ src/main.rs  lib.rs  error.rs  documents.rs  startup.rs
├─ tests/e2e/
│  ├─ fixtures/basic.md  xss.md  headings.md  images.md  alerts.md  code.md  img/pixel.png
│  └─ *.spec.ts
├─ index.html  package.json  package-lock.json  vite.config.ts  svelte.config.js
├─ tsconfig.json  tsconfig.app.json  tsconfig.node.json  vitest.config.ts  playwright.config.ts
├─ .prettierrc  .prettierignore  .gitignore  .gitattributes  .editorconfig
├─ CLAUDE.md                      # short guide for AI agents
├─ README.md  LICENSE
```

---

### Task 1: Back up v1, move it to `legacy/` and restart the Git history

The GitHub repository `git@github.com:abelrgr/markdown-reader.git` (single branch `master`, no tags) is restarted: the new history begins with one commit containing the archived v1 app in `legacy/` plus the docs. The old history is kept only in a local backup bundle.

**Files:**
- Move: `resources/` → `legacy/resources/`, `neutralino.config.json` → `legacy/neutralino.config.json`, `tailwind.config.js` → `legacy/tailwind.config.js`
- Create: `legacy/README.md` (copy of the current README with a note on top)
- Delete: `.tmp/`, `.git/` (after the backup)
- Modify: `.gitignore`, `.editorconfig`
- Create: `.gitattributes`
- Create (outside the repo): `../markdown-reader-v1-backup.bundle`

**Interfaces:**
- Produces: a fresh repository on branch `master` with remote `origin` = `git@github.com:abelrgr/markdown-reader.git`; repo root free for the new project; `legacy/` runnable on its own.

- [ ] **Step 1: Back up the full old history (including uncommitted docs)**

```bash
git add -A && git commit -m "docs: v2 refactor plan" || true
git bundle create ../markdown-reader-v1-backup.bundle --all
git bundle verify ../markdown-reader-v1-backup.bundle
```
Expected: `The bundle records a complete history` / `is okay`. Do not continue if verification fails.

- [ ] **Step 2: Move the v1 app into `legacy/`**

```bash
mkdir legacy
mv resources legacy/resources
mv neutralino.config.json tailwind.config.js legacy/
rm -rf .tmp
cp README.md legacy/README.md
```

- [ ] **Step 3: Prepend this note to `legacy/README.md`**

```markdown
> **Old version (NeutralinoJS, v1).** Kept for reference only. The current app lives at the repository root.
> To run it: `cd legacy && npx -y @neutralinojs/neu update && npx @neutralinojs/neu run`
```

- [ ] **Step 4: Replace `.gitignore`** with:

```gitignore
# Node / Vite
node_modules/
dist/
*.log
# Tauri / Rust
src-tauri/target/
src-tauri/gen/schemas/
src-tauri/binaries/
# Playwright
test-results/
playwright-report/
# Neutralino (legacy)
legacy/bin/
legacy/dist/
legacy/.storage/
legacy/.tmp/
legacy/resources/js/neutralino.js
.tmp/
# Editors / OS
.lite_workspace.lua
.DS_Store
Thumbs.db
```

- [ ] **Step 5: Create `.gitattributes`** containing `* text=auto eol=lf`, and in `.editorconfig` change `end_of_line = crlf` → `end_of_line = lf` and `insert_final_newline = true`.

- [ ] **Step 6: STOP — ask the owner for explicit approval** to delete the local `.git` folder and later force-push. Show them the bundle path and size. Continue only after a clear "yes".

- [ ] **Step 7: Restart the local history**

```bash
rm -rf .git
git init -b master
git remote add origin git@github.com:abelrgr/markdown-reader.git
git add -A
git commit -m "chore: initial commit - archive v1 in legacy/ and add v2 plans"
git tag v1-legacy-archive
```

- [ ] **Step 8: Verify**

Run: `git log --oneline` → exactly 1 commit. `git status --short` → empty. Root contains only `LICENSE`, `README.md`, `readme_assets/`, `docs/`, `legacy/` and the config files (`.gitignore`, `.gitattributes`, `.editorconfig`).

- [ ] **Step 9: STOP — replace the GitHub history only with the owner's explicit approval** (this is irreversible on GitHub; forks and clones keep the old history; open PRs against the old history will break):

```bash
git push --force -u origin master
git push origin v1-legacy-archive
```

Expected: `git ls-remote origin` lists only `refs/heads/master` and `refs/tags/v1-legacy-archive`, both pointing at the new commit.

---

### Task 2: Scaffold Vite + Svelte 5 + TypeScript + Tauri 2 + Tailwind 4

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `svelte.config.js`, `tsconfig*.json`, `vitest.config.ts`, `src/main.ts`, `src/App.svelte`, `src/app.css`, `src/vite-env.d.ts`, `.prettierrc`, `.prettierignore`, `CLAUDE.md`
- Create (generated): `src-tauri/**` (by `tauri init`), `src-tauri/icons/**` (by `tauri icon`)
- Modify: `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `check`, `test`, `e2e`, `tauri`, `format`; a Tauri window that loads `App.svelte`.

- [ ] **Step 1: Generate the Vite template in a temporary folder and copy it to the root**

```bash
npm create vite@latest ../mdr-scaffold -- --template svelte-ts
cp -r ../mdr-scaffold/{index.html,package.json,vite.config.ts,svelte.config.js,tsconfig.json,tsconfig.app.json,tsconfig.node.json,src} .
rm -rf ../mdr-scaffold src/assets src/lib/Counter.svelte public
```

In `package.json`: `"name": "markdown-reader"`, `"version": "2.0.0-beta.1"`, `"private": true`, `"type": "module"`.

- [ ] **Step 2: Install base dependencies**

```bash
npm install
npm i -D @tauri-apps/cli@^2 tailwindcss @tailwindcss/vite @tailwindcss/typography vitest jsdom @testing-library/dom prettier prettier-plugin-svelte
npm i @tauri-apps/api@^2
```

- [ ] **Step 3: Initialize Tauri**

```bash
npx tauri init --ci --app-name "Markdown Reader" --window-title "Markdown Reader" --frontend-dist ../dist --dev-url http://localhost:5173 --before-dev-command "npm run dev" --before-build-command "npm run build"
npx tauri icon legacy/resources/icons/markdown-icon.png
```

- [ ] **Step 4: Adjust `src-tauri/tauri.conf.json`**

Exact values: `productName: "Markdown Reader"`, `version: "../package.json"` (reads the version from package.json), `identifier: "com.abelgallo.markdownreader"`, `mainBinaryName: "markdown-reader"`. Window `main`: `title "Markdown Reader"`, `width 1100`, `height 750`, `minWidth 480`, `minHeight 320`, `center true`, `dragDropEnabled true`. `app.withGlobalTauri: false`. `app.security.csp` = the CSP from Global Constraints. `app.security.devCsp` = the same CSP, adding `ws://localhost:5173 http://localhost:5173` to `connect-src` and `http://localhost:5173` to `script-src`, `style-src` and `img-src`. `app.security.assetProtocol: { "enable": true, "scope": [] }`. `bundle.active: true`, `bundle.targets: "all"`, `bundle.category: "Productivity"`, `bundle.shortDescription: "Markdown reader"`, `bundle.copyright: "© Abel Gallo Ruiz"`, `bundle.licenseFile: "../LICENSE"`.

In `src-tauri/Cargo.toml`: `name = "markdown-reader"`, `[lib] name = "markdown_reader_lib"`, `edition = "2021"`, `rust-version = "1.85"`, and the `tauri` dependency with `features = ["protocol-asset"]`.

- [ ] **Step 5: Configure Vite, Tailwind and Vitest**

`vite.config.ts`: plugins `[tailwindcss(), svelte()]`; `clearScreen: false`; `server: { port: 5173, strictPort: true }`; `envPrefix: ['VITE_', 'TAURI_ENV_']`; `build.target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari15'`; `build.sourcemap: !!process.env.TAURI_ENV_DEBUG`.

`vitest.config.ts`: reuses the `svelte()` plugin, `test: { environment: 'jsdom', include: ['src/**/*.test.ts'], exclude: ['tests/e2e/**'] }`, `resolve.conditions: ['browser']`.

`src/app.css`:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

- [ ] **Step 6: Scripts in `package.json`** (exact):

```json
"dev": "vite",
"dev:e2e": "vite --port 5174 --mode e2e",
"build": "vite build",
"check": "svelte-check --tsconfig ./tsconfig.app.json --fail-on-warnings",
"test": "vitest run",
"e2e": "playwright test",
"tauri": "tauri",
"format": "prettier --write ."
```

`.prettierrc`: `{ "printWidth": 100, "singleQuote": true, "plugins": ["prettier-plugin-svelte"] }`. `.prettierignore`: `legacy/`, `dist/`, `src-tauri/target/`, `src-tauri/gen/`, `package-lock.json`.

- [ ] **Step 7: Minimal `App.svelte`** that shows `<main class="prose dark:prose-invert">Markdown Reader</main>`, with `./app.css` imported from `main.ts` (Svelte 5: `mount(App, { target: document.getElementById('app')! })`).

- [ ] **Step 8: Create `CLAUDE.md`** (guide for agents, in English; max. 40 lines) with: the app's purpose, the canonical commands from Global Constraints, the folder map from this plan, and these rules: "every native call goes through `src/lib/native`", "all UI text goes through `t()`", "the only `{@html}` is the one in Viewer", "do not touch `legacy/`".

- [ ] **Step 9: Verify**

Run: `npm run check && npm run build && cargo check --manifest-path src-tauri/Cargo.toml`
Expected: no errors.
Run: `npm run tauri dev`
Expected: a 1100×750 window opens with the text "Markdown Reader". Close it.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Tauri 2 + Svelte 5 + TypeScript + Tailwind 4"
```

---

### Task 3: Continuous integration and release workflow

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/release.yml`

**Interfaces:**
- Produces: job `frontend`, job `rust` (3-OS matrix), job `e2e` (enabled in Task 10); release when `v*` tags are pushed.

- [ ] **Step 1: `ci.yml`** — triggers: `push` to `master` and `pull_request`. Jobs:
  - `frontend` (ubuntu-latest): `actions/setup-node@v4` with `node-version: 24`, `cache: npm` → `npm ci` → `npm run check` → `npm test` → `npm run build`.
  - `rust` (matrix `ubuntu-22.04`, `windows-latest`, `macos-latest`): `dtolnay/rust-toolchain@stable` with `components: clippy, rustfmt`, `Swatinem/rust-cache@v2` with `workspaces: src-tauri`; on Linux install `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`; `npm ci && npm run build` (Tauri needs `dist/` to compile); `cargo fmt --manifest-path src-tauri/Cargo.toml --check`; `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`; `cargo test --manifest-path src-tauri/Cargo.toml`.
  - `e2e`: leave it commented out with `# enabled in Task 10`.

- [ ] **Step 2: `release.yml`** — trigger: `push` of `v*` tags. Matrix: `windows-latest` (empty args), `macos-latest` (`--target universal-apple-darwin`, add targets `aarch64-apple-darwin,x86_64-apple-darwin`), `ubuntu-22.04`. Uses `tauri-apps/tauri-action@v0` with `tagName: ${{ github.ref_name }}`, `releaseName: "Markdown Reader ${{ github.ref_name }}"`, `releaseDraft: true`, `prerelease: ${{ contains(github.ref_name, '-') }}`. Permissions `contents: write`.

- [ ] **Step 3: Check syntax**

Run: `npx -y action-validator .github/workflows/ci.yml .github/workflows/release.yml` (if it is not available, check on GitHub after the push).
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add .github
git commit -m "ci: add CI and release workflows"
```

---

### Task 4: Rust backend — opening documents, errors and startup paths

**Files:**
- Create: `src-tauri/src/error.rs`, `src-tauri/src/documents.rs`, `src-tauri/src/startup.rs`, `src-tauri/capabilities/default.json`
- Modify: `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`

**Interfaces:**
- Produces (Tauri commands, exact snake_case names; the frontend calls them with camelCase arguments):
  - `open_document(path: String) -> Result<OpenedDocument, AppError>`
  - `paths_exist(paths: Vec<String>) -> Vec<bool>`
  - `take_startup_paths() -> Vec<String>` (empties the queue)
  - Event `open-paths` with payload `Vec<String>` (second instance and macOS "Open With")
- Serialized types (camelCase):

```rust
pub struct OpenedDocument {
    pub path: String,        // canonicalized absolute path (on Windows without the \\?\ prefix)
    pub name: String,        // file name with extension
    pub dir: String,         // absolute containing folder
    pub content: String,     // decoded text, without BOM
    pub modified_ms: u64,    // mtime in ms since UNIX_EPOCH
    pub encoding: String,    // "utf-8" | "utf-8-bom" | "utf-16le" | "utf-16be" | "windows-1252"
}

#[serde(tag = "code", content = "detail", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AppError {
    NotFound(String),
    UnsupportedExtension(String),
    TooLarge { size: u64, max: u64 },
    Io(String),
}
```

- Pure functions (public for tests):
  - `documents::is_markdown_path(path: &Path) -> bool`
  - `documents::decode_text(bytes: &[u8]) -> (String, &'static str)`
  - `startup::collect_paths(args: impl IntoIterator<Item = String>, cwd: &Path) -> Vec<String>`

- [ ] **Step 1: Dependencies**

```bash
cd src-tauri
cargo add serde --features derive
cargo add serde_json thiserror encoding_rs dunce
cargo add tauri-plugin-dialog tauri-plugin-store tauri-plugin-opener tauri-plugin-window-state tauri-plugin-log log
cargo add tauri-plugin-fs --features watch
cargo add tauri-plugin-single-instance --target 'cfg(any(target_os = "macos", windows, target_os = "linux"))'
cargo add --dev tempfile
cd ..
npm i @tauri-apps/plugin-dialog @tauri-apps/plugin-store @tauri-apps/plugin-opener @tauri-apps/plugin-fs @tauri-apps/plugin-window-state @tauri-apps/plugin-log
```

Local error log: register `tauri_plugin_log` with targets `LogDir` and `Stdout`, level `Info`, rotation at 5 MB (`max_file_size(5_000_000)`, `RotationStrategy::KeepOne`); add the `log:default` permission. In the frontend (`main.ts`), `window.onerror` and `unhandledrejection` send the message with `error()` from `@tauri-apps/plugin-log` (only in non-e2e mode). Document content is never logged.

(`dunce::canonicalize` avoids the `\\?\` prefix on Windows.)

- [ ] **Step 2: Write failing tests** in `documents.rs` (`#[cfg(test)] mod tests`):

```rust
#[test] fn accepts_markdown_extensions_case_insensitive() {
    for p in ["a.md", "B.MD", "c.Markdown", "d.txt", "e.mdown", "f.text"] {
        assert!(is_markdown_path(Path::new(p)), "{p}");
    }
    for p in ["a.exe", "b", "c.md.exe", "d.html"] {
        assert!(!is_markdown_path(Path::new(p)), "{p}");
    }
}
#[test] fn decodes_utf8() { assert_eq!(decode_text("ñandú".as_bytes()), ("ñandú".into(), "utf-8")); }
#[test] fn strips_utf8_bom() { assert_eq!(decode_text(b"\xEF\xBB\xBF# Hola"), ("# Hola".into(), "utf-8-bom")); }
#[test] fn decodes_utf16le_bom() {
    let mut b = vec![0xFF, 0xFE];
    for u in "Introducción".encode_utf16() { b.extend_from_slice(&u.to_le_bytes()); }
    assert_eq!(decode_text(&b), ("Introducción".into(), "utf-16le"));
}
#[test] fn decodes_utf16be_bom() {
    let mut b = vec![0xFE, 0xFF];
    for u in "año".encode_utf16() { b.extend_from_slice(&u.to_be_bytes()); }
    assert_eq!(decode_text(&b), ("año".into(), "utf-16be"));
}
#[test] fn falls_back_to_windows_1252() {
    assert_eq!(decode_text(b"Espa\xF1a caf\xE9"), ("España café".into(), "windows-1252"));
}
```

And in `startup.rs`:

```rust
#[test] fn collects_existing_markdown_args_relative_to_cwd() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(dir.path().join("nota uno.md"), "# x").unwrap();
    std::fs::write(dir.path().join("prog.exe"), "x").unwrap();
    let out = collect_paths(
        ["nota uno.md".into(), "prog.exe".into(), "falta.md".into(), "--flag".into()],
        dir.path(),
    );
    assert_eq!(out.len(), 1);
    assert!(out[0].ends_with("nota uno.md"));
    assert!(std::path::Path::new(&out[0]).is_absolute());
}
```

And an integration test of `open_document` over the logic without `AppHandle`: split `read_document(path: &Path) -> Result<OpenedDocument, AppError>` (pure) from the command:

```rust
#[test] fn read_document_errors() {
    let dir = tempfile::tempdir().unwrap();
    assert!(matches!(read_document(&dir.path().join("no.md")), Err(AppError::NotFound(_))));
    let exe = dir.path().join("a.exe"); std::fs::write(&exe, "x").unwrap();
    assert!(matches!(read_document(&exe), Err(AppError::UnsupportedExtension(_))));
    let big = dir.path().join("big.md");
    std::fs::File::create(&big).unwrap().set_len(20 * 1024 * 1024 + 1).unwrap();
    assert!(matches!(read_document(&big), Err(AppError::TooLarge { .. })));
}
#[test] fn read_document_ok() {
    let dir = tempfile::tempdir().unwrap();
    let p = dir.path().join("Introducción.md"); std::fs::write(&p, "# Hola").unwrap();
    let d = read_document(&p).unwrap();
    assert_eq!(d.name, "Introducción.md");
    assert_eq!(d.content, "# Hola");
    assert_eq!(d.encoding, "utf-8");
    assert!(d.modified_ms > 0);
}
```

- [ ] **Step 3: Run and watch them fail**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: FAIL (functions not defined).

- [ ] **Step 4: Implement**
  - `error.rs`: `AppError` with `thiserror` + `Serialize`; `impl From<std::io::Error>` (`NotFound` if `ErrorKind::NotFound`, otherwise `Io(e.to_string())`).
  - `documents.rs`: `MAX_FILE_BYTES: u64 = 20 * 1024 * 1024`; `MARKDOWN_EXTENSIONS` same as Global Constraints; `decode_text` detects a BOM (UTF-8, UTF-16 LE/BE), then tries `std::str::from_utf8`, and if that fails uses `encoding_rs::WINDOWS_1252.decode`. `read_document` checks the extension before reading and the size with `metadata` before reading. The `open_document(app, path)` command calls `read_document` and then authorizes the folder: `app.asset_protocol_scope().allow_directory(&dir, true)` and `app.fs_scope().allow_directory(&dir, false)` (`use tauri_plugin_fs::FsExt`). `paths_exist` uses `Path::exists`.
  - `startup.rs`: `collect_paths` ignores arguments starting with `-`, joins relative paths with `cwd`, keeps only those that exist and pass `is_markdown_path`, and returns paths canonicalized with `dunce`. `struct StartupPaths(Mutex<Vec<String>>)`; the `take_startup_paths` command does `std::mem::take`.
  - `lib.rs`: register **first** `tauri_plugin_single_instance::init(|app, argv, cwd| { … })` (under `#[cfg(desktop)]`), which: shows and focuses the `main` window, computes `collect_paths(argv.into_iter().skip(1), Path::new(&cwd))` and emits `open-paths`. Then the `dialog`, `fs`, `store`, `opener`, `window_state` plugins. In `setup`: `app.manage(StartupPaths(Mutex::new(collect_paths(std::env::args().skip(1), &std::env::current_dir()?))))`. In `run` (the `RunEvent` closure), under `#[cfg(any(target_os = "macos", target_os = "ios"))]`, handle `RunEvent::Opened { urls }`: convert with `url.to_file_path()`, filter with `is_markdown_path`, add to the queue **and** emit `open-paths`.

- [ ] **Step 5: Permissions** — `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-set-title",
    "core:window:allow-set-fullscreen",
    "core:webview:allow-set-webview-zoom",
    "core:menu:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:allow-watch",
    "fs:allow-unwatch",
    "store:default",
    "opener:allow-open-url",
    "opener:allow-reveal-item-in-dir",
    "window-state:default",
    "log:default"
  ]
}
```

If `tauri build` reports that an identifier does not exist, replace it with the one listed in the error (permission names can vary between minor versions).

- [ ] **Step 6: File association** — in `tauri.conf.json` → `bundle.fileAssociations`:

```json
[{ "ext": ["md", "markdown", "mdown", "mkd", "mdwn", "mdtxt", "mdtext"], "name": "Markdown", "description": "Markdown document", "role": "Viewer", "mimeType": "text/markdown" }]
```

- [ ] **Step 7: Run tests and lints**

Run: `cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`
Expected: PASS, no warnings.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(backend): open documents with encoding detection, startup paths and single instance"
```

---

### Task 5: Native boundary in the frontend (`src/lib/native`) and path utilities

**Files:**
- Create: `src/lib/fs/paths.ts`, `src/lib/fs/paths.test.ts`
- Create: `src/lib/native/types.ts`, `src/lib/native/tauri.ts`, `src/lib/native/fake.ts`, `src/lib/native/index.ts`, `src/lib/native/watch-filter.ts`, `src/lib/native/watch-filter.test.ts`

**Interfaces:**
- Consumes: commands and event from Task 4.
- Produces:

```ts
// src/lib/fs/paths.ts
export const MARKDOWN_EXTENSIONS: readonly string[]; // the 9 from Global Constraints
export const IS_WINDOWS: boolean;                     // navigator.userAgent includes "Windows"
export function isMarkdownPath(path: string): boolean;
export function normalizePath(path: string): string;  // "\" → "/", collapses "//", resolves "." and ".."
export function basename(path: string): string;
export function dirname(path: string): string;
export function joinPath(dir: string, relative: string): string; // decodes %XX in the relative part
export function samePath(a: string, b: string, caseInsensitive?: boolean): boolean; // defaults to IS_WINDOWS

// src/lib/native/types.ts
export type AppErrorCode = 'NOT_FOUND' | 'UNSUPPORTED_EXTENSION' | 'TOO_LARGE' | 'IO';
export class NativeError extends Error { code: AppErrorCode; detail: unknown }
export interface OpenedDocument { path: string; name: string; dir: string; content: string; modifiedMs: number; encoding: string }
export type Unlisten = () => void;
export type FileChange = 'modified' | 'removed';
export interface KeyValueStore { get<T>(key: string): Promise<T | undefined>; set(key: string, value: unknown): Promise<void> }
export interface NativeApi {
  openDocument(path: string): Promise<OpenedDocument>;          // rejects with NativeError
  pathsExist(paths: string[]): Promise<boolean[]>;
  takeStartupPaths(): Promise<string[]>;
  onOpenPaths(cb: (paths: string[]) => void): Promise<Unlisten>;
  pickMarkdownFiles(): Promise<string[]>;                       // dialog, multiple selection
  onFileDrop(h: { over: (inside: boolean) => void; drop: (paths: string[]) => void }): Promise<Unlisten>;
  watchFile(path: string, onChange: (c: FileChange) => void): Promise<Unlisten>;
  openExternal(url: string): Promise<void>;
  revealInFolder(path: string): Promise<void>;
  toAssetUrl(absPath: string): string;
  setWindowTitle(title: string): Promise<void>;
  setZoom(factor: number): Promise<void>;
  setFullscreen(on: boolean): Promise<void>;
  appInfo(): Promise<{ version: string; tauriVersion: string }>;
  quit(): Promise<void>;
  store: KeyValueStore;
}

// src/lib/native/watch-filter.ts
export function isEventForFile(eventPaths: string[], target: string, caseInsensitive?: boolean): boolean;

// src/lib/native/index.ts
export const native: NativeApi; // fake if import.meta.env.MODE === 'e2e', otherwise tauri
```

- [ ] **Step 1: Failing tests** — `paths.test.ts`:

```ts
test('isMarkdownPath', () => {
  expect(isMarkdownPath('C:\\Notas\\README.MD')).toBe(true);
  expect(isMarkdownPath('/a/b.txt')).toBe(true);
  expect(isMarkdownPath('/a/b.md.exe')).toBe(false);
});
test('joinPath resolves relative and percent-encoding', () => {
  expect(joinPath('C:/Mis Notas', 'img/mi%20foto.png')).toBe('C:/Mis Notas/img/mi foto.png');
  expect(joinPath('/home/u/docs/sub', '../img/a.png')).toBe('/home/u/docs/img/a.png');
  expect(joinPath('C:\\Mis Notas', './b.md')).toBe('C:/Mis Notas/b.md');
});
test('dirname/basename with backslashes', () => {
  expect(dirname('C:\\Mis Notas\\Introducción.md')).toBe('C:/Mis Notas');
  expect(basename('C:\\Mis Notas\\Introducción.md')).toBe('Introducción.md');
});
test('samePath', () => {
  expect(samePath('C:\\A\\b.md', 'c:/a/B.md', true)).toBe(true);
  expect(samePath('/a/b.md', '/a/B.md', false)).toBe(false);
});
```

`watch-filter.test.ts`:

```ts
test('matches direct, renamed-into and case variants', () => {
  expect(isEventForFile(['/d/nota.md'], '/d/nota.md')).toBe(true);
  expect(isEventForFile(['/d/.nota.md.tmp', '/d/nota.md'], '/d/nota.md')).toBe(true); // atomic save
  expect(isEventForFile(['/d/otra.md'], '/d/nota.md')).toBe(false);
  expect(isEventForFile(['C:\\D\\Nota.md'], 'c:/d/nota.md', true)).toBe(true);
});
```

- [ ] **Step 2: Run** `npm test` → FAIL.

- [ ] **Step 3: Implement `paths.ts` and `watch-filter.ts`** (pure, no Tauri imports).

- [ ] **Step 4: Implement `tauri.ts`** (`export const tauriNative: NativeApi`):
  - `openDocument`/`pathsExist`/`takeStartupPaths` → `invoke('open_document', { path })` etc.; catch the serialized `{ code, detail }` error and throw `NativeError`.
  - `onOpenPaths` → `listen<string[]>('open-paths', e => cb(e.payload))`.
  - `pickMarkdownFiles` → `open({ multiple: true, directory: false, filters: [{ name: 'Markdown', extensions: [...MARKDOWN_EXTENSIONS] }] })`, normalizes `null`/string/array to `string[]`.
  - `onFileDrop` → `getCurrentWebview().onDragDropEvent`: `enter`/`over` → `over(true)`, `leave` → `over(false)`, `drop` → `over(false)` and `drop(paths.filter(isMarkdownPath))`.
  - `watchFile(path)` → `watch(dirname(path), handler, { recursive: false, delayMs: 250 })` from the fs plugin (watches the **folder**, not the file, to survive atomic saves); on every event with `isEventForFile(event.paths, path)` it calls `pathsExist([path])` and emits `'modified'` or `'removed'`.
  - `openExternal` → `openUrl`; `revealInFolder` → `revealItemInDir`; `toAssetUrl` → `convertFileSrc`; `setWindowTitle`/`setFullscreen` → `getCurrentWindow()`; `setZoom` → `getCurrentWebview().setZoom`; `appInfo` → `getVersion()`/`getTauriVersion()`; `quit` → `getCurrentWindow().close()` (close the window, do not kill the process, so `window-state` saves size and position).
  - `store` → `load('state.json', { autoSave: 300 })` from the store plugin (lazy, a single instance).

- [ ] **Step 5: Implement `fake.ts`** (`export const fakeNative: NativeApi`) for in-browser E2E:
  - In-memory FS initialized with `import.meta.glob('/tests/e2e/fixtures/**/*.md', { query: '?raw', import: 'default', eager: true })`, reachable at paths `/fx/<relative path inside fixtures>`.
  - `toAssetUrl('/fx/x')` → `'/tests/e2e/fixtures/x'` (Vite serves those files).
  - `store` backed by `sessionStorage` (survives `page.reload()`, needed for the settings and session tests); `openExternal` records the URL in `window.__e2e.openedUrls`; `setWindowTitle` assigns `document.title`; `setZoom`/`setFullscreen` store the value in `window.__e2e.zoom` / `window.__e2e.fullscreen`.
  - Exposes `window.__e2e = { setDialogResult(paths), drop(paths), emitOpenPaths(paths), writeFile(path, content), deleteFile(path), openedUrls: string[] }` and reads `window.__E2E_STARTUP__ ?? []` in `takeStartupPaths`.
  - `writeFile`/`deleteFile` trigger the `watchFile` watchers with `'modified'`/`'removed'`.
  - Errors: nonexistent file → `NativeError('NOT_FOUND')`.

- [ ] **Step 6: `index.ts`**: `export const native: NativeApi = import.meta.env.MODE === 'e2e' ? fakeNative : tauriNative;` with static imports of both (the fake has no heavy dependencies).

- [ ] **Step 7: Run** `npm test && npm run check` → PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: typed native boundary with Tauri and in-memory implementations"
```

---

### Task 6: Markdown render pipeline (safe, GFM, Shiki, TOC, front matter, alerts)

**Files:**
- Create: `src/lib/markdown/types.ts`, `render.ts`, `pipeline.ts`, `highlighter.ts`, `stats.ts`
- Create: `src/lib/markdown/plugins/frontmatter.ts`, `alerts.ts`, `toc.ts`, `local-images.ts`
- Test: `src/lib/markdown/render.test.ts`, `src/lib/markdown/alerts.test.ts`

**Interfaces:**
- Produces:

```ts
// types.ts
export interface TocItem { depth: 1 | 2 | 3 | 4 | 5 | 6; text: string; id: string }
export interface DocStats { words: number; readingMinutes: number }
export interface RenderResult { html: string; toc: TocItem[]; frontmatter: Record<string, unknown> | null; stats: DocStats }
// render.ts
export function renderMarkdownCore(source: string): Promise<RenderResult>;
export function renderMarkdown(source: string): Promise<RenderResult>; // in Phase 1 = renderMarkdownCore; in Phase 2 it uses a Worker
// stats.ts
export function computeStats(plainText: string): DocStats; // words = matches of /[\p{L}\p{N}]+/gu; minutes = max(1, ceil(words/200))
// highlighter.ts
export const SHIKI_LANGS: readonly string[];
export function getHighlighter(): Promise<HighlighterCore>; // singleton
```

- [ ] **Step 1: Dependencies**

```bash
npm i unified remark-parse remark-gfm remark-frontmatter remark-rehype rehype-raw rehype-sanitize rehype-slug rehype-autolink-headings rehype-stringify hast-util-to-string mdast-util-to-string unist-util-visit yaml shiki @shikijs/rehype
```

- [ ] **Step 2: Failing tests** — `render.test.ts` (each `test` uses `const r = await renderMarkdownCore(src)`):

```ts
test('GFM table', async () => { const r = await renderMarkdownCore('| a | b |\n|---|---|\n| 1 | 2 |');
  expect(r.html).toContain('<table>'); expect(r.html).toContain('<td>1</td>'); });
test('task list is disabled checkbox', async () => { const r = await renderMarkdownCore('- [x] hecho');
  expect(r.html).toMatch(/<input[^>]*type="checkbox"[^>]*checked[^>]*disabled|disabled[^>]*checked/); });
test('removes script tags', async () => {
  expect((await renderMarkdownCore('<script>alert(1)</script>')).html).not.toContain('<script'); });
test('removes event handlers', async () => {
  expect((await renderMarkdownCore('<img src="x.png" onerror="alert(1)">')).html).not.toContain('onerror'); });
test('removes javascript: links', async () => {
  expect((await renderMarkdownCore('[x](javascript:alert(1))')).html).not.toContain('javascript:'); });
test('removes iframes and styles', async () => { const r = await renderMarkdownCore('<iframe src="https://e.com"></iframe><p style="color:red">t</p>');
  expect(r.html).not.toContain('<iframe'); expect(r.html).not.toContain('style="color'); });
test('toc with accents and duplicates', async () => {
  const r = await renderMarkdownCore('# Introducción\n## Uso\n## Uso');
  expect(r.toc).toEqual([
    { depth: 1, text: 'Introducción', id: 'introducción' },
    { depth: 2, text: 'Uso', id: 'uso' },
    { depth: 2, text: 'Uso', id: 'uso-1' },
  ]);
  expect(r.html).toContain('id="uso-1"');
});
test('footnote links point to existing ids', async () => {
  const { html } = await renderMarkdownCore('Texto[^1]\n\n[^1]: Nota');
  const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  expect(hrefs.length).toBeGreaterThan(0);
  for (const id of hrefs) expect(html).toContain(`id="${id}"`);
});
test('frontmatter parsed and hidden', async () => {
  const r = await renderMarkdownCore('---\ntitle: Hola\ntags: [a, b]\n---\n# T');
  expect(r.frontmatter).toEqual({ title: 'Hola', tags: ['a', 'b'] });
  expect(r.html).not.toContain('title: Hola');
});
test('invalid frontmatter does not throw', async () => {
  const r = await renderMarkdownCore('---\ntitle: [roto\n---\n# T');
  expect(r.frontmatter).toBeNull(); expect(r.html).toContain('<h1');
});
test('shiki highlights known language', async () => {
  expect((await renderMarkdownCore('```ts\nconst a = 1\n```')).html).toContain('class="shiki');
});
test.each(['foobar', 'sh', 'yml', ''])('code block lang "%s" renders without error', async (lang) => {
  const r = await renderMarkdownCore('```' + lang + '\nhola_mundo\n```');
  expect(r.html).toContain('<pre'); expect(r.html).toContain('hola_mundo');
});
test('relative images are marked, remote kept', async () => {
  const r = await renderMarkdownCore('![a](img/mi%20foto.png) ![b](https://x.org/y.png)');
  expect(r.html).toContain('data-local-src="img/mi%20foto.png"');
  expect(r.html).not.toMatch(/src="img\//);
  expect(r.html).toContain('src="https://x.org/y.png"');
});
test('stats', async () => { expect((await renderMarkdownCore('uno dos tres')).stats).toEqual({ words: 3, readingMinutes: 1 }); });
test('1 MB document renders under 3 s', async () => {
  const src = Array.from({ length: 4000 }, (_, i) => `## Sección ${i}\n\n${'palabra '.repeat(30)}\n`).join('\n');
  const t0 = performance.now(); await renderMarkdownCore(src);
  expect(performance.now() - t0).toBeLessThan(3000);
});
```

`alerts.test.ts`:

```ts
test.each(['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'])('alert %s', async (kind) => {
  const r = await renderMarkdownCore(`> [!${kind}]\n> cuidado`);
  expect(r.html).toContain(`class="markdown-alert markdown-alert-${kind.toLowerCase()}"`);
  expect(r.html).toContain('<p class="markdown-alert-title">');
  expect(r.html).not.toContain(`[!${kind}]`);
  expect(r.html).toContain('cuidado');
});
test('normal blockquote untouched', async () => {
  expect((await renderMarkdownCore('> cita')).html).toContain('<blockquote>');
});
```

- [ ] **Step 3: Run** `npm test -- src/lib/markdown` → FAIL.

- [ ] **Step 4: Implement** `pipeline.ts` → `createProcessor(highlighter: HighlighterCore)`, in this **exact order** (sanitizing happens before everything that generates trusted HTML):
  1. `remark-parse` → `remark-gfm` → `remark-frontmatter(['yaml'])` → `remarkFrontmatterData` (custom plugin: parses the `yaml` node with `yaml.parse`, stores the object in `file.data.frontmatter`, or `null` if parsing fails or the result is not an object, and removes the node)
  2. `remark-rehype({ allowDangerousHtml: true })` → `rehype-raw`
  3. `rehype-sanitize` with `defaultSchema` (do not extend it: it already allows `language-*` on `code`, disabled checkboxes and `details/summary`)
  4. `rehypeAlerts` (custom): a `blockquote` whose first `p` starts with `[!NOTE|TIP|IMPORTANT|WARNING|CAUTION]` (case-insensitive) becomes `<div class="markdown-alert markdown-alert-<type>"><p class="markdown-alert-title">Note|Tip|Important|Warning|Caution</p>…rest…</div>`
  5. `rehype-slug` → `rehypeCollectToc` (custom: walks `h1..h6`, stores `{ depth, text: hast-util-to-string, id }` in `file.data.toc`) → `rehype-autolink-headings({ behavior: 'append', properties: { className: ['heading-anchor'], ariaHidden: 'true', tabIndex: -1 }, content: { type: 'text', value: '#' } })`
  6. `rehypeShikiFromHighlighter(highlighter, { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: 'light', fallbackLanguage: 'text' })` from `@shikijs/rehype/core`; if a language is not loaded it must fall back to plain text (the test requires it).
  7. `rehypeMarkLocalImages` (custom): an `img` whose `src` has no scheme (`/^[a-z][a-z0-9+.-]*:/i`) and does not start with `//` → moves `src` to `data-local-src`.
  8. `rehype-stringify`.

  `highlighter.ts`: `createHighlighterCore({ themes: [import('@shikijs/themes/github-light'), import('@shikijs/themes/github-dark')], langs: [import('@shikijs/langs/javascript'), import('@shikijs/langs/typescript'), …], engine: createJavaScriptRegexEngine() })` — write one literal `import('@shikijs/langs/<lang>')` per language (Vite does not resolve dynamic imports with variables inside packages), with `SHIKI_LANGS = ['javascript','typescript','jsx','tsx','json','jsonc','bash','shellscript','powershell','python','rust','go','java','kotlin','swift','c','cpp','csharp','php','ruby','sql','html','css','scss','xml','yaml','toml','ini','markdown','diff','dockerfile','graphql','lua','r','dart']`. Shiki resolves the aliases (`sh`, `yml`, `js`, `ts`, `py`); if one is not resolved, add it with `langAlias`.

  `render.ts`: `renderMarkdownCore` gets the highlighter, processes, and computes `stats` with `computeStats(mdast-util-to-string(mdastTree))` (get the tree with `processor.parse` + `runSync`, or store it in `file.data` from a remark plugin).

- [ ] **Step 5: Run** `npm test -- src/lib/markdown` → PASS. If the footnote test fails because of a double `user-content-` prefix, configure `remark-rehype` with `clobberPrefix: ''` **and** `rehype-sanitize` with `{ ...defaultSchema, clobberPrefix: 'user-content-' }`, so the prefix is applied only once, consistently, to both `href` and `id`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(markdown): safe unified pipeline with GFM, alerts, TOC, frontmatter and Shiki"
```

---

### Task 7: DOM utilities — links, local images and copy buttons

**Files:**
- Create: `src/lib/dom/links.ts`, `src/lib/dom/links.test.ts`, `src/lib/dom/enhance.ts`, `src/lib/dom/enhance.test.ts`

**Interfaces:**
- Consumes: `joinPath`, `isMarkdownPath` (Task 5).
- Produces:

```ts
export type LinkAction =
  | { kind: 'anchor'; id: string }
  | { kind: 'external'; url: string }
  | { kind: 'document'; path: string; anchor: string | null }
  | { kind: 'reveal'; path: string }   // local non-Markdown file: shown in its folder, NEVER executed
  | { kind: 'ignore' };
export function classifyLink(href: string, docDir: string): LinkAction;

export function resolveLocalImages(root: HTMLElement, docDir: string, toAssetUrl: (p: string) => string,
  opts: { blockRemote: boolean; blockedLabel: string }): void;
export function addCopyButtons(root: HTMLElement, labels: { copy: string; copied: string }): void;
```

- [ ] **Step 1: Failing tests** — `links.test.ts`:

```ts
const D = 'C:/Mis Notas';
test('anchor decoded', () => expect(classifyLink('#introducci%C3%B3n', D)).toEqual({ kind: 'anchor', id: 'introducción' }));
test('external', () => {
  expect(classifyLink('https://a.org/x', D)).toEqual({ kind: 'external', url: 'https://a.org/x' });
  expect(classifyLink('mailto:a@b.c', D)).toEqual({ kind: 'external', url: 'mailto:a@b.c' });
});
test('dangerous schemes ignored', () => {
  for (const h of ['javascript:alert(1)', 'file:///C:/x.exe', 'vbscript:x', 'data:text/html,x', ''])
    expect(classifyLink(h, D)).toEqual({ kind: 'ignore' });
});
test('relative markdown with anchor', () =>
  expect(classifyLink('otra%20nota.md#uso', D)).toEqual({ kind: 'document', path: 'C:/Mis Notas/otra nota.md', anchor: 'uso' }));
test('local non-markdown file is revealed, not opened', () =>
  expect(classifyLink('../bin/setup.exe', D)).toEqual({ kind: 'reveal', path: 'C:/bin/setup.exe' }));
```

`enhance.test.ts` (jsdom):

```ts
test('resolves local images and blocks remote when asked', () => {
  const root = document.createElement('div');
  root.innerHTML = '<img data-local-src="img/a%20b.png"><img src="https://x.org/y.png" alt="y">';
  resolveLocalImages(root, '/d', (p) => `asset://${p}`, { blockRemote: true, blockedLabel: 'Image blocked' });
  const [a, b] = root.querySelectorAll('img');
  expect(a.getAttribute('src')).toBe('asset:///d/img/a b.png');
  expect(b.hasAttribute('src')).toBe(false);
  expect(b.dataset.blockedSrc).toBe('https://x.org/y.png');
  expect(b.getAttribute('alt')).toBe('Image blocked: y');
});
test('adds one copy button per code block, idempotent', () => {
  const root = document.createElement('div');
  root.innerHTML = '<pre class="shiki"><code>x</code></pre><pre class="shiki"><code>y</code></pre>';
  addCopyButtons(root, { copy: 'Copy', copied: 'Copied' });
  addCopyButtons(root, { copy: 'Copy', copied: 'Copied' });
  expect(root.querySelectorAll('button.copy-code').length).toBe(2);
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** Allowed external schemes: exactly `http:`, `https:`, `mailto:`. The button copies `pre.textContent` with `navigator.clipboard.writeText` and changes its text to `copied` for 1500 ms. **Step 4: Run** → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(dom): link classification, local image resolution and copy buttons"
```

---

### Task 8: State — recent files, settings, session and tabs

**Files:**
- Create: `src/lib/state/recents.ts` (+ `.test.ts`), `settings.ts` (+ `.test.ts`), `session.ts` (+ `.test.ts`), `settings.svelte.ts`, `tabs.svelte.ts`, `tabs.test.ts`, `toasts.svelte.ts`

**Interfaces:**
- Consumes: `NativeApi`, `OpenedDocument`, `NativeError` (Task 5), `RenderResult`, `renderMarkdown` (Task 6), `samePath` (Task 5).
- Produces:

```ts
// recents.ts
export interface RecentEntry { path: string; pinned: boolean; openedAt: number }
export const MAX_RECENTS = 20;
export function addRecent(list: RecentEntry[], path: string, now: number): RecentEntry[]; // to the front; keeps pinned; trims unpinned to 20
export function togglePin(list: RecentEntry[], path: string): RecentEntry[];
export function removeRecents(list: RecentEntry[], paths: string[]): RecentEntry[];
export function sortRecents(list: RecentEntry[]): RecentEntry[]; // pinned first; then openedAt desc
export function normalizeRecents(raw: unknown): RecentEntry[];   // corrupt data → []

// settings.ts
export interface Settings {
  theme: 'system' | 'light' | 'dark';
  fontFamily: 'sans' | 'serif' | 'mono';
  fontSize: number;          // 14..24, default 17
  lineHeight: number;        // 1.4..2.0, default 1.7
  contentWidth: 'narrow' | 'medium' | 'wide' | 'full'; // 60ch | 75ch | 95ch | none; default 'medium'
  zoom: number;              // 0.5..2.0 in steps of 0.1, default 1
  blockRemoteImages: boolean;// default false
  language: 'auto' | 'es' | 'en'; // default 'auto'
  restoreSession: boolean;   // default true
  showSidebar: boolean;      // default true
}
export const DEFAULT_SETTINGS: Settings;
export function normalizeSettings(raw: unknown): Settings; // fills defaults, clamps to ranges, discards invalid values

// session.ts
export interface SessionSnapshot { tabs: { path: string; scrollTop: number }[]; activePath: string | null }
export function normalizeSession(raw: unknown): SessionSnapshot;

// settings.svelte.ts
export class SettingsState { value: Settings /* $state */; load(store: KeyValueStore): Promise<void>; update(patch: Partial<Settings>): void /* saves to store 'settings' */ }
export const settings: SettingsState;

// tabs.svelte.ts
export type TabStatus = 'ready' | 'missing';
export interface Tab { id: string; path: string; name: string; dir: string; content: string; render: RenderResult; scrollTop: number; status: TabStatus; encoding: string }
export interface TabsDeps { openDocument: (p: string) => Promise<OpenedDocument>; render: (s: string) => Promise<RenderResult>; caseInsensitive?: boolean /* defaults to IS_WINDOWS */ }
export class TabsState {
  tabs: Tab[];                 // $state
  activeId: string | null;     // $state
  get active(): Tab | null;
  constructor(deps: TabsDeps);
  open(path: string, opts?: { scrollTop?: number; activate?: boolean }): Promise<Tab>; // if it already exists (samePath) it only activates it; propagates NativeError
  close(id: string): void;     // if it was the active one, activates the one to the right; if none, the one to the left; otherwise null
  activate(id: string): void;
  move(fromIndex: number, toIndex: number): void;
  next(): void; prev(): void;  // circular
  reload(id: string): Promise<void>; // keeps scrollTop; if NOT_FOUND → status 'missing'
  markMissing(id: string): void;
  setScroll(id: string, top: number): void;
}

// toasts.svelte.ts
export interface Toast { id: number; kind: 'info' | 'error'; message: string }
export const toasts: { items: Toast[]; push(kind: Toast['kind'], message: string, ms?: number /* 5000 */): void; dismiss(id: number): void };
```

- [ ] **Step 1: Failing tests.** At minimum:
  - `recents.test.ts`: add A, B, A → order `[A, B]`; add 25 paths → 20 unpinned entries; a pinned entry survives even after adding 25 more (21 entries in total); `sortRecents` puts pinned entries first; `normalizeRecents('basura')` → `[]`; `normalizeRecents([{ path: 1 }])` → `[]`.
  - `settings.test.ts`: `normalizeSettings(undefined)` → `DEFAULT_SETTINGS`; `normalizeSettings({ fontSize: 99, theme: 'x' })` → `fontSize: 24`, `theme: 'system'`; `zoom: 0.123` → `0.5` (clamps to the minimum); `zoom: 1.26` → `1.3` (rounds to the 0.1 step).
  - `session.test.ts`: corrupt data → `{ tabs: [], activePath: null }`.
  - `tabs.test.ts` (with fake `deps`): open `C:/A/b.md` and then `c:/a/B.md` (with `IS_WINDOWS` simulated by making `samePath` case-insensitive) → 1 tab; closing the active middle tab activates the one to the right; closing the last one activates the one to the left; `reload` keeps `scrollTop`; `reload` when `openDocument` rejects with `NOT_FOUND` → `status === 'missing'` and the tab stays; `open` of a nonexistent file rejects and creates no tab; `next()` on the last tab goes back to the first.

  To pin down the casing behavior in tests, pass `caseInsensitive: true` in `TabsDeps`.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** Tab `id` = `crypto.randomUUID()`. **Step 4: Run** `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(state): recents, settings, session and tabs state"
```

---

### Task 9: Internationalization (en / es)

**Files:**
- Create: `src/lib/i18n/index.svelte.ts`, `src/lib/i18n/en.ts`, `src/lib/i18n/es.ts`, `src/lib/i18n/i18n.test.ts`

**Interfaces:**
- Produces:

```ts
// en.ts — source of truth for the keys
export const en = { 'app.name': 'Markdown Reader', /* … */ } as const;
export type MessageKey = keyof typeof en;
// es.ts
export const es: Record<MessageKey, string>; // TypeScript enforces having every key
// index.svelte.ts
export type Locale = 'es' | 'en';
export function detectLocale(lang: string | undefined): Locale; // 'es*' → 'es'; anything else → 'en'
export function setLocale(l: Locale): void;
export function getLocale(): Locale;  // reactive (internal $state)
export function t(key: MessageKey, params?: Record<string, string | number>): string; // replaces {name}
```

- [ ] **Step 1: Tests**: `detectLocale('es-PE') === 'es'`, `detectLocale('en-US') === 'en'`, `detectLocale('fr') === 'en'`, `detectLocale(undefined) === 'en'`; `setLocale('es'); t('tabs.closeNamed', { name: 'a.md' }) === 'Cerrar a.md'`; with `setLocale('en')` → `'Close a.md'`.
- [ ] **Step 2: FAIL → Step 3: implement** with at least the keys used by Tasks 11–15 (add them as you build each component; the `tabs.closeNamed` key must exist). Error messages per code: `error.NOT_FOUND`, `error.UNSUPPORTED_EXTENSION`, `error.TOO_LARGE` (with `{max}` in MB), `error.IO`.
- [ ] **Step 4: PASS → Step 5: Commit** `feat(i18n): English and Spanish messages`.

---

### Task 10: E2E harness with Playwright and a fake backend

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/fixtures/{basic,xss,headings,images,alerts,code}.md`, `tests/e2e/fixtures/img/pixel.png`, `tests/e2e/helpers.ts`, `tests/e2e/smoke.spec.ts`
- Modify: `.github/workflows/ci.yml` (enable the `e2e` job)

**Interfaces:**
- Consumes: `fakeNative` and `window.__e2e` (Task 5).
- Produces: `helpers.ts` with `openApp(page, opts?: { startup?: string[] })` (runs `page.addInitScript` with `window.__E2E_STARTUP__` and navigates to `/`) and `openViaDialog(page, paths: string[])` (sets `__e2e.setDialogResult` and presses `Mod+O`).

- [ ] **Step 1:** `npm i -D @playwright/test && npx playwright install --with-deps chromium webkit`
- [ ] **Step 2: `playwright.config.ts`**: `testDir: 'tests/e2e'`, `webServer: { command: 'npm run dev:e2e', url: 'http://localhost:5174', reuseExistingServer: !process.env.CI }`, `use.baseURL: 'http://localhost:5174'`, `use.locale: 'en-US'` (E2E tests run with the English UI), projects `chromium` and `webkit` (WebKit approximates the macOS and Linux WebView).
- [ ] **Step 3: Fixtures** — required minimum content:
  - `basic.md`: `# Título`, a paragraph, a table, a task list, a link `https://example.com`, a link `[a headings](headings.md#uso)`.
  - `xss.md`: `<script>window.__pwned=1</script>`, `<img src=x onerror="window.__pwned=1">`, `[x](javascript:window.__pwned=1)`.
  - `headings.md`: `# Introducción`, `## Uso`, `## Uso`, 60 filler paragraphs between headings, and `[ir](#introducción)` at the end.
  - `images.md`: `![pixel](img/pixel.png)` and `![remota](https://example.com/x.png)`.
  - `alerts.md`: one alert of each type. `code.md`: blocks `ts`, `sh`, `foobar`, and one without a language.
  - `img/pixel.png`: 1×1 PNG.
- [ ] **Step 4: `smoke.spec.ts`**: `openApp(page)` → the empty state is visible (`getByTestId('empty-state')`). This test will fail until Task 11; mark it with `test.fixme` and remove the `fixme` in Task 11.
- [ ] **Step 5:** in `ci.yml` enable the `e2e` job (ubuntu-latest): `npm ci`, `npx playwright install --with-deps chromium webkit`, `npm run e2e`.
- [ ] **Step 6: Verify** `npm run e2e` → 1 test skipped (fixme), 0 failures.
- [ ] **Step 7: Commit** `test(e2e): Playwright harness with in-memory native backend`.

---

### Task 11: App shell — opening files (dialog, drag and drop, recent files, startup), viewer and notifications

**Files:**
- Create: `src/lib/state/app.svelte.ts`, `src/components/{EmptyState,Viewer,DropOverlay,Toasts}.svelte`, `tests/e2e/open.spec.ts`, `tests/e2e/render.spec.ts`
- Modify: `src/App.svelte`, `src/app.css`, `tests/e2e/smoke.spec.ts` (remove `fixme`)

**Interfaces:**
- Consumes: `native`, `TabsState`, `settings`, `toasts`, recents, `renderMarkdown`, `classifyLink`, `resolveLocalImages`, `addCopyButtons`, `t`.
- Produces:

```ts
// app.svelte.ts
export const tabs: TabsState;                 // single instance with real deps
export const recents: { items: RecentEntry[] }; // $state, persisted in store 'recents'
export function openPaths(paths: string[]): Promise<void>; // opens in order; activates the last one; adds to recents; errors → toast with t(`error.${code}`)
export function openFromDialog(): Promise<void>;
export function initApp(): Promise<void>;     // loads settings/recents/session, applies the theme, registers onOpenPaths/onFileDrop, opens takeStartupPaths()
export function removeMissingRecents(): Promise<void>; // uses pathsExist
```

Required `data-testid` attributes: `empty-state`, `viewer`, `drop-overlay`, `toast`, `recent-item`.

- [ ] **Step 1: Failing E2E tests** — `open.spec.ts`:
  - open `/fx/basic.md` via the dialog → `viewer` contains an `h1` with "Título" and `document.title` is `basic.md — Markdown Reader`.
  - `__e2e.drop(['/fx/basic.md', '/fx/code.md'])` → 2 tabs, `code.md` active.
  - start with `startup: ['/fx/headings.md']` → it opens directly.
  - `__e2e.emitOpenPaths(['/fx/basic.md'])` twice → only 1 tab.
  - open `/fx/no-existe.md` via the dialog → a `toast` appears with the `error.NOT_FOUND` text and no tab is created.
  - after opening `basic.md` and closing its tab, the empty state lists `basic.md` as a `recent-item`; clicking it reopens it.

  `render.spec.ts`:
  - `xss.md` → `await page.evaluate(() => window.__pwned)` is `undefined`.
  - click on the `https://example.com` link in `basic.md` → `__e2e.openedUrls` contains the URL and the page did not navigate.
  - click on `[a headings](headings.md#uso)` → `headings.md` opens in another tab and the `#uso` element is visible.
  - in `headings.md`, click on `[ir](#introducción)` → `#introducción` is in the viewport.
  - `images.md` → the local image has `naturalWidth === 1`.
  - `code.md` → 4 `pre` elements, each with a "Copy" button.

- [ ] **Step 2: Run** `npm run e2e` → FAIL.

- [ ] **Step 3: Implement**
  - `Viewer.svelte` (prop `tab: Tab`): `<article class="prose dark:prose-invert …" data-testid="viewer">{@html tab.render.html}</article>`. After every change of `tab.render` (`$effect`): `resolveLocalImages`, `addCopyButtons`, restore `scrollTop`. Click delegation on `a`: `event.target.closest('a')`, `preventDefault`, `classifyLink(href, tab.dir)` → `anchor`: `document.getElementById(id)?.scrollIntoView()`; `external`: `native.openExternal`; `document`: `openPaths([path])` and then scroll to `anchor`; `reveal`: `native.revealInFolder`; `ignore`: nothing. Save `scrollTop` with `tabs.setScroll` (200 ms throttle).
  - Styles in `app.css`: reading variables (`--reader-font`, `--reader-size`, `--reader-line`, `--reader-width`) applied to the `article`; dark Shiki theme: `[data-theme="dark"] .shiki, [data-theme="dark"] .shiki span { color: var(--shiki-dark) !important; background-color: var(--shiki-dark-bg) !important; }`; styles for `.markdown-alert-*` (left border and color per type), `.heading-anchor` (visible only on hover), `.copy-code`.
  - Theme: `settings.value.theme` → `document.documentElement.dataset.theme` (`system` uses `matchMedia('(prefers-color-scheme: dark)')` and listens for changes).
  - `EmptyState.svelte`: an "Open file…" button, the text "Drop a file here", the sorted list of recent files (`sortRecents`), with pin/unpin and remove buttons.
  - `DropOverlay.svelte`: visible while `over(true)`.
  - Window title: `<name> — Markdown Reader`, or `Markdown Reader` with no tabs.
  - `App.svelte`: calls `initApp()` in `onMount`.

- [ ] **Step 4: Run** `npm run e2e && npm test && npm run check` → PASS.
- [ ] **Step 5: Try it in the real app**: `npm run tauri dev`, open a `.md` with a relative image from a folder with spaces and accents; drag two files. It must work the same as in E2E.
- [ ] **Step 6: Commit** `feat: open documents via dialog, drag and drop, recents and startup args`.

---

### Task 12: Tabs, table of contents, status bar, metadata and shortcuts

**Files:**
- Create: `src/lib/commands.ts`, `src/lib/commands.test.ts`, `src/lib/app-commands.ts`, `src/components/{TabBar,Sidebar,StatusBar,MetaCard}.svelte`, `tests/e2e/navigation.spec.ts`
- Modify: `src/App.svelte`, `src/components/Viewer.svelte`

**Interfaces:**
- Produces:

```ts
// commands.ts
export interface Command { id: CommandId; title: () => string; shortcut?: string; run: () => void | Promise<void> }
export type CommandId =
  | 'file.open' | 'file.closeTab' | 'file.reload' | 'file.clearRecents' | 'app.quit'
  | 'view.toggleSidebar' | 'view.find' | 'view.zoomIn' | 'view.zoomOut' | 'view.zoomReset'
  | 'view.themeLight' | 'view.themeDark' | 'view.themeSystem'
  | 'tabs.next' | 'tabs.prev' | 'app.settings' | 'help.shortcuts' | 'help.about';
export function registerCommands(cmds: Command[]): void;
export function runCommand(id: CommandId): Promise<void>;
export function listCommands(): Command[];
export function matchShortcut(e: KeyboardEvent, shortcut: string, isMac: boolean): boolean; // "Mod" = Cmd on mac, Ctrl elsewhere
export function bindShortcuts(target: Window, isMac: boolean): () => void; // ignores events in input, textarea and [contenteditable] except Escape
// app-commands.ts
export function registerAppCommands(): void;
```

Exact shortcuts: `file.open` `Mod+O` · `file.closeTab` `Mod+W` · `file.reload` `Mod+R` and `F5` · `app.quit` `Mod+Q` · `view.toggleSidebar` `Mod+B` · `view.find` `Mod+F` · `view.zoomIn` `Mod+=` · `view.zoomOut` `Mod+-` · `view.zoomReset` `Mod+0` · `tabs.next` `Ctrl+Tab` · `tabs.prev` `Ctrl+Shift+Tab` · `app.settings` `Mod+,` · `help.shortcuts` `F1` and `Shift+?`. Zoom in steps of 0.1 within 0.5–2.0, applied with `native.setZoom` and saved in `settings.zoom`.

`data-testid`: `tab`, `tab-close`, `toc-item`, `toc-item-active`, `status-bar`, `meta-card`.

- [ ] **Step 1: Unit tests** for `matchShortcut`: `Ctrl+O` matches `Mod+O` if `isMac=false`; `Meta+O` matches if `isMac=true`; `Ctrl+Shift+Tab` does not match `Ctrl+Tab`; `Shift+?` matches `key: '?', shiftKey: true`.
- [ ] **Step 2: E2E tests** (`navigation.spec.ts`): with 3 files open, `Ctrl+Tab` moves to the next one and from the last one to the first; `Mod+W` closes the active one; clicking a tab's `×` closes it; in `headings.md` the sidebar lists 3 `toc-item`, clicking the second "Uso" makes `#uso-1` visible, and after scrolling to the end the `toc-item-active` is the last one; `Mod+B` hides/shows the sidebar; the status bar for `basic.md` shows the word count, reading minutes and the encoding; a document with front matter shows `meta-card` with `title` and `tags`.
- [ ] **Step 3: FAIL → Step 4: Implement.** Active TOC section via `IntersectionObserver` on the headings (`rootMargin: '0px 0px -70% 0px'`). Tabs reorderable with native HTML5 drag (`draggable`) → `tabs.move`. A `missing` tab shows a "File not available" notice with a "Remove" button. `MetaCard` shows the `title`, `date`, `tags`, `author` keys if present; the rest in a `<details>`.
- [ ] **Step 5: PASS** (`npm test && npm run e2e && npm run check`) → **Step 6: Commit** `feat: tabs, table of contents, status bar, frontmatter card and shortcuts`.

---

### Task 13: Native menu, About, Settings and Shortcuts dialogs

**Files:**
- Create: `src/lib/menu.ts`, `src/lib/menu.test.ts`, `src/components/{Dialog,AboutDialog,SettingsDialog,ShortcutsDialog}.svelte`, `tests/e2e/settings.spec.ts`
- Modify: `src/lib/native/types.ts`, `tauri.ts`, `fake.ts` (add `setMenu`)

**Interfaces:**
- Produces:

```ts
// menu.ts
export type MenuItemModel =
  | { kind: 'action'; id: string; label: string; accelerator?: string; enabled?: boolean } // id = CommandId or 'recent:<path>'
  | { kind: 'separator' }
  | { kind: 'predefined'; item: 'copy' | 'selectAll' | 'about' | 'hide' | 'quit' }
  | { kind: 'submenu'; label: string; items: MenuItemModel[] };
export interface MenuModel { menus: { label: string; items: MenuItemModel[] }[] }
export function buildMenuModel(recents: RecentEntry[], opts: { isMac: boolean }): MenuModel;
// NativeApi (added)
setMenu(model: MenuModel, onAction: (id: string) => void): Promise<void>;
```

Exact structure: **File** (Open… `Mod+O`, Recent submenu with up to 10 `recent:<path>` entries + separator + "Clear recent files" `file.clearRecents`, Reload, Close tab, separator, Quit — on macOS "Quit" goes in the app menu), **Edit** (predefined Copy and Select all — needed for `Cmd+C` to work on macOS), **View** (Sidebar, Find, Zoom in, Zoom out, Actual size, Theme submenu: Light/Dark/System), **Help** (Keyboard shortcuts, About). On macOS a menu with the app name is prepended (About, Settings… `Mod+,`, separator, Hide, Quit). Accelerators use the Tauri format (`CmdOrCtrl+O`).

- [ ] **Step 1: Unit tests**: `buildMenuModel` with 12 recent files produces a submenu with 10 entries + separator + "Clear recent files"; with 0 recent files the submenu has a single disabled item ("No recent files"); with `isMac: true` the first menu contains `{ kind: 'predefined', item: 'quit' }` and the File menu has no `app.quit`.
- [ ] **Step 2: E2E tests** (`settings.spec.ts`): `Mod+,` opens settings; changing the theme to Dark sets `data-theme="dark"` on `<html>`; changing the font size to 20 changes the computed `font-size` of the `article` to `20px`; enabling "Block remote images" and opening `images.md` → the remote image has no `src`; `page.reload()` keeps the settings; `F1` opens the shortcuts dialog and lists those from `listCommands()`; "About" shows the version from `appInfo()`.
- [ ] **Step 3: FAIL → Step 4: Implement.** `tauri.ts#setMenu` builds with `Menu.new`, `Submenu.new`, `MenuItem.new`, `PredefinedMenuItem.new` from `@tauri-apps/api/menu` and `menu.setAsAppMenu()`; it is rebuilt when the recent files or the language change. `fake.ts#setMenu` stores the model in `window.__e2e.menu`. `Dialog.svelte` uses the native `<dialog>` with `showModal()` (focus trapping and `Escape` for free). The "About" dialog shows: name, version, Tauri version, author "Abel Gallo Ruiz", link to the repository, MIT license.
- [ ] **Step 5: PASS → Step 6: Commit** `feat: native menu, settings, about and shortcuts dialogs`.

---

### Task 14: Find in document (Ctrl/Cmd+F)

**Files:**
- Create: `src/lib/dom/find.ts`, `src/lib/dom/find.test.ts`, `src/components/FindBar.svelte`, `tests/e2e/find.spec.ts`

**Interfaces:**
- Produces:

```ts
export function findRanges(root: HTMLElement, query: string, opts?: { caseSensitive?: boolean }): Range[];
// case- and accent-insensitive by default ("introduccion" finds "Introducción"); ignores text inside .heading-anchor and .copy-code
export function highlightRanges(ranges: Range[], current: number): void; // CSS Custom Highlight API: CSS.highlights 'find' and 'find-current'
export function clearFindHighlights(): void;
```

- [ ] **Step 1: Unit tests** (jsdom; for `highlightRanges` only check that it does not throw if `CSS.highlights` does not exist): `findRanges` over `<p>Introducción y <b>uso</b> del uso</p>` with `'uso'` → 2 ranges; `'introduccion'` → 1; with `caseSensitive: true` and `'Uso'` → 0; text split across nodes (`<p>ho<b>la</b></p>`, `'hola'`) → 1 range; empty query → 0.
- [ ] **Step 2: E2E test**: `Mod+F` shows the bar with focus in the input; typing "Uso" in `headings.md` shows "1/2"; `Enter` → "2/2" and the result is in the viewport; `Shift+Enter` goes back to "1/2"; `Escape` closes it and clears the highlights.
- [ ] **Step 3: FAIL → Step 4: Implement.** Accent-insensitive comparison: normalize with `normalize('NFD').replace(/\p{Diacritic}/gu, '')`, building an index map from the normalized text to the original. Styles: `::highlight(find) { background: #fde68a; } ::highlight(find-current) { background: #f59e0b; }`. If `CSS.highlights` does not exist, the bar still counts and scrolls, without highlighting.
- [ ] **Step 5: PASS → Step 6: Commit** `feat: find in document with CSS highlights`.

---

### Task 15: Auto-reload, session restore and window state

**Files:**
- Modify: `src/lib/state/app.svelte.ts`, `src/components/Viewer.svelte`, `src/components/TabBar.svelte`
- Create: `tests/e2e/live-reload.spec.ts`

**Interfaces:**
- Consumes: `native.watchFile`, `TabsState.reload`, `markMissing`, `SessionSnapshot`.
- Produces: every open tab has exactly one active watcher (cancelled on close); the session is saved in store `session` on every tab change (500 ms debounce).

- [ ] **Step 1: E2E tests**: open `basic.md`, `__e2e.writeFile('/fx/basic.md', '# Cambiado')` → the `h1` changes to "Cambiado" without losing the tab; scrolled halfway through `headings.md`, a modification keeps the `scrollTop` (±5 px); `__e2e.deleteFile` → the tab shows "File not available"; recreating the file with `writeFile` → the tab goes back to `ready` with the new content; with `restoreSession: true`, reloading the page reopens the same tabs in the same order with the same active tab; with `restoreSession: false` it starts empty.
- [ ] **Step 2: FAIL → Step 3: Implement.** On `'removed'` → `markMissing`, but keep the folder watcher: a later `'modified'` on the same path calls `reload`. When restoring the session, paths that no longer exist are silently skipped and removed from recent files. `tauri-plugin-window-state` already saves size and position (registered in Task 4); verify in the real app that they are restored on reopening.
- [ ] **Step 4: Try it in the real app**: open a `.md` in the app and in VS Code; save in VS Code → the app updates in < 1 s. Repeat with Notepad.
- [ ] **Step 5: PASS → Step 6: Commit** `feat: live reload, session restore and window state`.

---

### Task 16: Documentation, packaging and Phase 1 wrap-up

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `package.json` (version), `readme_assets/` (new screenshot)
- Create: `docs/QA-CHECKLIST.md`

- [x] **Step 1: New README** (English): includes the app description, screenshot, feature list, Releases link, development requirements and commands, project structure, `legacy/` reference, and license. Updated for 2.0.0 in Task 13.
- [x] **Step 2: `docs/QA-CHECKLIST.md`**: includes the requested Windows/macOS/Linux manual checks; updated with Phase 2 release checks in Task 13.
- [x] **Step 3: Full verification**

Run: `npm run check && npm test && npm run e2e && cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings && npm run tauri build`
Expected: everything PASSES and there is an installer in `src-tauri/target/release/bundle/`. Verified by successful CI run `41700246911` on commit `8255df6`, including signed Windows Tauri bundles; local `npm run check` and `npm run build` also pass at version `2.0.0`.

- [ ] **Step 4: Run the manual QA at least on Windows** and record the results in the phase report. Partial user-confirmed Windows results are recorded in `docs/QA-CHECKLIST.md`; outstanding checks remain unchecked there and must be run before calling this gate complete.
- [x] **Step 5: Commit and tag (local)** — Phase 1 documentation/version commit and `v2.0.0-beta.1` baseline tag are present locally; that beta was never published. The first-public-release target is now `1.0.0` (see Phase 2 plan). No release tag has been pushed.

```bash
git add -A
git commit -m "docs: README, QA checklist and v2.0.0-beta.1"
git tag v2.0.0-beta.1
```

(The tag stays local: pushing tags requires the owner's explicit approval. Pushing the tag triggers `release.yml` and creates a draft release; publishing it is the repo owner's decision.)
