import { Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import { AppProvider } from './context/AppContext';

function App() {
  return (
    <AppProvider>
      <Suspense
        fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}
      >
        <Outlet />
      </Suspense>
    </AppProvider>
  );
}

export default App;
