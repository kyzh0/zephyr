import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import './index.css';

import Map, { loader as mapLoader } from './routes/Map';
import Site from './routes/Site';
import Help from './routes/Help';
import AdminSignIn from './routes/AdminSignIn';
import AdminAddSite from './routes/AdminAddSite';
import ProtectedRoute from './routes/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/',
    loader: mapLoader,
    element: <Map />,
    children: [
      {
        path: 'sites/:id',
        element: <Site />
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
            path: 'admin/add-site',
            element: <AdminAddSite />
          }
        ]
      }
    ]
  }
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
