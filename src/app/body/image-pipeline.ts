/**
 * Chuẩn bị ảnh tiến độ trước khi upload (§6.9): xoay theo EXIF, thu nhỏ cạnh
 * dài về 1080px, encode lại JPEG qua canvas → **toàn bộ EXIF (GPS, thiết bị,
 * thời gian) bị xoá** vì canvas không mang metadata.
 */
export const MAX_EDGE = 1080;

export async function prepareImage(src: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(src, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Không nén được ảnh'))), 'image/jpeg', 0.82),
  );
  return { blob, width, height };
}

/** Kiểm tra blob JPEG có segment APP1/Exif không (dùng trong test). */
export async function hasExif(blob: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  for (let i = 2; i < bytes.length - 10; ) {
    if (bytes[i] !== 0xff) break;
    const marker = bytes[i + 1];
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marker === 0xe1 && String.fromCharCode(...bytes.slice(i + 4, i + 8)) === 'Exif') return true;
    if (marker === 0xda) break;
    i += 2 + len;
  }
  return false;
}
