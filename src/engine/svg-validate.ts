import { t } from '../i18n';
/**
 * Safety check for SVG illustrations (§4.7). Same conditions as the DB CHECK
 * and `coach_submit_draft`, so errors are caught as early as possible.
 */

const SVG_MAX_BYTES = 15_360;

const FORBIDDEN: [RegExp, string][] = [
  [/<script/i, t('không được có <script>')],
  [/\son[a-z]+\s*=/i, t('không được có thuộc tính on…= (sự kiện)')],
  [/foreignObject/i, t('không được có <foreignObject>')],
  [/javascript:/i, t('không được có javascript:')],
  [/(?:href|src)\s*=\s*["'](?!#)/i, t('không được link/ảnh ngoài (chỉ href="#id")')],
  [/<!ENTITY/i, t('không được khai báo ENTITY')],
  [/@import/i, t('không được @import trong style')],
];

export function validateSvg(svg: string): string[] {
  const errors: string[] = [];
  const bytes = new TextEncoder().encode(svg).length;
  if (!/^\s*<svg[\s>]/i.test(svg)) errors.push(t('phải bắt đầu bằng <svg'));
  if (!/viewBox="0 0 320 200"/.test(svg)) errors.push(t('viewBox phải là "0 0 320 200"'));
  if (bytes > SVG_MAX_BYTES) errors.push(t('quá lớn: {bytes} byte > {max}', { bytes, max: SVG_MAX_BYTES }));
  for (const [re, msg] of FORBIDDEN) if (re.test(svg)) errors.push(msg);
  return errors;
}

/** data URL rendered via <img> — browsers don't run scripts inside images. */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
