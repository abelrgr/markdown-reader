export interface Section {
  heading: string;
  level: number;
  text: string;
}

export function splitSections(markdown: string): Section[] {
  const sections: Section[] = [];
  let heading = '';
  let level = 0;
  let lines: string[] = [];
  let fence: string | null = null;
  const flush = (): void => {
    sections.push({ heading, level, text: lines.join('\n').trim() });
    lines = [];
  };
  for (const line of markdown.split(/\r?\n/)) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1]![0]!;
      else if (marker[1]![0] === fence) fence = null;
      lines.push(line);
      continue;
    }
    const match = !fence && line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (match) {
      flush();
      heading = match[2]!;
      level = match[1]!.length;
    } else lines.push(line);
  }
  flush();
  return sections;
}

const words = (value: string): Set<string> =>
  new Set(
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g) ?? [],
  );

export function selectContext(
  sections: Section[],
  question: string | null,
  maxChars = 48_000,
): Section[] {
  if (sections.reduce((sum, section) => sum + section.text.length, 0) <= maxChars) return sections;
  const selected: { section: Section; index: number; score: number }[] = [];
  const query = question ? words(question) : new Set<string>();
  sections.forEach((section, index) => {
    const searchable = words(`${section.heading} ${section.text}`);
    const score = [...query].filter((word) => searchable.has(word)).length;
    if (!question || score > 0) selected.push({ section, index, score });
  });
  selected.sort((a, b) => (question ? b.score - a.score || a.index - b.index : a.index - b.index));
  const result: typeof selected = [];
  let size = 0;
  for (const candidate of selected) {
    const cost = candidate.section.text.length;
    if (cost > maxChars - size) continue;
    result.push(candidate);
    size += cost;
  }
  return result.sort((a, b) => a.index - b.index).map(({ section }) => section);
}
