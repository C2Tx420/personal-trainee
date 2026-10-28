import { useEffect, useState } from 'react';
import { applySwUpdate } from '@/lib/sw-update';
import { APP_VERSION } from '@/lib/version';
import { Button } from '@/ui/components';

/**
 * A new release is waiting and nobody is in the app yet (login / PIN screen) → install it
 * before anything else. Nothing typed is lost: the PIN comes after the reload.
 */
export function ForceUpdate() {
  const [next, setNext] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    fetch('/version.json', { cache: 'no-store' })
      .then((r) => r.json())
      .then((v: { version: string }) => setNext(v.version))
      .catch(() => undefined);
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
          {APP_VERSION} → <b className="text-fg">{next ?? '…'}</b>
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
