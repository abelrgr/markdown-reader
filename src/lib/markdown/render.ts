import type { Root as MdastRoot } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { VFile } from 'vfile';
import { visit } from 'unist-util-visit';
import { getHighlighter, SHIKI_LANGS } from './highlighter';
import { createProcessor } from './pipeline';
import { computeStats } from './stats';
import type { RenderResult, TocItem } from './types';

const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
  js: 'javascript',
  ts: 'typescript',
  sh: 'shellscript',
  yml: 'yaml',
  py: 'python',
};

export async function renderMarkdownCore(source: string): Promise<RenderResult> {
  const processor = createProcessor(await getHighlighter());
  const mdast = processor.parse(source) as MdastRoot;
  const highlighter = await getHighlighter();
  const loaded = new Set(highlighter.getLoadedLanguages());
  visit(mdast, 'code', (node) => {
    if (!node.lang) return;
    const language = LANGUAGE_ALIASES[node.lang.toLowerCase()] ?? node.lang.toLowerCase();
    node.lang = loaded.has(language) ? language : 'text';
  });
  const file = new VFile({ value: source });
  const tree = await processor.run(mdast, file);
  const html = processor.stringify(tree);
  const data = file.data as { frontmatter?: Record<string, unknown> | null; toc?: TocItem[] };
  return {
    html,
    toc: data.toc ?? [],
    frontmatter: data.frontmatter ?? null,
    stats: computeStats(toString(mdast)),
  };
}

export const renderMarkdown = renderMarkdownCore;
