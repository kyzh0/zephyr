import { createBrowserRouter, Outlet } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Import the route components we've created
import Map from "./pages/Map";
import Station from "./pages/Station";
import Webcam from "./pages/Webcam";
import Sounding from "./pages/Sounding";
import AdminSignIn from "./pages/AdminSignIn";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./pages/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Outlet />,
    errorElement: <ErrorBoundary />,
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
        path: "admin/sign-in",
        element: <AdminSignIn />,
      },
      {
        path: "admin",
        element: <ProtectedRoute />,
        children: [
          {
            path: "dashboard",
            element: <AdminDashboard />,
          },
          // TODO: Add other admin routes as needed
          // {
          //   path: "add-station",
          //   element: <AdminAddStation />,
          // },
        ],
      },
    ],
  },
]);
