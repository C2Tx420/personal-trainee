import { useEffect, useState } from 'react';
import { applySwUpdate, useSwUpdate } from '@/lib/sw-update';
import { APP_VERSION } from '@/lib/version';
import { Button } from '@/ui/components';

/**
 * A new release arrived while the app is open → "Có phiên bản mới — Cập nhật" toast (§15.4).
 * Never reloads on its own here; while a workout is in progress it waits until the session ends.
 * (On the next launch the update is forced before the PIN — see ForceUpdate.)
 */
export function UpdatePrompt({ blocked }: { blocked: boolean }) {
  const { needRefresh, applying } = useSwUpdate();
  const [next, setNext] = useState<string | null>(null);

  useEffect(() => {
    if (!needRefresh) return;
    fetch('/version.json', { cache: 'no-store' })
      .then((r) => r.json())
      .then((v: { version: string }) => setNext(v.version))
      .catch(() => setNext(null));
  }, [needRefresh]);

  if (!needRefresh || blocked) return null;
  return (
    <div className="glass-strong fixed inset-x-3 bottom-28 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-card p-3">
      <div className="min-w-0 flex-1 text-sm">
        Có phiên bản mới <b>{next ?? ''}</b>
        <div className="text-xs opacity-70">Đang dùng {APP_VERSION}</div>
      </div>
      <Button variant="primary" size="sm" disabled={applying} onClick={applySwUpdate}>
        {applying ? 'Đang cập nhật…' : 'Cập nhật'}
      </Button>
    </div>
  );
}
