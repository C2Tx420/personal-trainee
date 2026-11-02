import { useEffect, useState } from 'react';
import { applySwUpdate, CURRENT_RELEASE, releaseLabel, rememberUnlock, useSwUpdate } from '@/lib/sw-update';
import { Button } from '@/ui/components';

/**
 * Global update guard screen: locks the app while a new release is installed — on open / resume,
 * before the login / PIN, or right after a screen change in the app (see sw-update). Reloads into
 * the new build; `keepUnlocked` skips the PIN after that reload when he was already in the app.
 */
export function ForceUpdate({ keepUnlocked }: { keepUnlocked: boolean }) {
  const { latest } = useSwUpdate();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (keepUnlocked) rememberUnlock(); // he was already in the app → no PIN after the reload
    applySwUpdate();
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [keepUnlocked]);

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
