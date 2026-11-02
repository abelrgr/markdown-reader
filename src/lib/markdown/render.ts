import type { RenderResult } from './types';

interface RenderRequest {
  id: number;
  source: string;
}

interface RenderResponse {
  id: number;
  result?: RenderResult;
  error?: string;
}

interface PendingRender {
  resolve: (result: RenderResult) => void;
  reject: (error: Error) => void;
}

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, PendingRender>();

function failPending(message: string): void {
  const activeWorker = worker;
  worker = null;
  activeWorker?.terminate();
  for (const request of pending.values()) request.reject(new Error(message));
  pending.clear();
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' });
  worker.addEventListener('message', (event: MessageEvent<RenderResponse>) => {
    const request = pending.get(event.data.id);
    if (!request) return;
    pending.delete(event.data.id);
    if (event.data.error !== undefined) request.reject(new Error(event.data.error));
    else if (event.data.result) request.resolve(event.data.result);
    else request.reject(new Error('Markdown renderer returned an empty response'));
  });
  worker.addEventListener('error', (event) => {
    event.preventDefault();
    const location = event.filename ? ` at ${event.filename}:${event.lineno}:${event.colno}` : '';
    failPending(`${event.message || 'Markdown renderer worker failed'}${location}`);
  });
  worker.addEventListener('messageerror', () => {
    failPending('Could not read the Markdown renderer response');
  });
  return worker;
}

export async function renderMarkdown(source: string): Promise<RenderResult> {
  if (typeof Worker === 'undefined') {
    const { renderMarkdownCore } = await import('./render-core');
    return renderMarkdownCore(source);
  }

  const currentWorker = getWorker();
  const id = ++nextId;
  return new Promise<RenderResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      currentWorker.postMessage({ id, source } satisfies RenderRequest);
    } catch (error: unknown) {
      pending.delete(id);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
