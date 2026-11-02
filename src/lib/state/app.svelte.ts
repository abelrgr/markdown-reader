import { classifyLink } from '../dom/links';
import { addCopyButtons, resolveLocalImages } from '../dom/enhance';
import { isMarkdownPath, samePath } from '../fs/paths';
import { detectLocale, setLocale, t } from '../i18n/index.svelte';
import { renderMarkdown } from '../markdown/render';
import { native } from '../native';
import { NativeError, type AppErrorCode } from '../native/types';
import { addRecent, normalizeRecents, removeRecents, sortRecents, togglePin, type RecentEntry } from './recents';
import { normalizeSession } from './session';
import { settings } from './settings.svelte';
import { TabsState } from './tabs.svelte';
import { toasts } from './toasts.svelte';

export const tabs = new TabsState({ openDocument: (path) => native.openDocument(path), render: renderMarkdown });
export const recents = $state({ items: [] as RecentEntry[] });
let initialized = false;
let initializing: Promise<void> | null = null;
let appCleanup: (() => void) | null = null;
let dropInside = $state(false);
export function isDropInside(): boolean { return dropInside; }

const ERROR_KEYS: Record<AppErrorCode, 'error.NOT_FOUND' | 'error.UNSUPPORTED_EXTENSION' | 'error.TOO_LARGE' | 'error.IO'> = {
  NOT_FOUND: 'error.NOT_FOUND',
  UNSUPPORTED_EXTENSION: 'error.UNSUPPORTED_EXTENSION',
  TOO_LARGE: 'error.TOO_LARGE',
  IO: 'error.IO',
};

function notifyError(error: unknown): void {
  const code: AppErrorCode = error instanceof NativeError ? error.code : 'IO';
  const detail = error instanceof NativeError ? error.detail : error instanceof Error ? error.message : String(error);
  let params: Record<string, string | number> | undefined;
  if (code === 'TOO_LARGE') params = { max: 20 };
  else if (code === 'IO') {
    params = { detail: typeof detail === 'string' ? detail : JSON.stringify(detail) ?? String(detail) };
  }
  toasts.push('error', t(ERROR_KEYS[code], params));
}

function applyTheme(): void {
  const configured = settings.value.theme;
  const dark = configured === 'dark' || (configured === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.setProperty('--reader-font', ({ sans: 'system-ui, sans-serif', serif: 'Georgia, serif', mono: 'ui-monospace, monospace' })[settings.value.fontFamily]);
  document.documentElement.style.setProperty('--reader-size', `${settings.value.fontSize}px`);
  document.documentElement.style.setProperty('--reader-line', String(settings.value.lineHeight));
  document.documentElement.style.setProperty('--reader-width', ({ narrow: '60ch', medium: '75ch', wide: '95ch', full: 'none' })[settings.value.contentWidth]);
}

async function persistRecents(): Promise<void> { await native.store.set('recents', recents.items); }

export async function openPaths(paths: string[]): Promise<void> {
  for (const path of paths) {
    if (!isMarkdownPath(path)) continue;
    try {
      const tab = await tabs.open(path);
      recents.items = addRecent(recents.items, tab.path, Date.now());
      await persistRecents();
    } catch (error: unknown) {
      notifyError(error);
    }
  }
}

export async function openFromDialog(): Promise<void> {
  try {
    await openPaths(await native.pickMarkdownFiles());
  } catch (error: unknown) {
    notifyError(error);
  }
}

export async function removeMissingRecents(): Promise<void> {
  const exists = await native.pathsExist(recents.items.map((entry) => entry.path));
  recents.items = removeRecents(recents.items, recents.items.filter((_, index) => !exists[index]).map((entry) => entry.path));
  await persistRecents();
}

export function initApp(): Promise<void> {
  if (initialized) return Promise.resolve();
  if (initializing) return initializing;
  const task = initializeApp();
  initializing = task;
  void task.then(
    () => { if (initializing === task) initializing = null; },
    () => { if (initializing === task) initializing = null; },
  );
  return task;
}

async function initializeApp(): Promise<void> {
  let pathsListener: (() => void) | undefined;
  let dropListener: (() => void) | undefined;
  let cancelled = false;
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const onMediaChange = (): void => applyTheme();

  const cleanup = (): void => {
    if (cancelled) return;
    cancelled = true;
    pathsListener?.();
    dropListener?.();
    mediaQuery.removeEventListener('change', onMediaChange);
    if (appCleanup === cleanup) appCleanup = null;
    initialized = false;
  };
  appCleanup = cleanup;

  try {
  await settings.load(native.store);
  if (cancelled) return;
  const language = settings.value.language === 'auto' ? detectLocale(navigator.language) : settings.value.language;
  setLocale(language);
  document.documentElement.lang = language;
  recents.items = normalizeRecents(await native.store.get<unknown>('recents'));
  if (cancelled) return;
  if (recents.items.length) await removeMissingRecents();
  if (cancelled) return;
  applyTheme();
  mediaQuery.addEventListener('change', onMediaChange);
  pathsListener = await native.onOpenPaths((paths) => { void openPaths(paths); });
  if (cancelled) { pathsListener(); return; }
  dropListener = await native.onFileDrop({
    over: (inside) => { dropInside = inside; },
    drop: (paths) => { dropInside = false; void openPaths(paths); },
  });
  if (cancelled) { dropListener(); return; }
  const startup = await native.takeStartupPaths();
  if (cancelled) return;
  if (startup.length) await openPaths(startup);
  else if (settings.value.restoreSession) {
    const snapshot = normalizeSession(await native.store.get<unknown>('session'));
    for (const savedTab of snapshot.tabs) {
      await tabs.open(savedTab.path, { scrollTop: savedTab.scrollTop, activate: samePath(savedTab.path, snapshot.activePath ?? '') });
    }
    if (tabs.tabs.length && !tabs.activeId) tabs.activate(tabs.tabs[0]!.id);
  }
  if (cancelled) return;
  initialized = true;
  } catch (error: unknown) {
    cleanup();
    throw error;
  }
}

export function disposeApp(): void {
  appCleanup?.();
  if (!initialized) initializing = null;
}

export function pinRecent(path: string): void { recents.items = togglePin(recents.items, path); void persistRecents(); }
export async function removeRecent(path: string): Promise<void> { recents.items = removeRecents(recents.items, [path]); await persistRecents(); }

export async function handleViewerClick(event: MouseEvent, tabDir: string): Promise<void> {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest('a');
  if (!link) return;
  event.preventDefault();
  const action = classifyLink(link.getAttribute('href') ?? '', tabDir);
  try {
    if (action.kind === 'anchor') document.getElementById(action.id)?.scrollIntoView();
    if (action.kind === 'external') await native.openExternal(action.url);
    if (action.kind === 'reveal') await native.revealInFolder(action.path);
    if (action.kind === 'document') {
      const tab = await tabs.open(action.path);
      if (action.anchor) requestAnimationFrame(() => document.getElementById(action.anchor!)?.scrollIntoView());
      recents.items = addRecent(recents.items, tab.path, Date.now());
      await persistRecents();
    }
  } catch (error: unknown) {
    notifyError(error);
  }
}

export function enhanceViewer(root: HTMLElement, dir: string): void {
  resolveLocalImages(root, dir, (path) => native.toAssetUrl(path), { blockRemote: settings.value.blockRemoteImages, blockedLabel: t('viewer.imageBlocked') });
  addCopyButtons(root, { copy: t('viewer.copy'), copied: t('viewer.copied') });
}
export { applyTheme, sortRecents };
