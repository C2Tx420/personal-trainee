import { useNavigate } from 'react-router';
import { Badge, Button, cx, Sheet } from '@/ui/components';
import { LATEST_ID, markWhatsNewSeen, RELEASES, useWhatsNewUnseen, type WhatsNewRelease } from './whats-new';

/** One release: icon · title · body, with "Thử ›" when the change lives on a screen. */
export function ReleaseItems({ release, onGo }: { release: WhatsNewRelease; onGo?: () => void }) {
  const nav = useNavigate();
  return (
    <div className="divide-y divide-line">
      {release.items.map((it) => (
        <div key={it.title} className="flex gap-3 py-2.5">
          <span className="glass-subtle rounded-ctl grid size-9 shrink-0 place-items-center text-lg" aria-hidden>
            {it.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold">{it.title}</div>
              {it.to && (
                <button
                  type="button"
                  className="shrink-0 text-sm font-semibold text-accent"
                  onClick={() => {
                    onGo?.();
                    nav(it.to!);
                  }}
                >
                  Thử ›
                </button>
              )}
            </div>
            <p className="text-sm text-muted">{it.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReleaseHeader({ release, className }: { release: WhatsNewRelease; className?: string }) {
  return (
    <div className={cx('mb-1 flex items-center gap-2', className)}>
      <div className="min-w-0 flex-1">
        <div className="text-lg font-bold tracking-tight">{release.title}</div>
        <div className="tabular text-xs text-muted">{release.date} · plan {release.plan}</div>
      </div>
      {release.id === LATEST_ID && <Badge tone="accent">Mới nhất</Badge>}
    </div>
  );
}

/** Shown once per device after an update brings a new release (never during a workout). */
export function WhatsNewSheet({ blocked }: { blocked: boolean }) {
  const nav = useNavigate();
  const unseen = useWhatsNewUnseen();
  const latest = RELEASES[0];
  return (
    <Sheet open={unseen && !blocked} onClose={markWhatsNewSeen} title="Có gì mới">
      <ReleaseHeader release={latest} />
      <ReleaseItems release={latest} onGo={markWhatsNewSeen} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          onClick={() => {
            markWhatsNewSeen();
            nav('/more/whats-new');
          }}
        >
          Xem tất cả
        </Button>
        <Button variant="primary" onClick={markWhatsNewSeen}>
          Đã hiểu
        </Button>
      </div>
    </Sheet>
  );
}
