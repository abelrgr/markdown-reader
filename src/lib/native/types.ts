export type AppErrorCode = 'NOT_FOUND' | 'UNSUPPORTED_EXTENSION' | 'TOO_LARGE' | 'IO';

export class NativeError extends Error {
  readonly code: AppErrorCode;
  readonly detail: unknown;

  constructor(code: AppErrorCode, detail: unknown) {
    super(typeof detail === 'string' ? detail : code);
    this.name = 'NativeError';
    this.code = code;
    this.detail = detail;
  }
}

export interface OpenedDocument {
  path: string;
  name: string;
  dir: string;
  content: string;
  modifiedMs: number;
  encoding: string;
}

export interface FileEntry {
  path: string;
  relPath: string;
  name: string;
  modifiedMs: number;
}

export interface FolderListing {
  root: string;
  entries: FileEntry[];
  truncated: boolean;
}

export interface SearchHit {
  path: string;
  relPath: string;
  line: number;
  column: number;
  preview: string;
}

export interface SearchResults {
  hits: SearchHit[];
  truncated: boolean;
}

export type AiProvider = 'openai-compatible' | 'anthropic';
export interface AiConfig {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  secretAccount: string | null;
}
export type ChatRole = 'user' | 'assistant';
export interface ChatMessage { role: ChatRole; content: string }
export type AiEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; stopReason: string | null }
  | { type: 'error'; message: string };

export type Unlisten = () => void;
export type FileChange = 'modified' | 'removed';
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

export interface NativeApi {
  openDocument(path: string): Promise<OpenedDocument>;
  openFolder(path: string): Promise<FolderListing>;
  pickFolder(): Promise<string | null>;
  pathsExist(paths: string[]): Promise<boolean[]>;
  takeStartupPaths(): Promise<string[]>;
  onOpenPaths(cb: (paths: string[]) => void): Promise<Unlisten>;
  pickMarkdownFiles(): Promise<string[]>;
  onFileDrop(h: {
    over: (inside: boolean) => void;
    drop: (paths: string[]) => void;
  }): Promise<Unlisten>;
  watchFile(path: string, onChange: (change: FileChange) => void): Promise<Unlisten>;
  watchFolder(root: string, onChange: () => void): Promise<Unlisten>;
  searchFolder(root: string, query: string, caseSensitive: boolean): Promise<SearchResults>;
  saveFileDialog(defaultName: string, ext: 'html'): Promise<string | null>;
  writeTextFile(path: string, content: string): Promise<void>;
  printDocument(): Promise<void>;
  checkForUpdate(): Promise<{ version: string; notes: string } | null>;
  installUpdate(onProgress: (fraction: number) => void): Promise<void>;
  aiListModels(config: AiConfig): Promise<string[]>;
  aiChat(requestId: string, config: AiConfig, system: string, messages: ChatMessage[], onEvent: (event: AiEvent) => void): Promise<void>;
  aiCancel(requestId: string): Promise<void>;
  secretSet(account: string, value: string): Promise<void>;
  secretExists(account: string): Promise<boolean>;
  secretDelete(account: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  revealInFolder(path: string): Promise<void>;
  toAssetUrl(absPath: string): string;
  setWindowTitle(title: string): Promise<void>;
  setZoom(factor: number): Promise<void>;
  setFullscreen(on: boolean): Promise<void>;
  appInfo(): Promise<{ version: string; tauriVersion: string }>;
  quit(): Promise<void>;
  setMenu(model: MenuModel, onAction: (id: string) => void): Promise<void>;
  store: KeyValueStore;
}
import type { MenuModel } from '../menu';
