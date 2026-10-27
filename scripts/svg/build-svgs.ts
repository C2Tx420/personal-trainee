import fs from 'node:fs';
import path from 'node:path';
import { validateSvg } from '../../src/engine/svg-validate';
import { EXERCISES } from '../seed/exercises';
import { DRAWINGS } from './poses';
import { renderSvg } from './render';

/**
 * Generate supabase/seed/exercises/<slug>.svg + <slug>.json from the seed library,
 * plus a gallery page to quickly review every illustration (light + dark).
 */
const OUT = path.resolve(import.meta.dirname, '../../supabase/seed/exercises');
fs.mkdirSync(OUT, { recursive: true });

const errors: string[] = [];
const cards: string[] = [];
for (const ex of EXERCISES) {
  const d = DRAWINGS[ex.slug];
  if (!d) {
    errors.push(`${ex.slug}: thiếu tư thế trong poses.ts`);
    continue;
  }
  const svg = renderSvg(ex.name_vi, d, ex.primary_muscle, ex.secondary_muscles);
  const issues = validateSvg(svg);
  if (issues.length) errors.push(`${ex.slug}: ${issues.join(', ')}`);
  fs.writeFileSync(path.join(OUT, `${ex.slug}.svg`), svg + '\n');
  fs.writeFileSync(path.join(OUT, `${ex.slug}.json`), JSON.stringify(ex, null, 2) + '\n');
  cards.push(
    `<figure><img src="${ex.slug}.svg" alt=""><figcaption>${ex.name_vi}<small>${ex.slug} · ${(svg.length / 1024).toFixed(1)} KB</small></figcaption></figure>`,
  );
}

fs.writeFileSync(
  path.join(OUT, 'gallery.html'),
  `<!doctype html><meta charset="utf-8"><title>Exercise SVG gallery</title>
<style>body{font:14px system-ui;margin:16px;background:#fff}@media (prefers-color-scheme:dark){body{background:#111;color:#ddd}}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}figure{margin:0}img{width:100%}
figcaption{display:flex;justify-content:space-between}small{opacity:.6}</style><main>${cards.join('')}</main>\n`,
);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Đã sinh ${EXERCISES.length} hình SVG vào ${OUT}`);
