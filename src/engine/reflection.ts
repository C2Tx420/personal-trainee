import { type IsoDate, weekStart } from './dates';
import type { SessionRow } from './types';

/**
 * Post-workout reflection ("cảm nhận"): can be written or edited later — until Claude Code has
 * reviewed that week (review note with week_start = the session's Monday). Same rule as the
 * DB trigger `workout_sessions_reflection_guard`.
 */
export function reviewedWeeks(reviews: { week_start: IsoDate }[]): Set<IsoDate> {
  return new Set(reviews.map((r) => r.week_start));
}

export function reflectionLocked(sessionDate: IsoDate, reviewed: Set<IsoDate>): boolean {
  return reviewed.has(weekStart(sessionDate));
}

/** Done sessions get a reflection; skipped days already carry their reason in `note`. */
export function canReflect(s: Pick<SessionRow, 'status' | 'session_date'>, reviewed: Set<IsoDate>): boolean {
  return s.status === 'completed' && !reflectionLocked(s.session_date, reviewed);
}

/** Still open and nothing written yet → nudge in the history list. */
export function missingReflection(s: Pick<SessionRow, 'status' | 'session_date' | 'reflection'>, reviewed: Set<IsoDate>): boolean {
  return canReflect(s, reviewed) && !s.reflection?.trim();
}
