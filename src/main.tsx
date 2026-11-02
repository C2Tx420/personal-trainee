import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { AuthGate } from './auth/AuthGate';
import { queryClient } from './data/queries';
import { applyOnNavigation, startSwUpdates } from './lib/sw-update';
import './index.css';
import { router } from './router';

startSwUpdates();
applyOnNavigation(router);

// A screen's chunk from the previous release was purged (old page still open after a deploy)
// → reload once into the new release instead of showing a broken screen.
window.addEventListener('vite:preloadError', (e) => {
  const key = 'pt:chunk-reload';
  try {
    if (Date.now() - Number(sessionStorage.getItem(key) ?? 0) < 10_000) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    /* private mode — reload anyway */
  }
  e.preventDefault();
  location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
    </QueryClientProvider>
  </StrictMode>,
);
