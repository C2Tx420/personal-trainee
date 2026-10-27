import { useEffect, useState } from 'react';
import { photoObjectUrl, type PhotoRow } from '@/data/api';
import { cx } from '@/ui/components';

/** Image loaded via a short-lived signed URL → blob URL, revoked on unmount. Never cached. */
export function PhotoThumb({ photo, className }: { photo: PhotoRow | undefined; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!photo) return;
    let u: string | null = null;
    let alive = true;
    void photoObjectUrl(photo.storage_path).then((x) => {
      u = x;
      if (alive) setUrl(x);
      else URL.revokeObjectURL(x);
    });
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [photo]);
  if (!photo) return <div className={cx('grid aspect-[3/4] place-items-center rounded-xl bg-card-2 text-xs text-muted', className)}>Chưa có</div>;
  return url ? (
    <img src={url} alt={`Ảnh ${photo.angle} ${photo.taken_on}`} className={cx('aspect-[3/4] w-full rounded-xl object-cover', className)} />
  ) : (
    <div className={cx('aspect-[3/4] animate-pulse rounded-xl bg-card-2', className)} />
  );
}
