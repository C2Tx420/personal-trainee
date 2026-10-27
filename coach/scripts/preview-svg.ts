import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateSvg } from '../../src/engine/svg-validate';

/**
 * Validate SVG theo coach/svg-style.md rồi mở xem trước (nền sáng + tối).
 *   pnpm run preview-svg path/to/cable_fly.svg [--no-open]
 */
const file = process.argv[2];
if (!file) {
  console.error('Cần đường dẫn file .svg');
  process.exit(1);
}
const svg = fs.readFileSync(file, 'utf8');
const errors = validateSvg(svg);
if (errors.length) {
  console.error('SVG không hợp lệ:\n- ' + errors.join('\n- '));
  process.exit(1);
}
const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
const html = `<!doctype html><meta charset="utf-8"><title>${path.basename(file)}</title>
<style>body{margin:0;display:grid;grid-template-columns:1fr 1fr;font:13px system-ui}div{padding:16px}img{width:100%}
.d{background:#111;color:#ddd;color-scheme:dark}</style>
<div><p>Sáng</p><img src="${url}"></div><div class="d"><p>Tối (hệ thống)</p><img src="${url}"></div>`;
const out = path.join(os.tmpdir(), `svg-preview-${path.basename(file)}.html`);
fs.writeFileSync(out, html);
console.log(`OK · ${Buffer.byteLength(svg)} byte · xem trước: ${out}`);
if (!process.argv.includes('--no-open') && process.platform === 'darwin') execSync(`open "${out}"`);
