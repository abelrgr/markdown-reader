import { native } from './native';
import { t } from './i18n/index.svelte';
import type { MessageKey } from './i18n/en';
import {
  navigationHistory,
  navigateHistory,
  openFolderFromDialog,
  openFromDialog,
  recents,
  tabs,
  toggleCurrentBookmark,
} from './state/app.svelte';
import { settings } from './state/settings.svelte';
import { registerCommands, type Command, type CommandId } from './commands';
import { buildStandaloneHtml, collectCss, inlineImages } from './export';
import { getLocale } from './i18n/index.svelte';

const titles: Partial<Record<CommandId, MessageKey>> = {
  'file.open': 'menu.open',
  'file.openFolder': 'menu.openFolder',
  'file.closeTab': 'menu.closeTab',
  'file.reload': 'menu.reload',
  'file.clearRecents': 'menu.clearRecents',
  'nav.quickOpen': 'menu.quickOpen',
  'nav.commandPalette': 'menu.commandPalette',
  'nav.searchFolder': 'menu.searchFolder',
  'nav.back': 'menu.back',
  'nav.forward': 'menu.forward',
  'nav.toggleBookmark': 'menu.bookmark',
  'file.exportHtml': 'menu.exportHtml',
  'file.print': 'menu.print',
  'edit.copyAsHtml': 'menu.copyAsHtml',
  'app.quit': 'app.quit',
  'view.toggleSidebar': 'sidebar.toggle',
  'view.focusMode': 'menu.focusMode',
  'view.find': 'menu.find',
  'view.zoomIn': 'menu.zoomIn',
  'view.zoomOut': 'menu.zoomOut',
  'view.zoomReset': 'menu.zoomReset',
  'view.themeLight': 'menu.themeLight',
  'view.themeDark': 'menu.themeDark',
  'view.themeSystem': 'menu.themeSystem',
  'tabs.next': 'tabs.next',
  'tabs.prev': 'tabs.previous',
  'app.settings': 'menu.settings',
  'help.shortcuts': 'menu.shortcuts',
  'help.about': 'menu.about',
};
const shortcuts: Partial<Record<CommandId, string[]>> = {
  'file.open': ['Mod+O'],
  'file.openFolder': ['Mod+Shift+O'],
  'nav.quickOpen': ['Mod+P'],
  'nav.commandPalette': ['Mod+Shift+P'],
  'nav.searchFolder': ['Mod+Shift+F'],
  'nav.back': ['Alt+Left', 'Mod+['],
  'nav.forward': ['Alt+Right', 'Mod+]'],
  'nav.toggleBookmark': ['Mod+D'],
  'file.exportHtml': ['Mod+Shift+E'],
  'file.print': ['Mod+Alt+P'],
  'edit.copyAsHtml': ['Mod+Shift+C'],
  'file.closeTab': ['Mod+W'],
  'file.reload': ['Mod+R', 'F5'],
  'app.quit': ['Mod+Q'],
  'view.toggleSidebar': ['Mod+B'],
  'view.find': ['Mod+F'],
  'view.zoomIn': ['Mod+='],
  'view.zoomOut': ['Mod+-'],
  'view.zoomReset': ['Mod+0'],
  'tabs.next': ['Ctrl+Tab'],
  'tabs.prev': ['Ctrl+Shift+Tab'],
  'app.settings': ['Mod+,'],
  'help.shortcuts': ['F1', 'Shift+?'],
  'view.focusMode': ['F11'],
};

export function registerAppCommands(): void {
  const actions: Record<CommandId, () => void | Promise<void>> = {
    'file.open': openFromDialog,
    'file.openFolder': openFolderFromDialog,
    'file.closeTab': () => {
      if (tabs.active) tabs.close(tabs.active.id);
    },
    'file.reload': () => {
      if (tabs.active) return tabs.reload(tabs.active.id);
    },
    'file.clearRecents': async () => {
      recents.items = [];
      await native.store.set('recents', []);
    },
    'nav.quickOpen': () => {
      window.dispatchEvent(new CustomEvent('app:quickOpen'));
    },
    'nav.commandPalette': () => {
      window.dispatchEvent(new CustomEvent('app:commandPalette'));
    },
    'nav.searchFolder': () => {
      window.dispatchEvent(new CustomEvent('app:searchFolder'));
    },
    'nav.back': () => navigateHistory(navigationHistory.back()),
    'nav.forward': () => navigateHistory(navigationHistory.forward()),
    'nav.toggleBookmark': toggleCurrentBookmark,
    'file.exportHtml': exportHtml,
    'file.print': () => native.printDocument(),
    'edit.copyAsHtml': copyAsHtml,
    'app.quit': () => native.quit(),
    'view.toggleSidebar': () => settings.update({ showSidebar: !settings.value.showSidebar }),
    'view.focusMode': () => {
      window.dispatchEvent(new CustomEvent('app:focusMode'));
    },
    'view.find': () => {
      window.dispatchEvent(new CustomEvent('app:find'));
    },
    'view.zoomIn': () => setZoom(settings.value.zoom + 0.1),
    'view.zoomOut': () => setZoom(settings.value.zoom - 0.1),
    'view.zoomReset': () => setZoom(1),
    'view.themeLight': () => settings.update({ theme: 'light' }),
    'view.themeDark': () => settings.update({ theme: 'dark' }),
    'view.themeSystem': () => settings.update({ theme: 'system' }),
    'tabs.next': () => tabs.next(),
    'tabs.prev': () => tabs.prev(),
    'app.settings': () => {
      window.dispatchEvent(new CustomEvent('app:settings'));
    },
    'help.shortcuts': () => {
      window.dispatchEvent(new CustomEvent('app:shortcuts'));
    },
    'help.about': () => {
      window.dispatchEvent(new CustomEvent('app:about'));
    },
  };
  const commands: Command[] = Object.entries(actions).flatMap(([id, run]) =>
    (shortcuts[id as CommandId] ?? [undefined]).map((shortcut) => ({
      id: id as CommandId,
      title: () => t(titles[id as CommandId]!),
      ...(shortcut ? { shortcut } : {}),
      run,
    })),
  );
  registerCommands(commands);
}

async function currentHtml(): Promise<string | null> {
  const tab = tabs.active;
  const article = document.querySelector<HTMLElement>('[data-testid="viewer"]');
  if (!tab || !article) return null;
  const clone = article.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('button.copy-code').forEach((button) => button.remove());
  clone
    .querySelectorAll('[data-local-path]')
    .forEach((image) => image.removeAttribute('data-local-path'));
  await inlineImages(clone);
  return buildStandaloneHtml({
    title: tab.name,
    bodyHtml: clone.innerHTML,
    css: collectCss(document),
    lang: getLocale(),
  });
}

async function exportHtml(): Promise<void> {
  const tab = tabs.active;
  const html = await currentHtml();
  if (!tab || !html) return;
  const path = await native.saveFileDialog(`${tab.name.replace(/\.[^.]+$/, '')}.html`, 'html');
  if (path) await native.writeTextFile(path, html);
}

async function copyAsHtml(): Promise<void> {
  const tab = tabs.active;
  const html = await currentHtml();
  if (!tab || !html) return;
  const article = document.querySelector<HTMLElement>('[data-testid="viewer"]');
  const plain = article?.innerText ?? '';
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plain], { type: 'text/plain' }),
    }),
  ]);
}
function setZoom(value: number): void {
  const zoom = Math.max(0.5, Math.min(2, Math.round(value * 10) / 10));
  settings.update({ zoom });
  void native.setZoom(zoom);
}
