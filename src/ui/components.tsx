import { type ButtonHTMLAttributes, createContext, type InputHTMLAttributes, type ReactNode, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { svgDataUrl } from '@/engine/svg-validate';
import { IconBack, IconClose } from './icons';

export function cx(...xs: (string | false | null | undefined)[]): string {
  return xs.filter(Boolean).join(' ');
}

/**
 * Sticky glass header class (used by Page and the workout flow). The top padding is the
 * safe area; each header sets its own min-height on top of it so content never hugs the
 * bottom edge on notch / Dynamic Island phones.
 */
export const GLASS_HEADER = 'glass-strong sticky top-0 z-20 -mx-4 border-x-0 border-t-0 pt-[env(safe-area-inset-top)]';

/** App-wide banners (resume workout, DB outdated…) that Page renders right under its header. */
export const PageBanners = createContext<ReactNode>(null);

// ───────────────────────── Page layout
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
  const banners = useContext(PageBanners);
  return (
    <div className={cx('mx-auto w-full px-4 pb-32', wide ? 'max-w-3xl' : 'max-w-xl')}>
      <header className={cx(GLASS_HEADER, 'mb-4 flex min-h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-2 px-4')}>
        {back && (
          <button
            aria-label="Quay lại"
            className="glass-subtle -ml-1 grid size-9 place-items-center rounded-full text-fg"
            onClick={() => (back === true ? nav(-1) : nav(back))}
          >
            <IconBack className="size-5" />
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-[19px] font-bold tracking-tight">{title}</h1>
        {right}
      </header>
      {banners}
      {children}
    </div>
  );
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <section
      onClick={onClick}
      className={cx('glass rounded-card mb-3 p-4', onClick && 'cursor-pointer active:bg-white/[0.04]', className)}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex items-end justify-between px-1">
      <h2 className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{children}</h2>
      {right}
    </div>
  );
}

// ───────────────────────── Buttons
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
        'rounded-ctl inline-flex items-center justify-center gap-2 font-semibold transition select-none disabled:opacity-40',
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-11 px-4',
        size === 'lg' && 'h-13 px-5 text-lg',
        size === 'xl' && 'h-16 px-6 text-xl',
        (variant === 'primary' || variant === 'ok') && 'bg-accent text-accent-fg active:brightness-95',
        variant === 'secondary' && 'glass-subtle text-fg active:bg-white/[0.08]',
        variant === 'ghost' && 'text-muted active:bg-white/5',
        variant === 'danger' && 'border border-bad/25 bg-bad-soft text-bad',
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
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** w-full by default, unless className already sets a width (avoids 2 conflicting width classes). */
const hasWidth = (c?: string) => !!c && /(^|\s)(max-|min-)?w-/.test(c);

const FIELD = 'glass-input rounded-ctl text-base text-fg outline-none placeholder:text-muted/60 focus:border-accent/70';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(FIELD, 'h-11 px-3.5', !hasWidth(props.className) && 'w-full', props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(FIELD, 'p-3.5', !hasWidth(props.className) && 'w-full', props.className)} />;
}

/** Large number input with −/+ buttons (used in the workout flow). */
export function Stepper({
  value,
  onChange,
  step,
  unit,
  label,
  allowEmpty,
  min = 0,
  onStep,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  unit: string;
  label: string;
  allowEmpty?: boolean;
  min?: number;
  /** custom −/+ (e.g. pin to pin on lb stacks) instead of ± step */
  onStep?: (dir: 1 | -1) => void;
}) {
  const fmt = (v: number) => String(Math.round(v * 100) / 100);
  const btn = 'glass-subtle rounded-ctl grid size-14 shrink-0 place-items-center text-3xl font-light text-fg active:bg-white/[0.08]';
  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <button type="button" aria-label={`Giảm ${label}`} className={btn} onClick={() => (onStep ? onStep(-1) : onChange(Math.max(min, (value ?? 0) - step)))}>
        −
      </button>
      <div className="glass-input rounded-ctl flex h-14 min-w-0 flex-1 items-baseline justify-center gap-1 px-2 pt-2.5">
        <input
          inputMode="decimal"
          aria-label={label}
          className="tabular w-full min-w-0 bg-transparent text-center text-[32px] leading-none font-bold tracking-tight outline-none"
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
      <button type="button" aria-label={`Tăng ${label}`} className={btn} onClick={() => (onStep ? onStep(1) : onChange((value ?? 0) + step))}>
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
    accent: 'border-accent/60 bg-accent-soft text-accent',
    ok: 'border-ok/45 bg-ok-soft text-ok',
    warn: 'border-warn/45 bg-warn-soft text-warn',
    bad: 'border-bad/45 bg-bad-soft text-bad',
  }[tone];
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'h-10 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition',
        active ? on : 'border-line bg-card-2 text-fg active:bg-white/[0.08]',
      )}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'ok' | 'warn' | 'bad' | 'accent' | 'info' }) {
  const cls = {
    muted: 'bg-white/[0.07] text-muted',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    bad: 'bg-bad-soft text-bad',
    accent: 'bg-accent-soft text-accent',
    info: 'bg-info-soft text-info',
  }[tone];
  return (
    <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-white/[0.06] ring-inset', cls)}>{children}</span>
  );
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
    info: 'bg-info-soft text-info border-info/20',
    warn: 'bg-warn-soft text-warn border-warn/20',
    bad: 'bg-bad-soft text-bad border-bad/20',
    ok: 'bg-ok-soft text-ok border-ok/20',
    accent: 'bg-accent-soft text-accent border-accent/25',
  }[tone];
  return (
    <div
      role={onClick ? 'button' : 'status'}
      onClick={onClick}
      className={cx(
        'rounded-ctl mb-2 flex items-center gap-3 border px-3.5 py-3 text-sm font-medium',
        cls,
        onClick && 'cursor-pointer',
      )}
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
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={cx('h-full rounded-full transition-all duration-500', c)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-ctl border border-line bg-card-2 px-3 py-2.5">
      <div className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</div>
      <div className="tabular mt-0.5 text-xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-card border border-dashed border-line p-6 text-center text-sm text-muted">{children}</div>;
}

export function Spinner({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}
    </div>
  );
}

