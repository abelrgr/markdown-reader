# Implementation prompt

Prompt for an AI agent to implement the full rewrite by following the plans in `docs/superpowers/plans/`.

## Before you run it

- Node.js 24 and Rust (`rustup`).
- Tauri prerequisites for Windows: Visual Studio Build Tools with "Desktop development with C++" and WebView2 (already included in Windows 11). Guide: https://v2.tauri.app/start/prerequisites/
- For phase 3 (mobile): Android Studio with SDK, NDK and Java 17.
- SSH access to `git@github.com:abelrgr/markdown-reader.git` (task 1 force-pushes the new history after your approval).

## Recommendations

- One new session per phase. For phase 2 or 3, use the same prompt and replace the last line with:
  `Start with Phase 2, Task 1. The previous phases are already complete on master.`
- Use a capable model (for example Opus): there are 39 tasks that depend on each other.
- At every stop, read the report and try the app yourself before saying OK.
- Task 1 restarts the Git history. The old history is saved to `../markdown-reader-v1-backup.bundle`; keep that file somewhere safe.

## Prompt

```text
You are going to rewrite the Markdown Reader app in this repository from scratch by following the plans that already exist. Do not improvise the design: it is decided in the documents.

## Documents (read them in full before starting)
1. docs/REFACTOR-PLAN.md: overall specification (what the app does and why).
2. docs/superpowers/plans/2026-11-02-phase-0-1-foundation-and-mvp.md: Phase 0 + 1 (tasks 1–16).
3. docs/superpowers/plans/2026-11-02-phase-2-v1-1.md: Phase 2 (tasks 1–13).
4. docs/superpowers/plans/2026-11-02-phase-3-v2.md: Phase 3 (tasks 1–10).

## How to work
- Use the superpowers:subagent-driven-development skill. One subagent implements each task and another reviews it against the plan and the specification before moving on to the next one.
- Phase 0 + 1, Task 1 backs up the old history to a bundle and restarts the Git repository. After that, work directly on `master` of the new repository.
- Run the phases in order and, inside each phase, the tasks in order. Tick each checkbox in the plan as you complete it.
- Each task follows its steps: failing tests first, then code, then verification, then the commit with the given message.
- Follow the "Global Constraints" exactly, along with the names, signatures and types in the "Interfaces" blocks. Later tasks depend on those names.
- If a command, flag, package or permission does not exist or was renamed in the current version, check the official documentation, make the smallest adaptation and explain it in the commit message. If the change alters an interface, update the plan too.
- Do not move on if a test or verification command fails. Find the root cause; do not disable or delete tests to make them pass.
- After Task 1, do not modify anything inside `legacy/`.
- Everything you write (code, comments, commit messages, docs, README) is in English. The app UI is bilingual: English by default, Spanish when the OS language is Spanish.

## Stop and ask me before
- Deleting the local `.git` folder and force-pushing to GitHub (Task 1, steps 6 and 9). Show me the backup bundle path and size first.
- Any other `git push`, pushing tags, publishing releases or opening PRs (local tags are fine).
- Any step that needs secrets, signing keys, certificates, paid accounts (Apple, Windows) or an AI API key. Never invent secrets or write them to files.
- Deleting anything the plan does not mention.
- Departing from the plan in anything beyond a minor tooling adjustment.

## Manual steps
When the plan asks for a test in the real app (`npm run tauri dev`, manual QA, Android test), get the app ready, tell me what to check in a short list, and wait for my answer.

## At the end of each phase
1. Run the full verification from the phase's last task and confirm everything passes.
2. Give me a short report:
   - what is done;
   - which tests run;
   - what changed from the plan and why;
   - which manual steps are still pending.
3. Wait for my OK before starting the next phase.

Start now with Phase 0 + 1, Task 1.
```
