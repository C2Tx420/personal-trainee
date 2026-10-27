import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { svgDataUrl } from '@/engine/svg-validate';

export function cx(...xs: (string | false | null | undefined)[]): string {
  return xs.filter(Boolean).join(' ');
}

// ───────────────────────── Bố cục trang
export function Page({
  title,
  back,
  right,
  children,
  wide,
}: {
  title: ReactNode;
  back?: string | true;
  right?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const nav = useNavigate();
  return (
    <div className={cx('mx-auto w-full px-4 pb-28', wide ? 'max-w-3xl' : 'max-w-xl')}>
      <header className="safe-top sticky top-0 z-20 -mx-4 mb-3 flex min-h-14 items-center gap-2 border-b border-line bg-bg/95 px-4 backdrop-blur">
        {back && (
          <button
            aria-label="Quay lại"
            className="-ml-2 grid size-10 place-items-center rounded-full text-2xl text-muted active:bg-card-2"
            onClick={() => (back === true ? nav(-1) : nav(back))}
          >
            ‹
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
        {right}
      </header>
      {children}
    </div>
  );
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <section
      onClick={onClick}
      className={cx('mb-3 rounded-2xl border border-line bg-card p-4', onClick && 'cursor-pointer active:bg-card-2', className)}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mt-5 mb-2 flex items-end justify-between px-1">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">{children}</h2>
      {right}
    </div>
  );
}

// ───────────────────────── Nút
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ok';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  block?: boolean;
};

export function Button({ variant = 'secondary', size = 'md', block, className, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition select-none disabled:opacity-40',
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-11 px-4',
        size === 'lg' && 'h-13 px-5 text-lg',
        size === 'xl' && 'h-16 px-6 text-xl',
        variant === 'primary' && 'bg-accent text-accent-fg active:brightness-95',
        variant === 'secondary' && 'border border-line bg-card text-fg active:bg-card-2',
        variant === 'ghost' && 'text-muted active:bg-card-2',
        variant === 'danger' && 'bg-bad-soft text-bad active:brightness-95',
        variant === 'ok' && 'bg-ok text-white active:brightness-95',
        block && 'w-full',
        className,
      )}
    />
  );
}

// ───────────────────────── Form
export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** w-full mặc định, trừ khi className đã đặt độ rộng riêng (tránh 2 class width đè nhau). */
const hasWidth = (c?: string) => !!c && /(^|\s)(max-|min-)?w-/.test(c);

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        'h-11 rounded-xl border border-line bg-card px-3 text-base outline-none focus:border-accent',
        !hasWidth(props.className) && 'w-full',
        props.className,
      )}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx('rounded-xl border border-line bg-card p-3 text-base outline-none focus:border-accent', !hasWidth(props.className) && 'w-full', props.className)}
    />
  );
}

/** Ô số to có nút −/+ (dùng trong luồng tập). */
export function Stepper({
  value,
  onChange,
  step,
  unit,
  label,
  allowEmpty,
  min = 0,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  unit: string;
  label: string;
  allowEmpty?: boolean;
  min?: number;
}) {
  const fmt = (v: number) => String(Math.round(v * 100) / 100);
  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <button
        type="button"
        aria-label={`Giảm ${label}`}
        className="grid size-14 place-items-center rounded-2xl bg-card-2 text-3xl font-semibold active:brightness-95"
        onClick={() => onChange(Math.max(min, (value ?? 0) - step))}
      >
        −
      </button>
      <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1 rounded-2xl border border-line bg-card px-2 py-1">
        <input
          inputMode="decimal"
          aria-label={label}
          className="tabular w-full min-w-0 bg-transparent text-center text-3xl font-bold outline-none"
          value={value === null ? '' : fmt(value)}
          placeholder={allowEmpty ? '—' : '0'}
          onChange={(e) => {
            const raw = e.target.value.replace(',', '.').trim();
            if (raw === '') return onChange(allowEmpty ? null : 0);
            const n = Number(raw);
            if (!Number.isNaN(n)) onChange(n);
          }}
        />
        <span className="shrink-0 text-sm text-muted">{unit}</span>
      </div>
      <button
        type="button"
        aria-label={`Tăng ${label}`}
        className="grid size-14 place-items-center rounded-2xl bg-card-2 text-3xl font-semibold active:brightness-95"
        onClick={() => onChange((value ?? 0) + step)}
      >
        +
      </button>
    </div>
  );
}

