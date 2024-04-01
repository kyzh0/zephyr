import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { CookiesProvider } from 'react-cookie';
import './index.css';

import Map from './routes/Map';
import Station from './routes/Station';
import Help from './routes/Help';
import AdminSignIn from './routes/AdminSignIn';
import AdminAddStation from './routes/AdminAddStation';
import ProtectedRoute from './routes/ProtectedRoute';
import Welcome from './routes/Welcome';

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
            path: 'admin/add-station',
            element: <AdminAddStation />
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
