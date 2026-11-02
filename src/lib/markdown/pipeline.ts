import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeStringify from 'rehype-stringify';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import type { HighlighterCore } from 'shiki';
import { remarkFrontmatterData } from './plugins/frontmatter';
import { rehypeAlerts } from './plugins/alerts';
import { rehypeCollectToc } from './plugins/toc';
import { rehypeMarkLocalImages } from './plugins/local-images';
import { rehypeFixClobberedFragments } from './plugins/fix-clobbered-fragments';

export function createProcessor(highlighter: HighlighterCore) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkFrontmatterData)
    .use(remarkRehype, { allowDangerousHtml: true, clobberPrefix: '' })
    .use(rehypeRaw)
    .use(rehypeSanitize, { ...defaultSchema, clobberPrefix: 'user-content-' })
    .use(rehypeFixClobberedFragments)
    .use(rehypeAlerts)
    .use(rehypeSlug)
    .use(rehypeCollectToc)
    .use(rehypeAutolinkHeadings, {
      behavior: 'append',
      properties: { className: ['heading-anchor'], ariaHidden: 'true', tabIndex: -1 },
      content: { type: 'text', value: '#' },
    })
    .use(() =>
      rehypeShikiFromHighlighter(highlighter, {
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: 'light',
        fallbackLanguage: 'text',
        // Unknown languages are normalized to plain text in render.ts before Shiki runs.
      }),
    )
    .use(rehypeMarkLocalImages)
    .use(rehypeStringify);
}
