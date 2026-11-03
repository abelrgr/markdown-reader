import { IS_WINDOWS, samePath } from '../fs/paths';
import { NativeError, type OpenedDocument } from '../native/types';
import type { RenderResult } from '../markdown/types';

export type TabStatus = 'ready' | 'missing';
export interface Tab {
  id: string;
  path: string;
  name: string;
  dir: string;
  content: string;
  render: RenderResult;
  scrollTop: number;
  status: TabStatus;
  encoding: string;
}
export interface TabsDeps {
  openDocument: (path: string) => Promise<OpenedDocument>;
  render: (source: string) => Promise<RenderResult>;
  caseInsensitive?: boolean;
}

export class TabsState {
  tabs = $state<Tab[]>([]);
  activeId = $state<string | null>(null);
  private readonly pendingOpens: { path: string; promise: Promise<Tab> }[] = [];

  constructor(private readonly deps: TabsDeps) {}

  get active(): Tab | null {
    return this.tabs.find((tab) => tab.id === this.activeId) ?? null;
  }

  async open(path: string, opts: { scrollTop?: number; activate?: boolean } = {}): Promise<Tab> {
    const existing = this.tabs.find((tab) =>
      samePath(tab.path, path, this.deps.caseInsensitive ?? IS_WINDOWS),
    );
    if (existing) {
      if (opts.activate !== false) this.activeId = existing.id;
      return existing;
    }
    const pending = this.pendingOpens.find((entry) =>
      samePath(entry.path, path, this.deps.caseInsensitive ?? IS_WINDOWS),
    );
    if (pending) {
      const tab = await pending.promise;
      if (opts.activate !== false) this.activeId = tab.id;
      return tab;
    }
    const pendingOpen = { path, promise: this.openNew(path, opts.scrollTop ?? 0) };
    this.pendingOpens.push(pendingOpen);
    try {
      const tab = await pendingOpen.promise;
      if (opts.activate !== false) this.activeId = tab.id;
      return tab;
    } finally {
      this.pendingOpens.splice(this.pendingOpens.indexOf(pendingOpen), 1);
    }
  }

  async openVirtual(name: string, content: string): Promise<Tab> {
    const rendered = await this.deps.render(content);
    const path = `virtual:${crypto.randomUUID()}`;
    const tab: Tab = {
      id: crypto.randomUUID(),
      path,
      name,
      dir: '',
      content,
      render: rendered,
      scrollTop: 0,
      status: 'ready',
      encoding: 'UTF-8',
    };
    this.tabs = [...this.tabs, tab];
    this.activeId = tab.id;
    return tab;
  }

  private async openNew(path: string, scrollTop: number): Promise<Tab> {
    const document = await this.deps.openDocument(path);
    const rendered = await this.deps.render(document.content);
    const tab: Tab = {
      id: crypto.randomUUID(),
      ...document,
      render: rendered,
      scrollTop: Math.max(0, scrollTop),
      status: 'ready',
    };
    this.tabs = [...this.tabs, tab];
    return tab;
  }

  close(id: string): void {
    const index = this.tabs.findIndex((tab) => tab.id === id);
    if (index < 0) return;
    const wasActive = this.activeId === id;
    this.tabs = this.tabs.filter((tab) => tab.id !== id);
    if (!wasActive) return;
    this.activeId = this.tabs[index]?.id ?? this.tabs[index - 1]?.id ?? null;
  }

  activate(id: string): void {
    if (this.tabs.some((tab) => tab.id === id)) this.activeId = id;
  }

  move(fromIndex: number, toIndex: number): void {
    if (
      fromIndex < 0 ||
      fromIndex >= this.tabs.length ||
      toIndex < 0 ||
      toIndex >= this.tabs.length ||
      fromIndex === toIndex
    )
      return;
    const next = [...this.tabs];
    const [tab] = next.splice(fromIndex, 1);
    if (tab) next.splice(toIndex, 0, tab);
    this.tabs = next;
  }

  next(): void {
    this.cycle(1);
  }
  prev(): void {
    this.cycle(-1);
  }

  private cycle(direction: 1 | -1): void {
    if (this.tabs.length === 0) return;
    const index = this.tabs.findIndex((tab) => tab.id === this.activeId);
    const next = (index + direction + this.tabs.length) % this.tabs.length;
    this.activeId = this.tabs[next]?.id ?? null;
  }

  async reload(id: string): Promise<void> {
    const tab = this.tabs.find((candidate) => candidate.id === id);
    if (!tab) return;
    const scrollTop = tab.scrollTop;
    try {
      const document = await this.deps.openDocument(tab.path);
      const rendered = await this.deps.render(document.content);
      Object.assign(tab, document, { render: rendered, scrollTop, status: 'ready' as const });
    } catch (error: unknown) {
      if (
        error instanceof NativeError ||
        (typeof error === 'object' && error !== null && 'code' in error)
      ) {
        if (error.code !== 'NOT_FOUND') throw error;
        tab.status = 'missing';
        return;
      }
      throw error;
    }
  }

  markMissing(id: string): void {
    const tab = this.tabs.find((candidate) => candidate.id === id);
    if (tab) tab.status = 'missing';
  }

  setScroll(id: string, top: number): void {
    const tab = this.tabs.find((candidate) => candidate.id === id);
    if (tab) tab.scrollTop = Math.max(0, top);
  }
}
