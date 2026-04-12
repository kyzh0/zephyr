/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';

import Map from './pages/Map';
import Station from './pages/Station';
import Webcam from './pages/Webcam';
import Sounding from './pages/Sounding';
import Site from './pages/Site';
import Landing from './pages/Landing';
import GridView from './pages/GridView';
import HelpDialog from './pages/HelpDialog';
import ContactDialog from './pages/ContactDialog';
import DonateDialog from './pages/DonateDialog';

const ExportMapData = lazy(() => import('./pages/ExportMapData'));

const ProtectedRoute = lazy(() => import('./pages/ProtectedRoute'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminAddStation = lazy(() => import('./pages/AdminAddStation'));
const AdminAddWebcam = lazy(() => import('./pages/AdminAddWebcam'));
const AdminAddSounding = lazy(() => import('./pages/AdminAddSounding'));
const AdminAddSite = lazy(() => import('./pages/AdminAddSite'));
const AdminAddLanding = lazy(() => import('./pages/AdminAddLanding'));
const AdminEditStation = lazy(() => import('./pages/AdminEditStation'));
const AdminEditSite = lazy(() => import('./pages/AdminEditSite'));
const AdminEditLanding = lazy(() => import('./pages/AdminEditLanding'));
const AdminEditWebcam = lazy(() => import('./pages/AdminEditWebcam'));
const AdminEditSounding = lazy(() => import('./pages/AdminEditSounding'));

import { usePageTracking } from './hooks/usePageTracking';

function RootLayout() {
  usePageTracking();
  return (
    <Suspense fallback={null}>
      <Outlet />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: '',
        element: <Map />,
        children: [
          {
            path: 'stations/:id',
            element: <Station />
          },
          {
            path: 'webcams/:id',
            element: <Webcam />
          },
          {
            path: 'soundings/:id',
            element: <Sounding />
          },
          {
            path: 'sites/:id',
            element: <Site />
          },
          {
            path: 'landings/:id',
            element: <Landing />
          },
          {
            path: 'grid',
            element: <GridView />
          },
          {
            path: 'help',
            element: <HelpDialog />
          },
          {
            path: 'donate',
            element: <DonateDialog />
          },
          {
            path: 'contact',
            element: <ContactDialog />
          },
          {
            path: 'export-map-data',
            element: <ExportMapData />
          }
        ]
      },
      {
        path: 'admin',
        element: <ProtectedRoute />,
        children: [
          {
            path: 'dashboard',
            element: <AdminDashboard />
          },
          {
            path: 'stations',
            element: <AdminDashboard tab="stations" />
          },
          {
            path: 'webcams',
            element: <AdminDashboard tab="webcams" />
          },
          {
            path: 'soundings',
            element: <AdminDashboard tab="soundings" />
          },
          {
            path: 'sites',
            element: <AdminDashboard tab="sites" />
          },
          {
            path: 'landings',
            element: <AdminDashboard tab="landings" />
          },
          {
            path: 'donations',
            element: <AdminDashboard tab="donations" />
          },
          {
            path: 'stations/add',
            element: <AdminAddStation />
          },
          {
            path: 'webcams/add',
            element: <AdminAddWebcam />
          },
          {
            path: 'soundings/add',
            element: <AdminAddSounding />
          },
          {
            path: 'sites/add',
            element: <AdminAddSite />
          },
          {
            path: 'landings/add',
            element: <AdminAddLanding />
          },
          {
            path: 'stations/:id',
            element: <AdminEditStation />
          },
          {
            path: 'sites/:id',
            element: <AdminEditSite />
          },
          {
            path: 'landings/:id',
            element: <AdminEditLanding />
          },
          {
            path: 'webcams/:id',
            element: <AdminEditWebcam />
          },
          {
            path: 'soundings/:id',
            element: <AdminEditSounding />
          }
        ]
      }
    ]
  }
]);
