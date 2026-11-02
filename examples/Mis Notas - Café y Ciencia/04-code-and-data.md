---
title: Code and Data
date: 2026-11-02
tags: [code, shiki, yaml, json, sql]
---

# Code and Data

## TypeScript

```ts
type Document = { path: string; encoding: 'utf-8' | 'utf-16le' };

export function displayName(document: Document): string {
  return document.path.split(/[\\/]/).at(-1) ?? document.path;
}
```

## Shell (`sh` alias)

```sh
npm run check
npm test
npm run e2e
```

## YAML (`yml` alias)

```yml
reader:
  theme: system
  restoreSession: true
  recentFiles: 20
```

## Rust

```rust
fn main() {
    let accented = "Introducción — café";
    println!("{accented}");
}
```

## SQL

```sql
SELECT path, modified_ms
FROM recent_documents
WHERE pinned = TRUE
ORDER BY opened_at DESC;
```

## Unknown language fallback

The following unknown language must still render as readable plain code:

```not-a-real-language
unknown_language_fallback();
```

## No language specified

```
Plain code without a language label.
```

The copy button should copy only the code, not its button label.
