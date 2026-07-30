import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Toaster } from './components/ui/sonner';

import './index.css';
import { router } from './router';
import { TooltipProvider } from './components/ui/tooltip';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: true
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Suspense
          fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}
        >
          <RouterProvider router={router} />
          <Toaster />
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>
);
