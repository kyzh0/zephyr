import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

export default function ProtectedRoute() {
  const navigate = useNavigate();
  const adminKey = sessionStorage.getItem("adminKey");

  useEffect(() => {
    if (!adminKey) {
      navigate("/", { replace: true });
    }
  }, [adminKey, navigate]);

  if (!adminKey) {
    return null;
  }

  return <Outlet />;
}
