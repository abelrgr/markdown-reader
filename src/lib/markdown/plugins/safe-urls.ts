import type { Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

const allowedProtocols: Readonly<Record<string, readonly string[]>> = {
  cite: ['http', 'https'],
  href: ['http', 'https', 'irc', 'ircs', 'mailto', 'xmpp'],
  longDesc: ['http', 'https'],
  src: ['http', 'https'],
};

function isSafeUrl(property: string, value: string): boolean {
  const protocols = allowedProtocols[property];
  if (!protocols?.length) return true;
  const colon = value.indexOf(':');
  const questionMark = value.indexOf('?');
  const numberSign = value.indexOf('#');
  const slash = value.indexOf('/');
  if (
    colon < 0 ||
    (slash > -1 && colon > slash) ||
    (questionMark > -1 && colon > questionMark) ||
    (numberSign > -1 && colon > numberSign)
  ) {
    return true;
  }
  return protocols.some((protocol) => colon === protocol.length && value.startsWith(protocol));
}

export const rehypeSafeMarkdownUrls: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'element', (node) => {
    for (const property of Object.keys(allowedProtocols)) {
      const value = node.properties[property];
      if (typeof value === 'string' && !isSafeUrl(property, value)) {
        delete node.properties[property];
      }
    }
  });
};
