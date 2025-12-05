import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listStations } from "@/services/station.service";
import type { IStation } from "@/models/station.model";

export default function AdminEditStationList() {
  const navigate = useNavigate();
  const [stations, setStations] = useState<IStation[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await listStations(true);
      if (data?.length) {
        setStations(data);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const searchResults = useMemo(() => {
    if (!stations.length) return [];
    if (!searchText.trim()) return stations;

    const query = searchText.toLowerCase();
    return stations.filter((s) => s.name.toLowerCase().includes(query));
  }, [stations, searchText]);

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
        <h1 className="text-xl font-semibold">Stations</h1>
        <span className="text-sm text-muted-foreground">
          {searchResults.length} results
        </span>
      </header>

      <div className="p-6 border-b bg-white">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stations..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <main className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 text-muted-foreground">Loading...</div>
        ) : searchResults.length === 0 ? (
          <div className="p-6 text-muted-foreground">No results</div>
        ) : (
          <ul className="divide-y">
            {searchResults.map((station) => (
              <li key={station._id}>
                <button
                  type="button"
                  className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  onClick={() => navigate(`/admin/edit-station/${station._id}`)}
                >
                  <span className="truncate">{station.name}</span>
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
