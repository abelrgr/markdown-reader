---
title: Markdown Reader Lab
date: 2026-11-02
author: Markdown Reader QA
tags: [markdown, gfm, accessibility, reader]
---

# Markdown Reader Lab

Welcome to the feature tour. This document tests **GitHub Flavored Markdown**, navigation, metadata, images, and status-bar statistics. Accented sample words: café, jalapeño, and naïve.

## Introduction

The table of contents should include this heading and the duplicate heading below. Select a heading to test navigation and copy its link.

### Repeated heading

This first repeated heading checks that generated anchors remain unique.

### Repeated heading

This second repeated heading should receive a distinct anchor, such as `repeated-heading-1`.

## Tables and task lists

| Feature | Expected result | Tested |
| --- | --- | --- |
| GFM table | Rows and columns render | [x] |
| Task list | Checkboxes are disabled | [x] |
| Strikethrough | ~~not current~~ | [ ] |
| Autolink | https://example.com | [ ] |

- [x] Open this document from the file dialog.
- [ ] Pin it in the recent-files list.
- [ ] Close and reopen it from recents.

## Alerts

> [!NOTE]
> This note checks GitHub-style alert rendering.

> [!TIP]
> Try keyboard navigation after opening the app.

> [!WARNING]
> Remote images may be blocked by the privacy setting.

## Images and links

Local image with a space and an accented filename:

![Local Markdown Reader icon](assets/reader%20caf%C3%A9.png)

Remote image (toggle “Block remote images” in Settings to test privacy behavior):

![Remote placeholder](https://example.com/markdown-reader-remote-test.png)

Open [the math examples](02-math-and-science.md#equations) or [the diagrams](03-diagrams-and-charts.md#flowchart).

External link: [Example domain](https://example.com).

Footnote reference[^reader-note].

[^reader-note]: Footnote links should point to matching IDs and remain safe.
