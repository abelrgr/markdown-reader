import type { RecentEntry } from './state/recents';
import { t } from './i18n/index.svelte';

export type MenuItemModel =
  | { kind: 'action'; id: string; label: string; accelerator?: string; enabled?: boolean }
  | { kind: 'separator' }
  | { kind: 'predefined'; item: 'copy' | 'selectAll' | 'about' | 'hide' | 'quit' }
  | { kind: 'submenu'; label: string; items: MenuItemModel[] };

export interface MenuModel {
  menus: { label: string; items: MenuItemModel[] }[];
}

export function buildMenuModel(recents: RecentEntry[], opts: { isMac: boolean }): MenuModel {
  const recentItems: MenuItemModel[] = recents.slice(0, 10).map((entry) => ({
    kind: 'action',
    id: `recent:${entry.path}`,
    label: entry.path.split(/[\\/]/).at(-1) ?? entry.path,
  }));
  const recentMenu: MenuItemModel = {
    kind: 'submenu',
    label: t('menu.recent'),
    items: recentItems.length
      ? [
          ...recentItems,
          { kind: 'separator' },
          { kind: 'action', id: 'file.clearRecents', label: 'Clear recent files' },
        ]
      : [{ kind: 'action', id: 'recent:none', label: t('menu.noRecentFiles'), enabled: false }],
  };
  const fileItems: MenuItemModel[] = [
    { kind: 'action', id: 'file.open', label: t('menu.open'), accelerator: 'CmdOrCtrl+O' },
    {
      kind: 'action',
      id: 'file.openFolder',
      label: t('menu.openFolder'),
      accelerator: 'CmdOrCtrl+Shift+O',
    },
    {
      kind: 'action',
      id: 'file.exportHtml',
      label: t('menu.exportHtml'),
      accelerator: 'CmdOrCtrl+Shift+E',
    },
    { kind: 'action', id: 'file.print', label: t('menu.print'), accelerator: 'CmdOrCtrl+Alt+P' },
    recentMenu,
    { kind: 'action', id: 'file.reload', label: t('menu.reload'), accelerator: 'CmdOrCtrl+R' },
    { kind: 'action', id: 'file.closeTab', label: t('menu.closeTab'), accelerator: 'CmdOrCtrl+W' },
    { kind: 'separator' },
  ];
  if (!opts.isMac)
    fileItems.push({
      kind: 'action',
      id: 'app.quit',
      label: t('menu.quit'),
      accelerator: 'CmdOrCtrl+Q',
    });

  const menus: MenuModel['menus'] = [
    { label: t('menu.file'), items: fileItems },
    {
      label: t('menu.edit'),
      items: [
        { kind: 'predefined', item: 'copy' },
        {
          kind: 'action',
          id: 'edit.copyAsHtml',
          label: t('menu.copyAsHtml'),
          accelerator: 'CmdOrCtrl+Shift+C',
        },
        { kind: 'predefined', item: 'selectAll' },
      ],
    },
    {
      label: t('menu.view'),
      items: [
        { kind: 'action', id: 'nav.back', label: t('menu.back'), accelerator: 'Alt+Left' },
        { kind: 'action', id: 'nav.forward', label: t('menu.forward'), accelerator: 'Alt+Right' },
        {
          kind: 'action',
          id: 'nav.toggleBookmark',
          label: t('menu.bookmark'),
          accelerator: 'CmdOrCtrl+D',
        },
        {
          kind: 'action',
          id: 'view.toggleSidebar',
          label: t('menu.sidebar'),
          accelerator: 'CmdOrCtrl+B',
        },
        { kind: 'action', id: 'view.find', label: t('menu.find'), accelerator: 'CmdOrCtrl+F' },
        { kind: 'action', id: 'view.focusMode', label: t('menu.focusMode'), accelerator: 'F11' },
        { kind: 'action', id: 'view.zoomIn', label: t('menu.zoomIn'), accelerator: 'CmdOrCtrl+=' },
        {
          kind: 'action',
          id: 'view.zoomOut',
          label: t('menu.zoomOut'),
          accelerator: 'CmdOrCtrl+-',
        },
        {
          kind: 'action',
          id: 'view.zoomReset',
          label: t('menu.zoomReset'),
          accelerator: 'CmdOrCtrl+0',
        },
        {
          kind: 'submenu',
          label: t('menu.theme'),
          items: [
            { kind: 'action', id: 'view.themeLight', label: t('menu.themeLight') },
            { kind: 'action', id: 'view.themeDark', label: t('menu.themeDark') },
            { kind: 'action', id: 'view.themeSystem', label: t('menu.themeSystem') },
          ],
        },
      ],
    },
    {
      label: t('menu.help'),
      items: [
        { kind: 'action', id: 'help.shortcuts', label: t('menu.shortcuts'), accelerator: 'F1' },
        { kind: 'action', id: 'help.about', label: t('menu.about') },
      ],
    },
  ];
  if (opts.isMac)
    menus.unshift({
      label: t('app.name'),
      items: [
        { kind: 'predefined', item: 'about' },
        {
          kind: 'action',
          id: 'app.settings',
          label: t('menu.settings'),
          accelerator: 'CmdOrCtrl+,',
        },
        { kind: 'separator' },
        { kind: 'predefined', item: 'hide' },
        { kind: 'predefined', item: 'quit' },
      ],
    });
  return { menus };
}
