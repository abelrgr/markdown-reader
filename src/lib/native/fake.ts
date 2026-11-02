import { basename, dirname, isMarkdownPath, normalizePath } from '../fs/paths';
import {
  NativeError,
  type FileChange,
  type NativeApi,
  type OpenedDocument,
  type Unlisten,
} from './types';
import type { MenuModel } from '../menu';

const fixtureFiles = import.meta.glob('/tests/e2e/fixtures/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const files = new Map<string, { content: string; modifiedMs: number }>();
for (const [source, content] of Object.entries(fixtureFiles)) {
  const marker = '/tests/e2e/fixtures/';
  files.set(`/fx/${source.slice(source.indexOf(marker) + marker.length)}`, {
    content,
    modifiedMs: Date.now(),
  });
}

type E2eApi = {
  setDialogResult: (paths: string[]) => void;
  hasFile: (path: string) => boolean;
  drop: (paths: string[]) => void;
  dragOver: (inside: boolean) => void;
  emitOpenPaths: (paths: string[]) => void;
  writeFile: (path: string, content: string) => void;
  deleteFile: (path: string) => void;
  openedUrls: string[];
  openPathsReady: boolean;
  zoom?: number;
  fullscreen?: boolean;
  menu?: MenuModel;
};

declare global {
  interface Window {
    __e2e: E2eApi;
    __E2E_STARTUP__?: string[];
  }
}

const openPathListeners = new Set<(paths: string[]) => void>();
const dropListeners = new Set<{
  over: (inside: boolean) => void;
  drop: (paths: string[]) => void;
}>();
const fileWatchers = new Map<string, Set<(change: FileChange) => void>>();
let dialogResult: string[] = [];

function normalized(path: string): string {
  return normalizePath(path);
}

function trigger(path: string, change: FileChange): void {
  for (const listener of fileWatchers.get(normalized(path)) ?? []) listener(change);
}

const e2e: E2eApi = {
  hasFile(path) {
    return files.has(normalized(path));
  },
  setDialogResult(paths) {
    dialogResult = [...paths];
  },
  drop(paths) {
    for (const listener of dropListeners) listener.drop(paths.filter(isMarkdownPath));
  },
  dragOver(inside) {
    for (const listener of dropListeners) listener.over(inside);
  },
  emitOpenPaths(paths) {
    for (const listener of openPathListeners) listener(paths);
  },
  writeFile(path, content) {
    const key = normalized(path);
    files.set(key, { content, modifiedMs: Date.now() });
    trigger(key, 'modified');
  },
  deleteFile(path) {
    const key = normalized(path);
    files.delete(key);
    trigger(key, 'removed');
  },
  openedUrls: [],
  openPathsReady: false,
};
if (typeof window !== 'undefined') window.__e2e = e2e;

export const fakeNative: NativeApi = {
  async openDocument(path): Promise<OpenedDocument> {
    const key = normalized(path);
    const file = files.get(key);
    if (!file) throw new NativeError('NOT_FOUND', path);
    return {
      path: key,
      name: basename(key),
      dir: dirname(key),
      content: file.content,
      modifiedMs: file.modifiedMs,
      encoding: 'utf-8',
    };
  },
  async pathsExist(paths) {
    return paths.map((path) => e2e.hasFile(path));
  },
  async takeStartupPaths() {
    if (typeof window === 'undefined') return [];
    const paths = [...(window.__E2E_STARTUP__ ?? [])];
    window.__E2E_STARTUP__ = [];
    return paths;
  },
  async onOpenPaths(cb) {
    openPathListeners.add(cb);
    e2e.openPathsReady = true;
    return () => openPathListeners.delete(cb);
  },
  async pickMarkdownFiles() {
    const result = dialogResult;
    dialogResult = [];
    return result;
  },
  async onFileDrop(handlers) {
    dropListeners.add(handlers);
    return () => dropListeners.delete(handlers);
  },
  async watchFile(path, onChange) {
    const key = normalized(path);
    const listeners = fileWatchers.get(key) ?? new Set<(change: FileChange) => void>();
    listeners.add(onChange);
    fileWatchers.set(key, listeners);
    return () => {
      listeners.delete(onChange);
      if (!listeners.size) fileWatchers.delete(key);
    };
  },
  async openExternal(url) {
    e2e.openedUrls.push(url);
  },
  async revealInFolder() {},
  toAssetUrl(absPath) {
    return `/tests/e2e/fixtures/${absPath.replace(/^\/fx\//, '')}`;
  },
  async setWindowTitle(title) {
    if (typeof document !== 'undefined') document.title = title;
  },
  async setZoom(factor) {
    e2e.zoom = factor;
  },
  async setFullscreen(on) {
    e2e.fullscreen = on;
  },
  async appInfo() {
    return { version: '2.0.0-beta.1', tauriVersion: 'e2e' };
  },
  async quit() {},
  async setMenu(model, onAction) {
    e2e.menu = model;
    menuAction = onAction;
  },
  store: {
    async get<T>(key: string): Promise<T | undefined> {
      const value = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key);
      return value === null ? undefined : (JSON.parse(value) as T);
    },
    async set(key: string, value: unknown): Promise<void> {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, JSON.stringify(value));
    },
  },
};

let menuAction: ((id: string) => void) | undefined;
