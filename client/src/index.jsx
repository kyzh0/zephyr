import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { CookiesProvider } from 'react-cookie';
import './index.css';

import Map from './routes/Map';
import Station from './routes/Station';
import Welcome from './routes/Welcome';
import Help from './routes/Help';
import AdminSignIn from './routes/AdminSignIn';
import AdminDashboard from './routes/AdminDashboard';
import AdminAddStation from './routes/AdminAddStation';
import AdminErrors from './routes/AdminErrors';
import ProtectedRoute from './routes/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppProvider>
        <Map />
      </AppProvider>
    ),
    children: [
      {
        path: 'stations/:id',
        element: <Station />
      },
      {
        path: 'welcome',
        element: <Welcome />
      },
      {
        path: 'help',
        element: <Help />
      },
      {
        path: 'admin/sign-in',
        element: <AdminSignIn />
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'admin/dashboard',
            element: <AdminDashboard />
          },
          {
            path: 'admin/add-station',
            element: <AdminAddStation />
          },
          {
            path: 'admin/errors',
            element: <AdminErrors />
          }
        ]
      }
    ]
  }
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CookiesProvider>
      <RouterProvider router={router} />
    </CookiesProvider>
  </React.StrictMode>
);
