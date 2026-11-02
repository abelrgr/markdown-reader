import { isMarkdownPath, joinPath } from '../fs/paths';

export type LinkAction =
  | { kind: 'anchor'; id: string }
  | { kind: 'external'; url: string }
  | { kind: 'document'; path: string; anchor: string | null }
  | { kind: 'reveal'; path: string }
  | { kind: 'ignore' };

const EXTERNAL_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function classifyLink(href: string, docDir: string): LinkAction {
  if (!href) return { kind: 'ignore' };
  if (href.startsWith('#')) return { kind: 'anchor', id: decode(href.slice(1)) };

  const scheme = /^([a-z][a-z0-9+.-]*:)/i.exec(href)?.[1]?.toLowerCase();
  if (scheme) {
    return EXTERNAL_SCHEMES.has(scheme) ? { kind: 'external', url: href } : { kind: 'ignore' };
  }
  if (href.startsWith('//')) return { kind: 'ignore' };

  const hash = href.indexOf('#');
  const rawPath = hash < 0 ? href : href.slice(0, hash);
  const anchor = hash < 0 ? null : decode(href.slice(hash + 1));
  if (!rawPath) return anchor === null ? { kind: 'ignore' } : { kind: 'anchor', id: anchor };

  const path = joinPath(docDir, rawPath);
  return isMarkdownPath(path) ? { kind: 'document', path, anchor } : { kind: 'reveal', path };
}
