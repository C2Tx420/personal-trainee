import { createBrowserRouter } from 'react-router';
import { AppShell } from './app/AppShell';
import { BodyPage } from './app/body/BodyPage';
import { InbodyPage } from './app/body/InbodyPage';
import { PhotoCapturePage } from './app/body/PhotoCapturePage';
import { PhotoComparePage } from './app/body/PhotoComparePage';
import { PhotosPage } from './app/body/PhotosPage';
import { ExerciseDetailPage } from './app/exercises/ExerciseDetailPage';
import { ExercisesPage } from './app/exercises/ExercisesPage';
import { AboutPage } from './app/more/AboutPage';
import { BackupPage } from './app/more/BackupPage';
import { MorePage } from './app/more/MorePage';
import { PlanDetailPage } from './app/more/PlanDetailPage';
import { PlanEditPage } from './app/more/PlanEditPage';
import { PlansPage } from './app/more/PlansPage';
import { RemindersPage } from './app/more/RemindersPage';
import { ReviewsPage } from './app/more/ReviewsPage';
import { TodayPage } from './app/today/TodayPage';
import { BackfillPage } from './app/training/BackfillPage';
import { QuickLogPage } from './app/training/QuickLogPage';
import { SessionDetailPage } from './app/training/SessionDetailPage';
import { SimpleSessionPage } from './app/training/SimpleSessionPage';
import { TrainingPage } from './app/training/TrainingPage';
import { WorkoutFlowPage } from './app/workout/WorkoutFlowPage';

export const router = createBrowserRouter([
  { path: '/workout/:id', element: <WorkoutFlowPage /> },
  {
    element: <AppShell />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'training', element: <TrainingPage /> },
      { path: 'training/session/:id', element: <SessionDetailPage /> },
      { path: 'training/backfill', element: <BackfillPage /> },
      { path: 'training/quick', element: <QuickLogPage /> },
      { path: 'training/simple/:kind', element: <SimpleSessionPage /> },
      { path: 'exercises', element: <ExercisesPage /> },
      { path: 'exercises/:slug', element: <ExerciseDetailPage /> },
      { path: 'body', element: <BodyPage /> },
      { path: 'body/inbody', element: <InbodyPage /> },
      { path: 'body/photos', element: <PhotosPage /> },
      { path: 'body/photos/capture', element: <PhotoCapturePage /> },
      { path: 'body/photos/compare', element: <PhotoComparePage /> },
      { path: 'more', element: <MorePage /> },
      { path: 'more/plans', element: <PlansPage /> },
      { path: 'more/plans/:id', element: <PlanDetailPage /> },
      { path: 'more/plans/:id/edit', element: <PlanEditPage /> },
      { path: 'more/reviews', element: <ReviewsPage /> },
      { path: 'more/reminders', element: <RemindersPage /> },
      { path: 'more/backup', element: <BackupPage /> },
      { path: 'more/about', element: <AboutPage /> },
    ],
  },
]);
