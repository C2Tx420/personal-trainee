/** Bỏ dấu tiếng Việt + chữ thường + gộp khoảng trắng — dùng để so tên bài. */
export function normalizeVi(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Slug từ tên tiếng Việt: "Máy kéo xô hãng X" → "may_keo_xo_hang_x". */
export function slugifyVi(s: string): string {
  return normalizeVi(s).replace(/ /g, '_').slice(0, 48) || 'bai_tap';
}
