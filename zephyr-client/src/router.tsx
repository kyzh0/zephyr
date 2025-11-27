import { createBrowserRouter, Outlet } from "react-router-dom";

// Import the route components we've created
import Map from "./pages/Map";
import Station from "./pages/Station";
import Webcam from "./pages/Webcam";
import Sounding from "./pages/Sounding";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAddStation from "./pages/AdminAddStation";
import AdminAddWebcam from "./pages/AdminAddWebcam";
import AdminAddSounding from "./pages/AdminAddSounding";
import AdminEditStationList from "./pages/AdminEditStationList";
import AdminEditStation from "./pages/AdminEditStation";
import AdminErrors from "./pages/AdminErrors";
import ProtectedRoute from "./pages/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Outlet />,
    children: [
      {
        path: "",
        element: <Map />,
        children: [
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
            path: "add-station",
            element: <AdminAddStation />,
          },
          {
            path: "add-webcam",
            element: <AdminAddWebcam />,
          },
          {
            path: "add-sounding",
            element: <AdminAddSounding />,
          },
          {
            path: "edit-station-list",
            element: <AdminEditStationList />,
          },
          {
            path: "edit-station/:id",
            element: <AdminEditStation />,
          },
          {
            path: "errors",
            element: <AdminErrors />,
          },
        ],
      },
    ],
  },
]);
