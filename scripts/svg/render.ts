/**
 * Draw exercise illustrations following coach/svg-style.md:
 * viewBox 320×200, 2 panels "Bắt đầu → Kết thúc", stick-figure body,
 * primary muscles in orange, secondary muscles in light orange, light/dark colors via
 * prefers-color-scheme, dashed arrow tracing the path of the joint that moves most.
 */

export type Pt = [number, number];

export type SidePose = {
  view?: 'side';
  head: Pt;
  s: Pt; // vai
  e: Pt; // elbow
  w: Pt; // wrist
  p: Pt; // hip
  k: Pt; // knee
  f: Pt; // foot
  k2?: Pt; // rear knee (split stance)
  f2?: Pt; // rear foot
};

export type FrontPose = {
  view: 'front';
  head: Pt;
  ls: Pt; rs: Pt;
  le: Pt; re: Pt;
  lw: Pt; rw: Pt;
  lh: Pt; rh: Pt;
  lk: Pt; rk: Pt;
  lf: Pt; rf: Pt;
};

export type Pose = SidePose | FrontPose;

export type Prop =
  | { t: 'line'; a: Pt; b: Pt; w?: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; r?: number }
  | { t: 'circle'; c: Pt; r: number }
  | { t: 'stack'; x: number; y: number; h?: number }
  | { t: 'cable'; from: Pt; to: 'hands' | Pt };

export type Hold = 'bar' | 'db' | 'handle' | 'rope' | 'pad' | null;

export type Drawing = {
  a: Pose;
  b: Pose;
  props?: Prop[];
  propsA?: Prop[];
  propsB?: Prop[];
  hold?: Hold;
  /** Joint used for the motion arrow; defaults to the joint that moves the most. */
  motion?: string | null;
};

const MUSCLE_SEGMENTS: Record<string, string[]> = {
  chest: ['torso'], upper_back: ['torso'], lats: ['torso'], lower_back: ['torso'], abs: ['torso'], obliques: ['torso'], traps: ['torso'],
  front_delt: ['shoulder'], side_delt: ['shoulder'], rear_delt: ['shoulder'],
  biceps: ['upperarm'], triceps: ['upperarm'], forearms: ['forearm'],
  quads: ['thigh'], hamstrings: ['thigh'], adductors: ['thigh'], glutes: ['thigh', 'hipjoint'], calves: ['shin'],
  cardio: [],
};

const STYLE =
  '.bg{fill:#f6f7f9}.eq{fill:none;stroke:#9aa3ad;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}' +
  '.eqf{fill:#dde2e8;stroke:#9aa3ad;stroke-width:2}.bd{fill:none;stroke:#2b3440;stroke-width:9;stroke-linecap:round;stroke-linejoin:round}' +
  '.hd{fill:#2b3440}.p{stroke:#e8590c}.s{stroke:#f4a261}.pf{fill:#e8590c}.sf{fill:#f4a261}' +
  '.t{font:600 11px system-ui,-apple-system,sans-serif;fill:#5b6573}.ar{fill:none;stroke:#e8590c;stroke-width:2;stroke-dasharray:4 3}' +
  '.ah{fill:#e8590c}.fl{stroke:#c3cad2;stroke-width:2}' +
  '@media (prefers-color-scheme:dark){.bg{fill:#1c2128}.bd{stroke:#d7dde4}.hd{fill:#d7dde4}.eq{stroke:#6b7682}' +
  '.eqf{fill:#2d343d;stroke:#6b7682}.t{fill:#9aa5b1}.fl{stroke:#3a434e}}';

const f1 = (n: number) => Math.round(n * 10) / 10;
const P = (p: Pt, dx: number) => `${f1(p[0] + dx)} ${f1(p[1])}`;

function seg(a: Pt, b: Pt, dx: number, cls: string): string {
  return `<path class="bd${cls}" d="M${P(a, dx)}L${P(b, dx)}"/>`;
}

