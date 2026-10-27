import { defineConfig } from '@playwright/test';

/**
 * Full-flow E2E against local Supabase (supabase start) + local Edge Functions.
 * Per-screen screenshots go to e2e/screenshots/ (gitignored — contains health data).
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    colorScheme: 'light',
    permissions: ['camera'],
    launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'supabase functions serve --env-file supabase/functions/.env',
      url: 'http://127.0.0.1:54321/functions/v1/verify-pin',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'pnpm exec vite build && pnpm exec vite preview --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
