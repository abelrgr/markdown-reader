import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from './settings';

describe('normalizeSettings', () => {
  it('returns defaults for missing data and validates/clamps values', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ fontSize: 99, theme: 'x' })).toMatchObject({
      fontSize: 24,
      theme: 'system',
    });
    expect(normalizeSettings({ zoom: 0.123 }).zoom).toBe(0.5);
    expect(normalizeSettings({ zoom: 1.26 }).zoom).toBe(1.3);
  });
  it('bounds custom CSS and validates reading themes', () => {
    expect(normalizeSettings({ customCss: 'x'.repeat(30_000) }).customCss).toHaveLength(20_000);
    expect(normalizeSettings({ readingTheme: 'otro' }).readingTheme).toBe('default');
  });
});