function cls(segment: string, primary: string[], secondary: string[]): string {
  if (primary.includes(segment)) return ' p';
  if (secondary.includes(segment)) return ' s';
  return '';
}

function holdAt(h: Hold, at: Pt, dx: number): string {
  const [x, y] = [at[0] + dx, at[1]];
  switch (h) {
    case 'bar':
      return `<circle class="eqf" cx="${f1(x)}" cy="${f1(y)}" r="13"/><circle class="hd" cx="${f1(x)}" cy="${f1(y)}" r="3"/>`;
    case 'db':
      return `<rect class="eqf" x="${f1(x - 9)}" y="${f1(y - 5)}" width="18" height="10" rx="3"/>`;
    case 'handle':
      return `<rect class="eqf" x="${f1(x - 6)}" y="${f1(y - 3)}" width="12" height="6" rx="2"/>`;
    case 'rope':
      return `<circle class="eqf" cx="${f1(x)}" cy="${f1(y)}" r="4"/>`;
    case 'pad':
      return `<rect class="eqf" x="${f1(x - 5)}" y="${f1(y - 10)}" width="10" height="20" rx="3"/>`;
    default:
      return '';
  }
}

function hands(p: Pose): Pt[] {
  return p.view === 'front' ? [p.lw, p.rw] : [p.w];
}

function propSvg(pr: Prop, dx: number, pose: Pose): string {
  switch (pr.t) {
    case 'line':
      return `<path class="eq" style="stroke-width:${pr.w ?? 4}px" d="M${P(pr.a, dx)}L${P(pr.b, dx)}"/>`;
    case 'rect':
      return `<rect class="eqf" x="${f1(pr.x + dx)}" y="${pr.y}" width="${pr.w}" height="${pr.h}" rx="${pr.r ?? 2}"/>`;
    case 'circle':
      return `<circle class="eqf" cx="${f1(pr.c[0] + dx)}" cy="${pr.c[1]}" r="${pr.r}"/>`;
    case 'stack': {
      const h = pr.h ?? 120;
      const lines = Array.from({ length: 6 }, (_, i) => `<path class="fl" d="M${f1(pr.x + dx + 2)} ${pr.y + h - 8 - i * 7}h12"/>`).join('');
      return `<rect class="eqf" x="${f1(pr.x + dx)}" y="${pr.y}" width="16" height="${h}" rx="2"/>${lines}`;
    }
    case 'cable': {
      const targets = pr.to === 'hands' ? hands(pose) : [pr.to];
      return targets.map((t) => `<path class="eq" style="stroke-width:1.5px" d="M${P(pr.from, dx)}L${P(t, dx)}"/>`).join('');
    }
  }
}

function figure(p: Pose, dx: number, primary: string[], secondary: string[]): string {
  const c = (s: string) => cls(s, primary, secondary);
  const out: string[] = [];
  if (p.view === 'front') {
    const neck: Pt = [(p.ls[0] + p.rs[0]) / 2, (p.ls[1] + p.rs[1]) / 2];
    const pelvis: Pt = [(p.lh[0] + p.rh[0]) / 2, (p.lh[1] + p.rh[1]) / 2];
    out.push(seg(p.lh, p.lk, dx, c('thigh')), seg(p.rh, p.rk, dx, c('thigh')));
    out.push(seg(p.lk, p.lf, dx, c('shin')), seg(p.rk, p.rf, dx, c('shin')));
    out.push(seg(p.lh, p.rh, dx, ''), seg(neck, pelvis, dx, c('torso')), seg(p.ls, p.rs, dx, c('torso')));
    out.push(seg(p.ls, p.le, dx, c('upperarm')), seg(p.rs, p.re, dx, c('upperarm')));
    out.push(seg(p.le, p.lw, dx, c('forearm')), seg(p.re, p.rw, dx, c('forearm')));
    for (const sh of [p.ls, p.rs]) {
      const k = c('shoulder');
      if (k) out.push(`<circle class="${k.trim()}f" cx="${f1(sh[0] + dx)}" cy="${f1(sh[1])}" r="6.5"/>`);
    }
  } else {
    if (p.k2 && p.f2) out.push(seg(p.p, p.k2, dx, c('thigh')), seg(p.k2, p.f2, dx, c('shin')));
    out.push(seg(p.p, p.k, dx, c('thigh')), seg(p.k, p.f, dx, c('shin')));
    out.push(seg(p.s, p.p, dx, c('torso')));
    out.push(seg(p.s, p.e, dx, c('upperarm')), seg(p.e, p.w, dx, c('forearm')));
    const k = c('shoulder');
    if (k) out.push(`<circle class="${k.trim()}f" cx="${f1(p.s[0] + dx)}" cy="${f1(p.s[1])}" r="6.5"/>`);
    const hk = c('hipjoint');
    if (hk) out.push(`<circle class="${hk.trim()}f" cx="${f1(p.p[0] + dx)}" cy="${f1(p.p[1])}" r="6.5"/>`);
  }
  out.push(`<circle class="hd" cx="${f1(p.head[0] + dx)}" cy="${f1(p.head[1])}" r="10"/>`);
  return out.join('');
}

