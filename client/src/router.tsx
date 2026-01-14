import { createBrowserRouter, Outlet } from "react-router-dom";

// Import the route components we've created
import MapWrapper from "./pages/MapWrapper";
import Station from "./pages/Station";
import Webcam from "./pages/Webcam";
import Sounding from "./pages/Sounding";
import Site from "./pages/Site";
import GridView from "./pages/GridView";
import ExportMapData from "./pages/ExportMapData";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAddStation from "./pages/AdminAddStation";
import AdminAddWebcam from "./pages/AdminAddWebcam";
import AdminAddSounding from "./pages/AdminAddSounding";
import AdminAddSite from "./pages/AdminAddSite";
import AdminEditStation from "./pages/AdminEditStation";
import AdminEditSite from "./pages/AdminEditSite";
import ProtectedRoute from "./pages/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Outlet />,
    children: [
      {
        path: "",
        element: <MapWrapper />,
        children: [
          {
            // Index route renders Map on desktop (handled by MapWrapper)
            // On mobile, this will be empty so we need Map here
            index: true,
            element: null,
          },
          {
            path: "stations/:id",
            element: <Station />,
          },
          {
            path: "webcams/:id",
            element: <Webcam />,
          },
          {
            path: "soundings/:id",
            element: <Sounding />,
          },
          {
            path: "sites/:id",
            element: <Site />,
          },
          {
            path: "grid",
            element: <GridView />,
          },
          {
            path: "export-map-data",
            element: <ExportMapData />,
          },
        ],
      },
      {
        path: "admin",
        element: <ProtectedRoute />,
        children: [
          {
            path: "dashboard",
            element: <AdminDashboard />,
          },
          {
            path: "stations",
            element: <AdminDashboard tab="stations" />,
          },
          {
            path: "webcams",
            element: <AdminDashboard tab="webcams" />,
          },
          {
            path: "soundings",
            element: <AdminDashboard tab="soundings" />,
          },
          {
            path: "sites",
            element: <AdminDashboard tab="sites" />,
          },
          {
            path: "stations/add",
            element: <AdminAddStation />,
          },
          {
            path: "webcams/add",
            element: <AdminAddWebcam />,
          },
          {
            path: "soundings/add",
            element: <AdminAddSounding />,
          },
          {
            path: "sites/add",
            element: <AdminAddSite />,
          },
          {
            path: "stations/:id",
            element: <AdminEditStation />,
          },
          {
            path: "sites/:id",
            element: <AdminEditSite />,
          },
        ],
      },
    ],
  },
]);
