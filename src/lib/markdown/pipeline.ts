import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import rehypeKatex from 'rehype-katex';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import type { HighlighterCore } from 'shiki';
import { remarkFrontmatterData } from './plugins/frontmatter';
import { rehypeAlerts } from './plugins/alerts';
import { rehypeHeadings } from './plugins/toc';
import { rehypeMarkLocalImages } from './plugins/local-images';
import { rehypeFixClobberedFragments } from './plugins/fix-clobbered-fragments';
import { rehypeSafeMarkdownUrls } from './plugins/safe-urls';
import { rehypeMermaidBlocks } from './plugins/mermaid';
import { rehypeSourceLines } from './plugins/source-lines';

export function createProcessor(
  highlighter: HighlighterCore | null,
  parseRawHtml = true,
  processAlerts = true,
) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkFrontmatterData)
    .use(remarkRehype, { allowDangerousHtml: true, clobberPrefix: '' });
  if (parseRawHtml) {
    processor
      .use(rehypeRaw)
      .use(rehypeSanitize, { ...defaultSchema, clobberPrefix: 'user-content-' })
      .use(rehypeFixClobberedFragments);
  } else processor.use(rehypeSafeMarkdownUrls);
  // rehype-katex handles invalid formulas as `.katex-error` internally (throwOnError: false).
  processor.use(rehypeKatex, { strict: 'ignore' });
  if (processAlerts) processor.use(rehypeAlerts);
  processor.use(rehypeHeadings);
  processor.use(rehypeMermaidBlocks);
  processor.use(rehypeSourceLines);
  if (highlighter) {
    processor.use(() =>
      rehypeShikiFromHighlighter(highlighter, {
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: 'light',
        fallbackLanguage: 'text',
        // Unknown languages are normalized to plain text in render.ts before Shiki runs.
      }),
    );
  }
  return processor.use(rehypeMarkLocalImages).use(rehypeStringify);
}
