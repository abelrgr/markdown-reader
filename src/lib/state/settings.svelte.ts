import type { KeyValueStore } from '../native/types';
import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from './settings';

export class SettingsState {
  value = $state<Settings>({ ...DEFAULT_SETTINGS });
  private store: KeyValueStore | null = null;

  async load(store: KeyValueStore): Promise<void> {
    this.store = store;
    this.value = normalizeSettings(await store.get<unknown>('settings'));
  }

  update(patch: Partial<Settings>): void {
    this.value = normalizeSettings({ ...this.value, ...patch });
    if (this.store) void this.store.set('settings', this.value);
  }
}

export const settings = new SettingsState();
