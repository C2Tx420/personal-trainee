import { useEffect, useState } from 'react';
import { verifyPin } from '@/data/api';
import { cx } from '@/ui/components';

const LENGTH = 4;

/** Màn khoá PIN 4 số — PIN được kiểm tra ở server (Edge Function verify-pin). */
export function PinLock({ onUnlock, onLockedOut, email }: { onUnlock: () => void; onLockedOut: () => void; email: string }) {
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (pin.length !== LENGTH || busy) return;
    setBusy(true);
    verifyPin(pin)
      .then((r) => {
        if (r.ok) return onUnlock();
        setShake(true);
        setTimeout(() => setShake(false), 400);
        setPin('');
        if (r.locked_out) {
          setMsg('Sai 5 lần — cần đăng nhập lại bằng mật khẩu');
          setTimeout(onLockedOut, 1200);
        } else {
          setMsg(`Sai PIN — còn ${r.attempts_left} lần thử`);
        }
      })
      .catch((e: Error) => {
        setMsg(e.message);
        setPin('');
      })
      .finally(() => setBusy(false));
  }, [pin, busy, onUnlock, onLockedOut]);

  const press = (d: string) => setPin((p) => (p.length < LENGTH ? p + d : p));

  return (
    <div className="safe-top mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6">
      <div className="mb-2 text-4xl">🔒</div>
      <h1 className="text-xl font-semibold">Nhập PIN</h1>
      <p className="mb-6 text-xs text-muted">{email}</p>
      <div className={cx('mb-4 flex gap-4', shake && 'animate-pulse')} aria-label="PIN đã nhập" role="status">
        {Array.from({ length: LENGTH }, (_, i) => (
          <span key={i} className={cx('size-4 rounded-full border-2 border-accent', i < pin.length && 'bg-accent')} />
        ))}
      </div>
      <p className={cx('mb-6 h-5 text-sm', msg ? 'text-bad' : 'text-muted')}>{busy ? 'Đang kiểm tra…' : msg}</p>
      <div className="grid w-full max-w-xs grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <PinKey key={d} label={d} onClick={() => press(d)} disabled={busy} />
        ))}
        <span />
        <PinKey label="0" onClick={() => press('0')} disabled={busy} />
        <PinKey label="⌫" aria="Xoá" onClick={() => setPin((p) => p.slice(0, -1))} disabled={busy} />
      </div>
    </div>
  );
}

function PinKey({ label, onClick, disabled, aria }: { label: string; onClick: () => void; disabled: boolean; aria?: string }) {
  return (
    <button
      aria-label={aria ?? label}
      disabled={disabled}
      onClick={onClick}
      className="h-16 rounded-2xl bg-card text-2xl font-semibold shadow-sm active:bg-card-2 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
