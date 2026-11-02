export interface Toast { id: number; kind: 'info' | 'error'; message: string }

let nextId = 0;
export const toasts = {
  items: $state<Toast[]>([]),
  push(kind: Toast['kind'], message: string, ms = 5000): void {
    const id = ++nextId;
    this.items.push({ id, kind, message });
    if (ms > 0) globalThis.setTimeout(() => this.dismiss(id), ms);
  },
  dismiss(id: number): void {
    this.items = this.items.filter((item) => item.id !== id);
  },
};
