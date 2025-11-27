import { Outlet, Navigate } from "react-router-dom";
import { useState } from "react";

export default function ProtectedRoute() {
  // TODO: Replace with actual authentication logic
  const [isAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/admin/sign-in" replace />;
  }

  return <Outlet />;
}