function joints(p: Pose): Record<string, Pt> {
  return p.view === 'front'
    ? { lw: p.lw, rw: p.rw, lf: p.lf, rf: p.rf, lk: p.lk, rk: p.rk, head: p.head }
    : { w: p.w, f: p.f, k: p.k, p: p.p, s: p.s, head: p.head };
}

function motionArrow(d: Drawing, dx: number): string {
  const ja = joints(d.a);
  const jb = joints(d.b);
  let key = d.motion ?? null;
  if (d.motion === undefined) {
    let best = 6;
    for (const k of Object.keys(ja)) {
      const dist = Math.hypot(jb[k][0] - ja[k][0], jb[k][1] - ja[k][1]);
      if (dist > best) {
        best = dist;
        key = k;
      }
    }
  }
  if (!key || !ja[key]) return '';
  const [ax, ay] = ja[key];
  const [bx, by] = jb[key];
  const ang = Math.atan2(by - ay, bx - ax);
  const tip: Pt = [bx + dx, by];
  const l: Pt = [tip[0] - 8 * Math.cos(ang - 0.45), tip[1] - 8 * Math.sin(ang - 0.45)];
  const r: Pt = [tip[0] - 8 * Math.cos(ang + 0.45), tip[1] - 8 * Math.sin(ang + 0.45)];
  return (
    `<path class="ar" d="M${f1(ax + dx)} ${f1(ay)}L${f1(tip[0])} ${f1(tip[1])}"/>` +
    `<path class="ah" d="M${f1(tip[0])} ${f1(tip[1])}L${f1(l[0])} ${f1(l[1])}L${f1(r[0])} ${f1(r[1])}Z"/>`
  );
}

export function renderSvg(name: string, d: Drawing, primary: string, secondary: string[]): string {
  const prim = MUSCLE_SEGMENTS[primary] ?? [];
  const sec = secondary.flatMap((m) => MUSCLE_SEGMENTS[m] ?? []).filter((s) => !prim.includes(s));
  const frame = (pose: Pose, dx: number, extra: Prop[] = []) =>
    [...(d.props ?? []), ...extra].map((pr) => propSvg(pr, dx, pose)).join('') +
    figure(pose, dx, prim, sec) +
    hands(pose).map((h) => holdAt(d.hold ?? null, h, dx)).join('');
  const esc = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="${esc}">` +
    `<style>${STYLE}</style>` +
    `<rect class="bg" width="320" height="200" rx="12"/>` +
    `<text class="t" x="12" y="18">Bắt đầu</text><text class="t" x="172" y="18">Kết thúc</text>` +
    `<path class="fl" d="M8 192H312"/>` +
    frame(d.a, 0, d.propsA) +
    frame(d.b, 160, d.propsB) +
    motionArrow(d, 160) +
    `<path class="ah" d="M154 96l8 4-8 4z"/>` +
    `</svg>`
  );
}