export function Chip({
  active,
  children,
  onClick,
  tone = 'accent',
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  tone?: 'accent' | 'ok' | 'warn' | 'bad';
}) {
  const on = {
    accent: 'border-accent bg-accent-soft text-accent',
    ok: 'border-ok bg-ok-soft text-ok',
    warn: 'border-warn bg-warn-soft text-warn',
    bad: 'border-bad bg-bad-soft text-bad',
  }[tone];
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx('h-10 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap', active ? on : 'border-line bg-card text-fg active:bg-card-2')}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'ok' | 'warn' | 'bad' | 'accent' | 'info' }) {
  const cls = {
    muted: 'bg-card-2 text-muted',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    bad: 'bg-bad-soft text-bad',
    accent: 'bg-accent-soft text-accent',
    info: 'bg-info-soft text-info',
  }[tone];
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', cls)}>{children}</span>;
}

export function Banner({
  tone = 'info',
  children,
  action,
  onClick,
}: {
  tone?: 'info' | 'warn' | 'bad' | 'ok' | 'accent';
  children: ReactNode;
  action?: ReactNode;
  onClick?: () => void;
}) {
  const cls = {
    info: 'bg-info-soft text-info',
    warn: 'bg-warn-soft text-warn',
    bad: 'bg-bad-soft text-bad',
    ok: 'bg-ok-soft text-ok',
    accent: 'bg-accent-soft text-accent',
  }[tone];
  return (
    <div
      role={onClick ? 'button' : 'status'}
      onClick={onClick}
      className={cx('mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', cls, onClick && 'cursor-pointer')}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export function ProgressBar({ value, max, tone = 'accent' }: { value: number; max: number; tone?: 'accent' | 'ok' | 'warn' }) {
  const pct = max <= 0 ? 0 : Math.min(100, (value / max) * 100);
  const c = { accent: 'bg-accent', ok: 'bg-ok', warn: 'bg-warn' }[tone];
  return (
    <div className="h-2 overflow-hidden rounded-full bg-card-2" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={cx('h-full rounded-full transition-all', c)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-xl bg-card-2 px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="tabular text-lg font-bold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">{children}</div>;
}

export function Spinner({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  return <Banner tone="bad">{error instanceof Error ? error.message : String(error)}</Banner>;
}

/** Bottom sheet modal. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="safe-bottom max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-bg p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button aria-label="Đóng" onClick={onClose} className="grid size-9 place-items-center rounded-full text-muted active:bg-card-2">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-accent' : 'bg-line')}
    >
      <span className={cx('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', checked ? 'left-5.5' : 'left-0.5')} />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-3 flex rounded-xl bg-card-2 p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('h-9 flex-1 rounded-lg text-sm font-semibold', value === o.value ? 'bg-card shadow-sm' : 'text-muted')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Hình minh hoạ bài tập — render qua <img> nên script trong SVG không chạy. */
export function ExerciseImg({ svg, name, className }: { svg: string | null | undefined; name: string; className?: string }) {
  if (!svg) {
    return (
      <div className={cx('grid aspect-[8/5] place-items-center rounded-xl bg-card-2 text-xs text-muted', className && /(^|\s)w-/.test(className) ? '' : 'w-full', className)}>
        Chưa có hình
      </div>
    );
  }
  const width = className && /(^|\s)(max-)?w-/.test(className) ? '' : 'w-full';
  return <img src={svgDataUrl(svg)} alt={`Hình minh hoạ: ${name}`} className={cx('aspect-[8/5] rounded-xl', width, className)} />;
}

export function Kg({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined) return <span className="text-muted">— kg</span>;
  return <span className="tabular">{String(v).replace('.', ',')} kg</span>;
}
