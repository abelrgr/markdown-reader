---
title: Diagrams and Charts
date: 2026-11-02
tags: [mermaid, charts, diagrams]
---

# Diagrams and Charts

## Flowchart

```mermaid
flowchart TD
    A[Open a Markdown file] --> B{File is valid?}
    B -- yes --> C[Render safely]
    B -- no --> D[Show a localized error]
    C --> E[Build table of contents]
    E --> F[Read]
```

## Sequence diagram

```mermaid
sequenceDiagram
    actor Reader
    participant App as Markdown Reader
    participant OS as Operating System
    Reader->>App: Open report.md
    App->>OS: Read file by path
    OS-->>App: UTF-8 text and metadata
    App-->>Reader: Sanitized preview
```

## Pie chart

```mermaid
pie showData
    title Sample reading time
    "Markdown" : 45
    "Code" : 30
    "Math" : 15
    "Diagrams" : 10
```

## XY chart

```mermaid
xychart-beta
    title "Pages read per day"
    x-axis [Mon, Tue, Wed, Thu, Fri]
    y-axis "Pages" 0 --> 50
    bar [12, 28, 21, 42, 35]
    line [10, 20, 30, 40, 50]
```

## Invalid diagram fallback

This intentionally malformed block checks that one diagram error does not break the rest of the document:

```mermaid
this is not a valid diagram !!!
```

## Ordinary code fence

This should remain a regular code block, not a diagram:

```text
diagram source is only special when the language is mermaid
```

Continue to [the code samples](04-code-and-data.md#typescript).
