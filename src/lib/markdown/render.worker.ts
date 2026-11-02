import { renderMarkdownCore } from './render-core';
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

interface WorkerContext {
  onmessage: ((event: MessageEvent<RenderRequest>) => void) | null;
  postMessage: (message: RenderResponse) => void;
}

const context = globalThis as unknown as WorkerContext;

context.onmessage = (event): void => {
  const { id, source } = event.data;
  void renderMarkdownCore(source).then(
    (result) => context.postMessage({ id, result }),
    (error: unknown) =>
      context.postMessage({
        id,
        error: error instanceof Error ? error.message : String(error),
      }),
  );
};
