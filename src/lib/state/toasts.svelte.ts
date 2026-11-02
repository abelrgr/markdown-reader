export interface Toast { id: number; kind: 'info' | 'error'; message: string }

let nextId = 0;
let items = $state<Toast[]>([]);
export const toasts = {
  get items(): Toast[] { return items; },
  push(kind: Toast['kind'], message: string, ms = 5000): void {
    const id = ++nextId;
    items.push({ id, kind, message });
    if (ms > 0) globalThis.setTimeout(() => this.dismiss(id), ms);
  },
  dismiss(id: number): void {
    items = items.filter((item) => item.id !== id);
  },
};
