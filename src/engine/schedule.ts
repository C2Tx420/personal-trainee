import { addDays, diffDays, weekdayOf, type IsoDate } from './dates';
import type { DayPlan, PlanContent, PlanItem, PlanTemplate, TemplateKey } from './plan-schema';

/** Scheduled session for a given date. */
export function dayPlanFor(content: PlanContent, date: IsoDate): DayPlan {
  return content.schedule[weekdayOf(date)];
}

export function templateFor(content: PlanContent, key: TemplateKey): PlanTemplate | undefined {
  return content.templates.find((t) => t.key === key);
}

/** Push/Pull on Sunday: one fewer working set per exercise (minimum 1). */
export function lightenTemplate(t: PlanTemplate): PlanTemplate {
  return {
    ...t,
    name: `${t.name} nhẹ`,
    items: t.items.map(
      (i): PlanItem => ({
        ...i,
        sets: Math.max(1, i.sets - 1),
        target_kg_per_set: i.target_kg_per_set ? i.target_kg_per_set.slice(0, Math.max(1, i.sets - 1)) : null,
      }),
    ),
  };
}

export const SESSION_KINDS = [
  'push', 'pull', 'legs', 'push_light', 'pull_light', 'badminton', 'walk', 'zone2', 'core',
] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export const SESSION_KIND_LABEL: Record<SessionKind, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  push_light: 'Push nhẹ',
  pull_light: 'Pull nhẹ',
  badminton: 'Cầu lông',
  walk: 'Đi bộ',
  zone2: 'Cardio zone 2',
  core: 'Core',
};

/** Template for a session kind (light Push → push template with fewer sets). */
export function templateForKind(content: PlanContent, kind: SessionKind): PlanTemplate | undefined {
  if (kind === 'push' || kind === 'pull' || kind === 'legs') return templateFor(content, kind);
  if (kind === 'push_light' || kind === 'pull_light') {
    const base = templateFor(content, kind === 'push_light' ? 'push' : 'pull');
    return base ? lightenTemplate(base) : undefined;
  }
  return undefined;
}

export type LoggedSession = { date: IsoDate; kind: string };

/**
 * Warn about Legs and badminton on consecutive days in the **actual schedule**: completed sessions + the session
 * planned for today. Returns the offending date pairs.
 */
export function actualLegsBadmintonConflicts(sessions: LoggedSession[]): { legs: IsoDate; badminton: IsoDate }[] {
  const legs = sessions.filter((s) => s.kind === 'legs');
  const bad = sessions.filter((s) => s.kind === 'badminton');
  const out: { legs: IsoDate; badminton: IsoDate }[] = [];
  for (const l of legs) {
    for (const b of bad) {
      if (Math.abs(diffDays(l.date, b.date)) <= 1) out.push({ legs: l.date, badminton: b.date });
    }
  }
  return out;
}

/** Whether today's scheduled session clashes Legs/badminton with yesterday/tomorrow. */
export function todayConflictWarning(
  content: PlanContent,
  today: IsoDate,
  logged: LoggedSession[],
): string | null {
  const plan = dayPlanFor(content, today);
  const todayKind = plan.kind === 'session' ? plan.template : plan.kind === 'badminton' ? 'badminton' : null;
  if (todayKind !== 'legs' && todayKind !== 'badminton') return null;
  const window = logged.filter((s) => Math.abs(diffDays(today, s.date)) <= 1 && s.date !== today);
  const other = todayKind === 'legs' ? 'badminton' : 'legs';
  const hit = window.find((s) => s.kind === other);
  if (!hit) return null;
  return todayKind === 'legs'
    ? `Hôm ${hit.date === addDays(today, -1) ? 'qua' : 'mai'} có cầu lông — Legs và cầu lông nên cách nhau ít nhất 1 ngày`
    : `Hôm ${hit.date === addDays(today, -1) ? 'qua' : 'mai'} có Legs — cầu lông và Legs nên cách nhau ít nhất 1 ngày`;
}
