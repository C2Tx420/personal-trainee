import { createBrowserRouter } from 'react-router';
import { AppShell } from './app/AppShell';
import { TodayPage } from './app/today/TodayPage';
import { Splash } from './ui/components';

/**
 * "Hôm nay" ships in the main bundle; every other screen is its own chunk (charts/recharts
 * included), so the first launch parses far less JS. Chunks are precached by the service worker.
 */
export const router = createBrowserRouter([
  {
    path: '/workout/:id',
    hydrateFallbackElement: <Splash />,
    lazy: () => import('./app/workout/WorkoutFlowPage').then((m) => ({ Component: m.WorkoutFlowPage })),
  },
  {
    element: <AppShell />,
    hydrateFallbackElement: <Splash />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'training', lazy: () => import('./app/training/TrainingPage').then((m) => ({ Component: m.TrainingPage })) },
      { path: 'training/session/:id', lazy: () => import('./app/training/SessionDetailPage').then((m) => ({ Component: m.SessionDetailPage })) },
      { path: 'training/backfill', lazy: () => import('./app/training/BackfillPage').then((m) => ({ Component: m.BackfillPage })) },
      { path: 'training/quick', lazy: () => import('./app/training/QuickLogPage').then((m) => ({ Component: m.QuickLogPage })) },
      { path: 'training/simple/:kind', lazy: () => import('./app/training/SimpleSessionPage').then((m) => ({ Component: m.SimpleSessionPage })) },
      { path: 'exercises', lazy: () => import('./app/exercises/ExercisesPage').then((m) => ({ Component: m.ExercisesPage })) },
      { path: 'exercises/:slug', lazy: () => import('./app/exercises/ExerciseDetailPage').then((m) => ({ Component: m.ExerciseDetailPage })) },
      { path: 'body', lazy: () => import('./app/body/BodyPage').then((m) => ({ Component: m.BodyPage })) },
      { path: 'body/inbody', lazy: () => import('./app/body/InbodyPage').then((m) => ({ Component: m.InbodyPage })) },
      { path: 'body/photos', lazy: () => import('./app/body/PhotosPage').then((m) => ({ Component: m.PhotosPage })) },
      { path: 'body/photos/capture', lazy: () => import('./app/body/PhotoCapturePage').then((m) => ({ Component: m.PhotoCapturePage })) },
      { path: 'body/photos/compare', lazy: () => import('./app/body/PhotoComparePage').then((m) => ({ Component: m.PhotoComparePage })) },
      { path: 'more', lazy: () => import('./app/more/MorePage').then((m) => ({ Component: m.MorePage })) },
      { path: 'more/plans', lazy: () => import('./app/more/PlansPage').then((m) => ({ Component: m.PlansPage })) },
      { path: 'more/plans/:id', lazy: () => import('./app/more/PlanDetailPage').then((m) => ({ Component: m.PlanDetailPage })) },
      { path: 'more/plans/:id/edit', lazy: () => import('./app/more/PlanEditPage').then((m) => ({ Component: m.PlanEditPage })) },
      { path: 'more/reviews', lazy: () => import('./app/more/ReviewsPage').then((m) => ({ Component: m.ReviewsPage })) },
      { path: 'more/reminders', lazy: () => import('./app/more/RemindersPage').then((m) => ({ Component: m.RemindersPage })) },
      { path: 'more/backup', lazy: () => import('./app/more/BackupPage').then((m) => ({ Component: m.BackupPage })) },
      { path: 'more/about', lazy: () => import('./app/more/AboutPage').then((m) => ({ Component: m.AboutPage })) },
    ],
  },
]);
