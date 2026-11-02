import { native } from './native';
import { t } from './i18n/index.svelte';
import type { MessageKey } from './i18n/en';
import { openFolderFromDialog, openFromDialog, recents, tabs } from './state/app.svelte';
import { settings } from './state/settings.svelte';
import { registerCommands, type Command, type CommandId } from './commands';

const titles: Partial<Record<CommandId, MessageKey>> = {
  'file.open': 'menu.open',
  'file.openFolder': 'menu.openFolder',
  'file.closeTab': 'menu.closeTab',
  'file.reload': 'menu.reload',
  'file.clearRecents': 'menu.clearRecents',
  'app.quit': 'app.quit',
  'view.toggleSidebar': 'sidebar.toggle',
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
    'app.quit': () => native.quit(),
    'view.toggleSidebar': () => settings.update({ showSidebar: !settings.value.showSidebar }),
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
function setZoom(value: number): void {
  const zoom = Math.max(0.5, Math.min(2, Math.round(value * 10) / 10));
  settings.update({ zoom });
  void native.setZoom(zoom);
}
