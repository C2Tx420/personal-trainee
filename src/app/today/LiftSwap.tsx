import { useState } from 'react';
import { t } from '@/i18n';
import { type SessionKind, SESSION_KIND_LABEL } from '@/engine/schedule';
import { Button, cx } from '@/ui/components';

/** Pick any lifting session from the plan; collapsed behind a toggle unless `defaultOpen`. */
export function LiftSwap({
  title,
  options,
  hint,
  legsBlocked,
  disabled,
  defaultOpen = false,
  divider = true,
  onPick,
}: {
  title: string;
  options: SessionKind[];
  hint?: string | null;
  legsBlocked?: boolean;
  disabled?: boolean;
  defaultOpen?: boolean;
  divider?: boolean;
  onPick: (kind: SessionKind) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (options.length === 0) return null;
  if (!open) {
    return (
      <Button variant="ghost" block className="mt-2" onClick={() => setOpen(true)}>
        {title} ▸
      </Button>
    );
  }
  return (
    <div className={cx('mt-3', divider && 'border-t border-line pt-3')} data-testid="lift-swap">
      <p className="mb-2 text-sm text-muted">
        {hint ? t('{title} — {hint}:', { title, hint }) : `${title}:`}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((k) => (
          <Button key={k} variant="secondary" disabled={disabled} onClick={() => onPick(k)}>
            {SESSION_KIND_LABEL[k]}
          </Button>
        ))}
      </div>
      {legsBlocked && <p className="mt-2 text-xs text-muted">{t('Không có Legs: sát ngày cầu lông hoặc Chủ nhật.')}</p>}
    </div>
  );
}
