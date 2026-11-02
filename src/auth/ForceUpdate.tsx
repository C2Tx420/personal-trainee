import { useEffect, useState } from 'react';
import { applySwUpdate, CURRENT_RELEASE, releaseLabel, useSwUpdate } from '@/lib/sw-update';
import { Button } from '@/ui/components';

/**
 * Global update guard screen: shown while a waiting release is installed — before the login /
 * PIN screen, or right after a screen change in the app (see sw-update). Reloads into the new build.
 */
export function ForceUpdate() {
  const { latest } = useSwUpdate();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    applySwUpdate();
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 grid place-items-center px-6 text-center" role="status" aria-label="Đang cập nhật">
      <div className="flex flex-col items-center">
        <img src="/icons/favicon.svg" alt="" className="mb-4 size-16 rounded-[18px]" />
        <div className="text-xl font-bold tracking-tight">Có phiên bản mới</div>
        <div className="tabular mt-1 text-sm text-muted">
          {releaseLabel(CURRENT_RELEASE)} → <b className="text-fg">{latest ? releaseLabel(latest) : '…'}</b>
        </div>
        <div className="mt-6 flex h-5 items-center gap-2 text-sm text-muted">
          <span className="size-4 animate-spin rounded-full border-2 border-line border-t-accent" />
          Đang cập nhật…
        </div>
        {slow && (
          <Button variant="primary" className="mt-6" onClick={() => location.reload()}>
            Tải lại
          </Button>
        )}
      </div>
    </div>
  );
}
