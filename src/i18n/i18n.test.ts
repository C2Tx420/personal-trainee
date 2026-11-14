import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { formatVN } from '@/engine/dates';
import { formatNumberVN } from '@/engine/math';
import { EN } from './en';
import { plural, setLocale, t } from './index';

const ROOT = path.resolve(import.meta.dirname, '..');
const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]/;
// t('…') or t("…") with a plain string literal as the first argument
const CALL = /\bt\((['"])((?:\\.|(?!\1).)*)\1/g;
const IGNORE = 'i18n-ignore';

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === 'i18n' ? [] : sourceFiles(p);
    return /\.tsx?$/.test(d.name) && !d.name.endsWith('.test.ts') ? [p] : [];
  });
}

const files = sourceFiles(ROOT).map((p) => ({ rel: path.relative(ROOT, p), text: fs.readFileSync(p, 'utf8') }));
const unescape = (s: string) => s.replace(/\\(['"\\])/g, '$1');

describe('i18n coverage', () => {
  const used = new Set<string>();
  for (const f of files) for (const m of f.text.matchAll(CALL)) used.add(unescape(m[2]));

  it('every t() string has an English entry', () => {
    expect([...used].filter((k) => VI.test(k) && EN[k] === undefined).sort()).toEqual([]);
  });

  it('no unused English entries', () => {
    expect(Object.keys(EN).filter((k) => !used.has(k)).sort()).toEqual([]);
  });

  it('no Vietnamese UI text outside t()', () => {
    const left: string[] = [];
    for (const f of files) {
      let inBlock = false;
      f.text.split('\n').forEach((line, i) => {
        if (line.includes(IGNORE)) return;
        let code = line.replace(CALL, '');
        if (inBlock) {
          if (!code.includes('*/')) return;
          code = code.slice(code.indexOf('*/') + 2);
          inBlock = false;
        }
        code = code.replace(/\/\*.*?\*\//g, '');
        if (code.includes('/*')) {
          inBlock = true;
          code = code.slice(0, code.indexOf('/*'));
        }
        code = code.replace(/(^|[^:'"`])\/\/.*$/, '$1');
        if (/^\s*\*/.test(code)) return;
        if (VI.test(code)) left.push(`${f.rel}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
    }
    expect(left).toEqual([]);
  });

  it('placeholders match between Vietnamese and English', () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const bad = Object.entries(EN).filter(([k, v]) => typeof v === 'string' && vars(k).join() !== vars(v).join());
    expect(bad.map(([k]) => k)).toEqual([]);
  });
});

describe('t()', () => {
  afterEach(() => setLocale('vi'));

  it('returns Vietnamese by default and fills placeholders', () => {
    expect(t('Sai PIN — còn {n} lần thử', { n: 2 })).toBe('Sai PIN — còn 2 lần thử');
  });

  it('translates in English, falls back to Vietnamese when missing', () => {
    setLocale('en');
    expect(t('Thử lại')).toBe('Try again');
    expect(t('Chuỗi chưa dịch {x}', { x: 1 })).toBe('Chuỗi chưa dịch 1');
  });

  it('English plurals', () => {
    expect(plural(1, 'day')).toBe('1 day');
    expect(plural(3, 'day')).toBe('3 days');
    setLocale('en');
    expect(t('Sai PIN — còn {n} lần thử', { n: 1 })).toBe('Wrong PIN, 1 try left');
  });

  it('formats dates and numbers per locale', () => {
    expect(formatVN('2026-10-27')).toBe('27/10');
    expect(formatVN('2026-10-27', true)).toBe('27/10/2026');
    expect(formatNumberVN(1452.5, 1)).toBe('1.452,5');
    setLocale('en');
    expect(formatVN('2026-10-27')).toBe('27 Oct');
    expect(formatVN('2026-10-27', true)).toBe('27 Oct 2026');
    expect(formatNumberVN(1452.5, 1)).toBe('1,452.5');
  });
});
