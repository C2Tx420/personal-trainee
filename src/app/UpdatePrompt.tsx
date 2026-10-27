import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { APP_VERSION } from '@/lib/version';
import { Button } from '@/ui/components';

/**
 * Có service worker mới → toast "Có phiên bản mới — Cập nhật" (§15.4).
 * Không tự reload; đang có buổi tập dở thì hoãn tới khi kết thúc buổi.
 */
export function UpdatePrompt({ blocked }: { blocked: boolean }) {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });
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
      <Button variant="primary" size="sm" onClick={() => void updateServiceWorker(true)}>
        Cập nhật
      </Button>
    </div>
  );
}
