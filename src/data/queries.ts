import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { ExerciseRow } from '@/engine/types';
import * as api from './api';

/** In-memory cache only (online-only, v2.1) — gone when the app closes. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: true },
    mutations: { retry: 3, retryDelay: (n) => Math.min(1000 * 2 ** n, 8000) },
  },
});

export const qk = {
  exercises: ['exercises'] as const,
  activePlan: ['plan', 'active'] as const,
  plans: ['plans'] as const,
  goals: ['goals'] as const,
  weights: ['weights'] as const,
  measurements: ['measurements'] as const,
  inbody: ['inbody'] as const,
  training: ['training'] as const,
  session: (id: string) => ['session', id] as const,
  inProgress: ['in-progress'] as const,
  photos: ['photos'] as const,
  reviews: ['reviews'] as const,
  notifications: ['notifications'] as const,
  meta: ['meta'] as const,
  history: (ids: string[]) => ['history', ...ids] as const,
};

const useExercises = () => useQuery({ queryKey: qk.exercises, queryFn: api.fetchExercises });
export const useActivePlan = () => useQuery({ queryKey: qk.activePlan, queryFn: api.fetchActivePlan });
export const usePlans = () => useQuery({ queryKey: qk.plans, queryFn: api.fetchPlans });
export const useGoals = () => useQuery({ queryKey: qk.goals, queryFn: api.fetchGoals });
export const useWeights = () => useQuery({ queryKey: qk.weights, queryFn: api.fetchWeights });
export const useMeasurements = () => useQuery({ queryKey: qk.measurements, queryFn: api.fetchMeasurements });
export const useInbody = () => useQuery({ queryKey: qk.inbody, queryFn: api.fetchInbody });
export const useTraining = () => useQuery({ queryKey: qk.training, queryFn: () => api.fetchTraining() });
export const useInProgress = () => useQuery({ queryKey: qk.inProgress, queryFn: api.fetchInProgress });
export const usePhotos = () => useQuery({ queryKey: qk.photos, queryFn: api.fetchPhotos });
export const useReviews = () => useQuery({ queryKey: qk.reviews, queryFn: api.fetchReviews });
export const useNotificationSettings = () => useQuery({ queryKey: qk.notifications, queryFn: api.fetchNotificationSettings });
export const useAppMeta = () => useQuery({ queryKey: qk.meta, queryFn: api.fetchAppMeta, staleTime: 5 * 60_000 });

export const useSessionDetail = (id: string | undefined) =>
  useQuery({ queryKey: qk.session(id ?? ''), queryFn: () => api.fetchSessionDetail(id!), enabled: !!id });

export const useExerciseHistory = (ids: string[]) =>
  useQuery({ queryKey: qk.history(ids), queryFn: () => api.fetchExerciseHistory(ids), enabled: ids.length > 0 });

export function useExerciseMaps(): {
  list: ExerciseRow[];
  byId: Map<string, ExerciseRow>;
  bySlug: Map<string, ExerciseRow>;
  loading: boolean;
} {
  const q = useExercises();
  return useMemo(() => {
    const list = q.data ?? [];
    return {
      list,
      byId: new Map(list.map((e) => [e.id, e])),
      bySlug: new Map(list.map((e) => [e.slug, e])),
      loading: q.isLoading,
    };
  }, [q.data, q.isLoading]);
}

/** After a write: refresh the related queries. */
export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: (readonly unknown[])[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })));
}
