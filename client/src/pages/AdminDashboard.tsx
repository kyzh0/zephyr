import { useNavigate } from "react-router-dom";
import { LogOut, Plus, AlertCircle, List } from "lucide-react";

import { Button } from "@/components/ui/button";

const MENU_ITEMS = [
  { label: "Add New Station", path: "/admin/add-station", icon: Plus },
  { label: "Add New Webcam", path: "/admin/add-webcam", icon: Plus },
  { label: "Add New Sounding", path: "/admin/add-sounding", icon: Plus },
  { label: "View Errors", path: "/admin/errors", icon: AlertCircle },
  {
    label: "View / Edit Stations",
    path: "/admin/edit-station-list",
    icon: List,
  },
] as const;

export default function AdminDashboard() {
  const navigate = useNavigate();

  const handleSignOut = () => {
    localStorage.removeItem("adminKey");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MENU_ITEMS.map(({ label, path, icon: Icon }) => (
            <Button
              key={path}
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => navigate(path)}
            >
              <Icon className="h-6 w-6" />
              {label}
            </Button>
          ))}
        </div>
      </main>
    </div>
  );
}
