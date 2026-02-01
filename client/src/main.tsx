import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { router } from './router';
import { AppProvider } from './context/AppContext';
import { Toaster } from './components/ui/sonner';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <Suspense
        fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}
      >
        <RouterProvider router={router} />
        <Toaster />
      </Suspense>
    </AppProvider>
  </StrictMode>
);
