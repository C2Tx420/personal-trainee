import { normalizeVi } from './text';
import type { ExerciseRow } from './types';

type Ex = Pick<
  ExerciseRow,
  'id' | 'slug' | 'name_vi' | 'aliases' | 'primary_muscle' | 'movement_pattern' | 'available_at_gym' | 'archived'
>;

/**
 * Substitute suggestions: exercises in `alternatives` (in order) first, then
 * exercises with the same `movement_pattern` + same primary muscle group. Excludes exercises the gym
 * doesn't have and archived ones.
 */
export function suggestSubstitutes<T extends Ex>(original: T, alternatives: string[], library: T[], limit = 6): T[] {
  const usable = library.filter((e) => e.id !== original.id && e.available_at_gym && !e.archived);
  const bySlug = new Map(usable.map((e) => [e.slug, e]));
  const out: T[] = [];
  for (const s of alternatives) {
    const e = bySlug.get(s);
    if (e && !out.includes(e)) out.push(e);
  }
  for (const e of usable) {
    if (out.length >= limit) break;
    if (out.includes(e)) continue;
    if (e.movement_pattern === original.movement_pattern && e.primary_muscle === original.primary_muscle) out.push(e);
  }
  return out.slice(0, limit);
}

/** Find exercises from typed text (accent-insensitive, name or alias, substring match). */
export function searchExercises<T extends Ex>(query: string, library: T[], limit = 8): T[] {
  const q = normalizeVi(query);
  if (!q) return [];
  const scored = library
    .filter((e) => !e.archived)
    .map((e) => {
      const names = [e.name_vi, ...e.aliases].map(normalizeVi);
      let score = 0;
      for (const n of names) {
        if (n === q) score = Math.max(score, 100);
        else if (n.startsWith(q)) score = Math.max(score, 60);
        else if (n.includes(q)) score = Math.max(score, 40);
        else if (q.split(' ').every((w) => n.includes(w))) score = Math.max(score, 25);
      }
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.e.available_at_gym) - Number(a.e.available_at_gym));
  return scored.slice(0, limit).map((x) => x.e);
}

/** Exercise matching a name/alias exactly (decides whether a provisional exercise is needed). */
export function exactMatch<T extends Ex>(query: string, library: T[]): T | undefined {
  const q = normalizeVi(query);
  return library.find((e) => [e.name_vi, ...e.aliases].some((n) => normalizeVi(n) === q));
}
