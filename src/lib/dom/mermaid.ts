type MermaidTheme = 'light' | 'dark';

let renderQueue = Promise.resolve();
let renderId = 0;
const generations = new WeakMap<HTMLElement, number>();

async function renderBlocks(
  root: HTMLElement,
  theme: MermaidTheme,
  errorLabel: string,
): Promise<void> {
  const blocks = [...root.querySelectorAll<HTMLElement>('.mermaid-block[data-source]')];
  if (!blocks.length) return;

  const generation = (generations.get(root) ?? 0) + 1;
  generations.set(root, generation);
  const { default: mermaid } = await import('mermaid');
  if (generations.get(root) !== generation) return;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: theme === 'dark' ? 'dark' : 'default',
  });

  for (const block of blocks) {
    if (generations.get(root) !== generation) return;
    const source = block.dataset.source ?? '';
    block.classList.remove('mermaid-invalid');
    delete block.dataset.testid;
    block.replaceChildren();
    try {
      const { svg } = await mermaid.render(`markdown-reader-mermaid-${++renderId}`, source);
      if (generations.get(root) !== generation) return;
      block.innerHTML = svg;
    } catch {
      if (generations.get(root) !== generation) return;
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = source;
      const message = document.createElement('span');
      message.className = 'mermaid-error-message';
      message.textContent = errorLabel;
      pre.append(code, message);
      block.classList.add('mermaid-invalid');
      block.dataset.testid = 'mermaid-error';
      block.replaceChildren(pre);
    }
  }
}

export function renderMermaidBlocks(
  root: HTMLElement,
  theme: MermaidTheme,
  errorLabel: string,
): Promise<void> {
  const task = renderQueue.then(() => renderBlocks(root, theme, errorLabel));
  renderQueue = task.catch(() => {});
  return task;
}
