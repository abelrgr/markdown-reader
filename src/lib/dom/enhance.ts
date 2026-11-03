import { joinPath } from '../fs/paths';

export function resolveLocalImages(
  root: HTMLElement,
  docDir: string,
  toAssetUrl: (path: string) => string,
  opts: { blockRemote: boolean; blockedLabel: string },
): void {
  for (const image of root.querySelectorAll('img')) {
    const localSrc = image.getAttribute('data-local-src');
    if (localSrc !== null) {
      const path = joinPath(docDir, localSrc);
      image.setAttribute('data-local-path', path);
      image.setAttribute('src', toAssetUrl(path));
      image.removeAttribute('data-local-src');
      continue;
    }

    const src = image.getAttribute('src');
    if (opts.blockRemote && src && /^(?:https?:)?\/\//i.test(src)) {
      image.dataset.blockedSrc = src;
      image.removeAttribute('src');
      image.setAttribute('alt', `${opts.blockedLabel}: ${image.getAttribute('alt') ?? ''}`);
    }
  }
}

export function addCopyButtons(root: HTMLElement, labels: { copy: string; copied: string }): void {
  for (const pre of root.querySelectorAll('pre')) {
    if (pre.querySelector('button.copy-code')) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code';
    button.textContent = labels.copy;
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(pre.textContent ?? '');
      button.textContent = labels.copied;
      window.setTimeout(() => {
        button.textContent = labels.copy;
      }, 1500);
    });
    pre.append(button);
  }
}
