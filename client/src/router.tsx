import { createBrowserRouter, Outlet } from 'react-router-dom';
import { usePageTracking } from './hooks/usePageTracking';

// Import the route components we've created
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
import ExportMapData from './pages/ExportMapData';

import AdminDashboard from './pages/AdminDashboard';
import AdminAddStation from './pages/AdminAddStation';
import AdminAddWebcam from './pages/AdminAddWebcam';
import AdminAddSounding from './pages/AdminAddSounding';
import AdminAddSite from './pages/AdminAddSite';
import AdminAddLanding from './pages/AdminAddLanding';
import AdminEditStation from './pages/AdminEditStation';
import AdminEditSite from './pages/AdminEditSite';
import AdminEditLanding from './pages/AdminEditLanding';
import AdminEditWebcam from './pages/AdminEditWebcam';
import AdminEditSounding from './pages/AdminEditSounding';
import ProtectedRoute from './pages/ProtectedRoute';

// eslint-disable-next-line react-refresh/only-export-components
function RootLayout() {
  usePageTracking();
  return <Outlet />;
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
