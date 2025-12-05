import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { listStationsWithErrors } from "@/services/station.service";
import type { IStation } from "@/models/station.model";

export default function AdminErrors() {
  const navigate = useNavigate();
  const [stations, setStations] = useState<IStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await listStationsWithErrors();
      if (data?.length) {
        setStations(data);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">Errors</h1>
        <span className="text-sm text-muted-foreground">
          {stations.length} stations
        </span>
      </header>

      <main className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 text-muted-foreground">Loading...</div>
        ) : stations.length === 0 ? (
          <div className="p-6 text-muted-foreground">
            No stations with errors
          </div>
        ) : (
          <ul className="divide-y">
            {stations.map((station) => (
              <li key={station._id}>
                <button
                  type="button"
                  className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  onClick={() => navigate(`/stations/${station._id}`)}
                >
                  <div>
                    <span className="truncate">{station.name}</span>
                    {station.isOffline && (
                      <span className="ml-2 text-xs text-red-500">Offline</span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
