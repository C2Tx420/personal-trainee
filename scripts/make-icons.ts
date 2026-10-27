import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

/** Render public/icons/favicon.svg into the PNGs for the manifest + iOS. */
const dir = path.resolve(import.meta.dirname, '../public/icons');
const svg = fs.readFileSync(path.join(dir, 'favicon.svg'), 'utf8');
const sizes: [string, number, boolean][] = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon-180.png', 180, true],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, fullBleed] of sizes) {
  // maskable / iOS: full-bleed background (no rounded corners), icon shrunk into the 80% safe zone
  const inner = fullBleed ? svg.replace('rx="112"', 'rx="0"').replace('<g fill="#fff">', '<g fill="#fff" transform="translate(51 51) scale(0.8)">') : svg;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${inner}`);
  await page.screenshot({ path: path.join(dir, name), omitBackground: true });
}
await browser.close();
console.log('Đã sinh icon PWA');
