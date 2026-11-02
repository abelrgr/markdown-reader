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

export type Unlisten = () => void;
export type FileChange = 'modified' | 'removed';
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

export interface NativeApi {
  openDocument(path: string): Promise<OpenedDocument>;
  pathsExist(paths: string[]): Promise<boolean[]>;
  takeStartupPaths(): Promise<string[]>;
  onOpenPaths(cb: (paths: string[]) => void): Promise<Unlisten>;
  pickMarkdownFiles(): Promise<string[]>;
  onFileDrop(h: { over: (inside: boolean) => void; drop: (paths: string[]) => void }): Promise<Unlisten>;
  watchFile(path: string, onChange: (change: FileChange) => void): Promise<Unlisten>;
  openExternal(url: string): Promise<void>;
  revealInFolder(path: string): Promise<void>;
  toAssetUrl(absPath: string): string;
  setWindowTitle(title: string): Promise<void>;
  setZoom(factor: number): Promise<void>;
  setFullscreen(on: boolean): Promise<void>;
  appInfo(): Promise<{ version: string; tauriVersion: string }>;
  quit(): Promise<void>;
  store: KeyValueStore;
}
