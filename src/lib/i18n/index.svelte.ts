import { en, type MessageKey } from './en';
import { es } from './es';

export type Locale = 'es' | 'en';

let locale = $state<Locale>('en');

export function detectLocale(lang: string | undefined): Locale {
  return lang?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function setLocale(value: Locale): void {
  locale = value;
}

export function getLocale(): Locale {
  return locale;
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const message = locale === 'es' ? es[key] : en[key];
  if (!params) return message;
  return message.replace(/\{([^{}]+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}
