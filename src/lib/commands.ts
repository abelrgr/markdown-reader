export interface Command {
  id: CommandId;
  title: () => string;
  shortcut?: string;
  run: () => void | Promise<void>;
}
export type CommandId =
  | 'file.open'
  | 'file.openFolder'
  | 'file.closeTab'
  | 'file.reload'
  | 'file.clearRecents'
  | 'nav.quickOpen'
  | 'nav.commandPalette'
  | 'nav.searchFolder'
  | 'app.quit'
  | 'view.toggleSidebar'
  | 'view.find'
  | 'view.zoomIn'
  | 'view.zoomOut'
  | 'view.zoomReset'
  | 'view.themeLight'
  | 'view.themeDark'
  | 'view.themeSystem'
  | 'tabs.next'
  | 'tabs.prev'
  | 'app.settings'
  | 'help.shortcuts'
  | 'help.about';

let commands: Command[] = [];
export function registerCommands(cmds: Command[]): void {
  commands = [...cmds];
}
export function listCommands(): Command[] {
  return [...commands];
}
export async function runCommand(id: CommandId): Promise<void> {
  for (const command of commands) if (command.id === id) await command.run();
}

export function matchShortcut(e: KeyboardEvent, shortcut: string, isMac: boolean): boolean {
  const parts = shortcut.split('+');
  const key = parts.pop();
  if (!key) return false;
  const modifiers = new Set(parts);
  const wantsCtrl = modifiers.has('Ctrl') || (modifiers.has('Mod') && !isMac);
  const wantsMeta = modifiers.has('Meta') || (modifiers.has('Mod') && isMac);
  return (
    e.key.toLowerCase() === key.toLowerCase() &&
    e.ctrlKey === wantsCtrl &&
    e.metaKey === wantsMeta &&
    e.shiftKey === modifiers.has('Shift') &&
    e.altKey === modifiers.has('Alt')
  );
}

export function bindShortcuts(target: Window, isMac: boolean): () => void {
  const listener = (event: KeyboardEvent): void => {
    const element = event.target;
    const editing =
      element instanceof Element &&
      (element.matches('input, textarea, [contenteditable]') ||
        element.closest('[contenteditable]'));
    if (editing && event.key !== 'Escape') return;
    const match = commands.find(
      (command) => command.shortcut && matchShortcut(event, command.shortcut, isMac),
    );
    if (!match) return;
    event.preventDefault();
    void match.run();
  };
  target.addEventListener('keydown', listener);
  return () => target.removeEventListener('keydown', listener);
}
