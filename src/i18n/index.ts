import { EN } from './en';
import type { Vars } from './util';

export { plural } from './util';
export type { Dict, Entry, Vars } from './util';

/**
 * gettext-style i18n: the Vietnamese source string is the key, `EN` maps it to English.
 * Vietnamese is the default; a missing translation falls back to the Vietnamese text.
 * Strings that are written to the database stay Vietnamese — never wrap them in `t()`.
 */
export type Locale = 'vi' | 'en';

export const LOCALE_KEY = 'pt-locale';

function readStored(): Locale {
  try {
    return globalThis.localStorage?.getItem(LOCALE_KEY) === 'en' ? 'en' : 'vi';
  } catch {
    return 'vi';
  }
}

// read at module load so labels built at import time (engine constants) are already translated
let current: Locale = readStored();

export function getLocale(): Locale {
  return current;
}

export function setLocale(l: Locale): void {
  current = l;
}

/** Persist the choice; the caller reloads the app so every label is rebuilt. */
export function saveLocale(l: Locale): void {
  try {
    globalThis.localStorage?.setItem(LOCALE_KEY, l);
  } catch {
    // storage blocked: the choice lasts for this page only
  }
  current = l;
}

function fill(s: string, vars?: Vars): string {
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

/** Translate a Vietnamese UI string; `{name}` placeholders are filled from `vars`. */
export function t(src: string, vars?: Vars): string {
  if (current === 'en') {
    const e = EN[src];
    if (e !== undefined) return typeof e === 'function' ? e(vars ?? {}) : fill(e, vars);
  }
  return fill(src, vars);
}

/** BCP 47 tag for Intl formatting. */
export function intlLocale(): string {
  return current === 'en' ? 'en-GB' : 'vi-VN';
}
