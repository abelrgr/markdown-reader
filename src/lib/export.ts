export interface StandaloneHtmlOptions {
  title: string;
  bodyHtml: string;
  css: string;
  lang: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] ?? character;
  });
}

export function buildStandaloneHtml({ title, bodyHtml, css, lang }: StandaloneHtmlOptions): string {
  const safeBody = bodyHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  const safeCss = css.replace(/<\/style/gi, '<\\/style');
  return `<!doctype html>\n<html lang="${escapeHtml(lang)}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escapeHtml(title)}</title>\n<style>${safeCss}</style>\n</head>\n<body>\n<article class="prose">${safeBody}</article>\n</body>\n</html>`;
}

export function collectCss(doc: Document): string {
  const chunks: string[] = [];
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (rules) chunks.push(Array.from(rules, (rule) => rule.cssText).join('\n'));
    } catch {
      // Cross-origin stylesheets are inaccessible; continue collecting local rules.
    }
  }
  return chunks.join('\n');
}

function base64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export async function inlineImages(
  root: HTMLElement,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(async (image) => {
      const source = image.getAttribute('src');
      if (!source || !/^(?:asset:\/\/|http:\/\/asset\.localhost)/i.test(source)) return;
      try {
        const response = await fetchFn(source);
        if (!response.ok) return;
        const blob = await response.blob();
        const encoded = base64(new Uint8Array(await blob.arrayBuffer()));
        image.src = `data:${blob.type || 'application/octet-stream'};base64,${encoded}`;
      } catch {
        // Keep the original URL when the asset cannot be read.
      }
    }),
  );
}
