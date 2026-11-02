import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion, getTauriVersion } from '@tauri-apps/api/app';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { watch } from '@tauri-apps/plugin-fs';
import { openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';
import { load } from '@tauri-apps/plugin-store';
import { dirname, isMarkdownPath, MARKDOWN_EXTENSIONS } from '../fs/paths';
import { isEventForFile } from './watch-filter';
import { NativeError, type AppErrorCode, type NativeApi, type OpenedDocument } from './types';

function parseError(error: unknown): NativeError {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const value = error as { code: unknown; detail?: unknown };
    const codes: AppErrorCode[] = ['NOT_FOUND', 'UNSUPPORTED_EXTENSION', 'TOO_LARGE', 'IO'];
    if (typeof value.code === 'string' && codes.includes(value.code as AppErrorCode)) {
      return new NativeError(value.code as AppErrorCode, value.detail);
    }
  }
  return new NativeError('IO', error);
}

let storePromise: ReturnType<typeof load> | undefined;
const tauriStore = {
  async get<T>(key: string): Promise<T | undefined> {
    const store = await (storePromise ??= load('state.json', { autoSave: 300 }));
    return store.get<T>(key);
  },
  async set(key: string, value: unknown): Promise<void> {
    const store = await (storePromise ??= load('state.json', { autoSave: 300 }));
    await store.set(key, value);
  },
};

export const tauriNative: NativeApi = {
  async openDocument(path): Promise<OpenedDocument> {
    try {
      return await invoke<OpenedDocument>('open_document', { path });
    } catch (error) {
      throw parseError(error);
    }
  },
  pathsExist: (paths) => invoke<boolean[]>('paths_exist', { paths }),
  takeStartupPaths: () => invoke<string[]>('take_startup_paths'),
  onOpenPaths: (cb) => listen<string[]>('open-paths', (event) => cb(event.payload)),
  async pickMarkdownFiles(): Promise<string[]> {
    const result = await open({ multiple: true, directory: false, filters: [{ name: 'Markdown', extensions: [...MARKDOWN_EXTENSIONS] }] });
    return result === null ? [] : Array.isArray(result) ? result : [result];
  },
  onFileDrop: async (handlers) => getCurrentWebview().onDragDropEvent((event) => {
    if (event.payload.type === 'enter' || event.payload.type === 'over') handlers.over(true);
    else if (event.payload.type === 'leave') handlers.over(false);
    else {
      handlers.over(false);
      handlers.drop(event.payload.paths.filter(isMarkdownPath));
    }
  }),
  async watchFile(path, onChange) {
    return watch(dirname(path), async (event) => {
      if (isEventForFile(event.paths, path)) {
        try {
          onChange((await invoke<boolean[]>('paths_exist', { paths: [path] }))[0] ? 'modified' : 'removed');
        } catch {
          // A transient invoke failure must not become an unhandled rejection from the watcher.
        }
      }
    }, { recursive: false, delayMs: 250 });
  },
  openExternal: openUrl,
  revealInFolder: revealItemInDir,
  toAssetUrl: convertFileSrc,
  setWindowTitle: (title) => getCurrentWindow().setTitle(title),
  setZoom: (factor) => getCurrentWebview().setZoom(factor),
  setFullscreen: (on) => getCurrentWindow().setFullscreen(on),
  async appInfo() {
    const [version, tauriVersion] = await Promise.all([getVersion(), getTauriVersion()]);
    return { version, tauriVersion };
  },
  quit: () => getCurrentWindow().close(),
  store: tauriStore,
};
