export interface Settings {
  theme: 'system' | 'light' | 'dark';
  fontFamily: 'sans' | 'serif' | 'mono';
  fontSize: number;
  lineHeight: number;
  contentWidth: 'narrow' | 'medium' | 'wide' | 'full';
  zoom: number;
  blockRemoteImages: boolean;
  language: 'auto' | 'es' | 'en';
  restoreSession: boolean;
  showSidebar: boolean;
  readingTheme: 'default' | 'github' | 'sepia' | 'contrast';
  customCss: string;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  fontFamily: 'sans',
  fontSize: 17,
  lineHeight: 1.7,
  contentWidth: 'medium',
  zoom: 1,
  blockRemoteImages: false,
  language: 'auto',
  restoreSession: true,
  showSidebar: true,
  readingTheme: 'default',
  customCss: '',
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function enumValue<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === 'string' && values.includes(value as T) ? (value as T) : fallback;
}

function bounded(value: unknown, fallback: number, min: number, max: number, step: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const clamped = Math.min(max, Math.max(min, value));
  return Math.min(max, Math.max(min, Math.round(clamped / step) * step));
}

export function normalizeSettings(raw: unknown): Settings {
  const input = record(raw);
  return {
    theme: enumValue(input.theme, ['system', 'light', 'dark'], DEFAULT_SETTINGS.theme),
    fontFamily: enumValue(input.fontFamily, ['sans', 'serif', 'mono'], DEFAULT_SETTINGS.fontFamily),
    fontSize: bounded(input.fontSize, DEFAULT_SETTINGS.fontSize, 14, 24, 1),
    lineHeight: bounded(input.lineHeight, DEFAULT_SETTINGS.lineHeight, 1.4, 2, 0.1),
    contentWidth: enumValue(
      input.contentWidth,
      ['narrow', 'medium', 'wide', 'full'],
      DEFAULT_SETTINGS.contentWidth,
    ),
    zoom: bounded(input.zoom, DEFAULT_SETTINGS.zoom, 0.5, 2, 0.1),
    blockRemoteImages:
      typeof input.blockRemoteImages === 'boolean'
        ? input.blockRemoteImages
        : DEFAULT_SETTINGS.blockRemoteImages,
    language: enumValue(input.language, ['auto', 'es', 'en'], DEFAULT_SETTINGS.language),
    restoreSession:
      typeof input.restoreSession === 'boolean'
        ? input.restoreSession
        : DEFAULT_SETTINGS.restoreSession,
    showSidebar:
      typeof input.showSidebar === 'boolean' ? input.showSidebar : DEFAULT_SETTINGS.showSidebar,
    readingTheme: enumValue(
      input.readingTheme,
      ['default', 'github', 'sepia', 'contrast'],
      'default',
    ),
    customCss: typeof input.customCss === 'string' ? input.customCss.slice(0, 20_000) : '',
  };
}