/** Full-screen launch screen — mirrors the static splash in index.html so the hand-off is seamless. */
export function Splash({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 grid place-items-center px-6" role="status">
      <div className="flex flex-col items-center">
        <img src="/icons/favicon.svg" alt="" className="mb-4 size-16 rounded-[18px]" />
        <div className="text-xl font-bold tracking-tight">Personal <span className="text-accent">Trainee</span></div>
        <div className="mt-6 flex h-5 items-center gap-2 text-sm text-muted">
          <span className="size-4 animate-spin rounded-full border-2 border-line border-t-accent" />
          {label}
        </div>
      </div>
    </div>
  );
}

/** Placeholder cards while a page's first query loads — keeps the layout from jumping. */
export function Skeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div role="status" aria-label="Đang tải…" className="animate-pulse">
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="glass rounded-card mb-3 p-4">
          <div className="mb-3 h-4 w-2/5 rounded-full bg-white/[0.08]" />
          <div className="mb-2 h-3 w-full rounded-full bg-white/[0.05]" />
          <div className="h-3 w-3/4 rounded-full bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  return <Banner tone="bad">{error instanceof Error ? error.message : String(error)}</Banner>;
}

/** Glass bottom sheet. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="glass-strong safe-bottom max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-[calc(var(--radius-card)+6px)] border-b-0 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <button aria-label="Đóng" onClick={onClose} className="glass-subtle grid size-9 place-items-center rounded-full text-muted">
            <IconClose className="size-4" />
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
      className={cx(
        'relative h-7 w-12 shrink-0 rounded-full transition',
        checked ? 'bg-accent' : 'bg-white/[0.12]',
      )}
    >
      <span className={cx('absolute top-0.5 size-6 rounded-full bg-white shadow-md transition-all', checked ? 'left-5.5' : 'left-0.5')} />
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
    <div className="glass-subtle rounded-ctl mb-3 flex p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-9 flex-1 rounded-[calc(var(--radius-ctl)-4px)] text-sm font-semibold transition',
            value === o.value ? 'bg-white/[0.1] text-fg' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The app is dark-only → drop the `@media (prefers-color-scheme:dark)` condition
 * in the SVG so it always uses dark colors, whatever the device setting.
 */
function forceDarkSvg(svg: string): string {
  return svg.replace(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{([\s\S]*)\}\s*<\/style>/, '$1</style>');
}

/** Exercise illustration — rendered via <img>, so scripts inside the SVG never run. */
export function ExerciseImg({ svg, name, className }: { svg: string | null | undefined; name: string; className?: string }) {
  const frame = 'rounded-ctl aspect-[8/5] ring-1 ring-line';
  if (!svg) {
    return (
      <div className={cx('grid place-items-center bg-white/[0.04] text-xs text-muted', frame, hasWidth(className) ? '' : 'w-full', className)}>
        Chưa có hình
      </div>
    );
  }
  return <img src={svgDataUrl(forceDarkSvg(svg))} alt={`Hình minh hoạ: ${name}`} className={cx(frame, hasWidth(className) ? '' : 'w-full', className)} />;
}
