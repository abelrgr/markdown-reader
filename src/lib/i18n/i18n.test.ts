import { describe, expect, it } from 'vitest';
import { detectLocale, getLocale, setLocale, t } from './index.svelte';

describe('i18n', () => {
  it('detects Spanish language tags and defaults to English', () => {
    expect(detectLocale('es-PE')).toBe('es');
    expect(detectLocale('en-US')).toBe('en');
    expect(detectLocale('fr')).toBe('en');
    expect(detectLocale(undefined)).toBe('en');
  });

  it('translates named tab close messages', () => {
    setLocale('es');
    expect(t('tabs.closeNamed', { name: 'a.md' })).toBe('Cerrar a.md');
    setLocale('en');
    expect(t('tabs.closeNamed', { name: 'a.md' })).toBe('Close a.md');
  });

  it('exposes the current locale', () => {
    setLocale('es');
    expect(getLocale()).toBe('es');
    setLocale('en');
    expect(getLocale()).toBe('en');
  });
});
