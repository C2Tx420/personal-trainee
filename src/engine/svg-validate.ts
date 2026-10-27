/**
 * Safety check for SVG illustrations (§4.7). Same conditions as the DB CHECK
 * and `coach_submit_draft`, so errors are caught as early as possible.
 */

export const SVG_MAX_BYTES = 15_360;

const FORBIDDEN: [RegExp, string][] = [
  [/<script/i, 'không được có <script>'],
  [/\son[a-z]+\s*=/i, 'không được có thuộc tính on…= (sự kiện)'],
  [/foreignObject/i, 'không được có <foreignObject>'],
  [/javascript:/i, 'không được có javascript:'],
  [/(?:href|src)\s*=\s*["'](?!#)/i, 'không được link/ảnh ngoài (chỉ href="#id")'],
  [/<!ENTITY/i, 'không được khai báo ENTITY'],
  [/@import/i, 'không được @import trong style'],
];

/** Regex used by the Postgres CHECK — keep in sync with FORBIDDEN above. */
export const SVG_FORBIDDEN_PG_REGEX = "<script|\\son[a-z]+\\s*=|foreignObject|javascript:|<!ENTITY|@import";

export function validateSvg(svg: string): string[] {
  const errors: string[] = [];
  const bytes = new TextEncoder().encode(svg).length;
  if (!/^\s*<svg[\s>]/i.test(svg)) errors.push('phải bắt đầu bằng <svg');
  if (!/viewBox="0 0 320 200"/.test(svg)) errors.push('viewBox phải là "0 0 320 200"');
  if (bytes > SVG_MAX_BYTES) errors.push(`quá lớn: ${bytes} byte > ${SVG_MAX_BYTES}`);
  for (const [re, msg] of FORBIDDEN) if (re.test(svg)) errors.push(msg);
  return errors;
}

/** data URL rendered via <img> — browsers don't run scripts inside images. */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
