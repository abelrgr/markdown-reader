export interface TocItem {
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  id: string;
}

export interface DocStats {
  words: number;
  readingMinutes: number;
}

export interface RenderResult {
  html: string;
  toc: TocItem[];
  frontmatter: Record<string, unknown> | null;
  stats: DocStats;
}
