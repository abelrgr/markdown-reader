---
title: Links, Images, and Safety
date: 2026-11-02
tags: [security, links, images, privacy]
---

# Links, Images, and Safety

## Relative links

- [Markdown basics](01-markdown-basics.md#introduction)
- [Equations](02-math-and-science.md#equations)
- [Flowchart](03-diagrams-and-charts.md#flowchart)
- [Code samples](04-code-and-data.md#typescript)

## Local and remote images

The path contains both a folder with spaces and an image filename with an accent:

![Local café icon](assets/reader%20caf%C3%A9.png)

Remote image test: ![Remote image](https://example.com/reader-privacy-test.png)

## Safe link handling

- [Open the example website](https://example.com)
- [Email link](mailto:reader@example.com)
- [Internal section](#sanitization-check)
- [JavaScript URL should be removed or ignored](javascript:alert('unsafe'))
- [Local executable must never run](../setup.exe)

## Sanitization check

The next markup is intentionally unsafe. It must not run script or event-handler code:

```html
<img src="x" onerror="window.__samplePwned = true">
<script>window.__samplePwned = true</script>
```

Raw HTML test follows:

<img src="missing-image" onerror="window.__samplePwned = true">
<script>window.__samplePwned = true</script>

The reader should display safe content and continue working normally.
