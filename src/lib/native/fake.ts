import { basename, dirname, isMarkdownPath, normalizePath } from '../fs/paths';
import {
  NativeError,
  type FileChange,
  type FolderListing,
  type SearchResults,
  type NativeApi,
  type OpenedDocument,
  type Unlisten,
  type AiConfig,
  type AiEvent,
  type ChatMessage,
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
  setFolderResult: (path: string | null) => void;
  hasFile: (path: string) => boolean;
  drop: (paths: string[]) => void;
  dragOver: (inside: boolean) => void;
  emitOpenPaths: (paths: string[]) => void;
  writeFile: (path: string, content: string) => void;
  deleteFile: (path: string) => void;
  openedUrls: string[];
  openPathsReady: boolean;
  searchDelayMs?: Record<string, number>;
  savedFiles?: Record<string, string>;
  printRequested?: boolean;
  saveResult?: string | null;
  zoom?: number;
  fullscreen?: boolean;
  menu?: MenuModel;
  update?: { version: string; notes: string } | null;
  updateInstallCalled?: boolean;
  aiScript?: AiEvent[];
  aiCancelled?: string[];
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
const folderWatchers = new Map<string, Set<() => void>>();
const knownFolders = new Set<string>();
const cancelledAiRequests = new Set<string>();
const fakeSecrets = new Set<string>();
let dialogResult: string[] = [];
let folderResult: string | null = null;

function normalized(path: string): string {
  return normalizePath(path);
}

function trigger(path: string, change: FileChange): void {
  for (const listener of fileWatchers.get(normalized(path)) ?? []) listener(change);
  for (const [root, listeners] of folderWatchers) {
    if (normalized(path).startsWith(`${root.replace(/\/$/, '')}/`)) {
      for (const listener of listeners) listener();
    }
  }
}

const e2e: E2eApi = {
  hasFile(path) {
    return files.has(normalized(path));
  },
  setDialogResult(paths) {
    dialogResult = [...paths];
  },
  setFolderResult(path) {
    folderResult = path;
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
  searchDelayMs: {},
  savedFiles: {},
  printRequested: false,
  saveResult: null,
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
  async openFolder(path): Promise<FolderListing> {
    const root = normalized(path).replace(/\/$/, '');
    knownFolders.add(root);
    const entries = [...files.entries()]
      .filter(([filePath]) => filePath.startsWith(`${root}/`))
      .map(([filePath, file]) => {
        const relPath = filePath.slice(root.length + 1).replace(/\\/g, '/');
        return {
          path: filePath,
          relPath,
          name: basename(filePath),
          modifiedMs: file.modifiedMs,
        };
      });
    if (!entries.length && !files.has(root)) throw new NativeError('NOT_FOUND', path);
    return { root, entries, truncated: false };
  },
  async pickFolder(): Promise<string | null> {
    const result = folderResult;
    folderResult = null;
    return result;
  },
  async pathsExist(paths) {
    return paths.map((path) => {
      const key = normalized(path).replace(/\/$/, '');
      return (
        e2e.hasFile(key) ||
        knownFolders.has(key) ||
        [...files.keys()].some((filePath) => filePath.startsWith(`${key}/`))
      );
    });
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
  async watchFolder(root, onChange) {
    const key = normalized(root);
    const listeners = folderWatchers.get(key) ?? new Set<() => void>();
    listeners.add(onChange);
    folderWatchers.set(key, listeners);
    return () => {
      listeners.delete(onChange);
      if (!listeners.size) folderWatchers.delete(key);
    };
  },
  async searchFolder(root, query, caseSensitive): Promise<SearchResults> {
    const delay = e2e.searchDelayMs?.[query] ?? 0;
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    if (!query.trim()) return { hits: [], truncated: false };
    const normalizedQuery = caseSensitive ? query : query.toLocaleLowerCase();
    const hits: SearchResults['hits'] = [];
    for (const [path, file] of files) {
      if (!path.startsWith(`${normalized(root).replace(/\/$/, '')}/`)) continue;
      const relPath = path.slice(root.length + 1).replace(/\\/g, '/');
      for (const [index, line] of file.content.split(/\r?\n/).entries()) {
        const haystack = caseSensitive ? line : line.toLocaleLowerCase();
        const column = haystack.indexOf(normalizedQuery);
        if (column < 0) continue;
        hits.push({
          path,
          relPath,
          line: index + 1,
          column: column + 1,
          preview: line.slice(0, 200),
        });
      }
    }
    return { hits: hits.slice(0, 500), truncated: hits.length > 500 };
  },
  async saveFileDialog(): Promise<string | null> {
    const path = e2e.saveResult ?? null;
    e2e.saveResult = null;
    return path;
  },
  async writeTextFile(path, content): Promise<void> {
    e2e.savedFiles ??= {};
    e2e.savedFiles[path] = content;
  },
  async printDocument(): Promise<void> {
    e2e.printRequested = true;
  },
  async checkForUpdate(): Promise<{ version: string; notes: string } | null> {
    return e2e.update ?? null;
  },
  async installUpdate(onProgress): Promise<void> {
    e2e.updateInstallCalled = true;
    onProgress(1);
  },
  async aiListModels(_config: AiConfig): Promise<string[]> {
    return ['modelo-a', 'modelo-b'];
  },
  async aiChat(requestId: string, _config: AiConfig, _system: string, _messages: ChatMessage[], onEvent: (event: AiEvent) => void): Promise<void> {
    cancelledAiRequests.delete(requestId);
    for (const event of e2e.aiScript ?? []) {
      if (cancelledAiRequests.has(requestId)) break;
      onEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  },
  async aiCancel(requestId: string): Promise<void> {
    cancelledAiRequests.add(requestId);
    e2e.aiCancelled ??= [];
    e2e.aiCancelled.push(requestId);
  },
  async secretSet(account: string, _value: string): Promise<void> {
    fakeSecrets.add(account);
  },
  async secretExists(account: string): Promise<boolean> {
    return fakeSecrets.has(account);
  },
  async secretDelete(account: string): Promise<void> {
    fakeSecrets.delete(account);
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
