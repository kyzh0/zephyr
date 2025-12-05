import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getStationById, patchStation } from "@/services/station.service";
import type { IStation } from "@/models/station.model";

export default function AdminEditStation() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [station, setStation] = useState<IStation | null>(null);
  const [stationData, setStationData] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      navigate("/admin/edit-station-list");
      return;
    }

    async function load() {
      const data = await getStationById(id!);
      if (data) {
        setStation(data);
        setStationData(JSON.stringify(data, null, 2));
      }
      setIsLoading(false);
    }
    load();
  }, [id, navigate]);

  async function handleSave() {
    if (!station || isSaving) return;

    setIsSaving(true);
    setError("");

    try {
      const modified = JSON.parse(stationData) as IStation;
      const originalKeys = Object.keys(station) as (keyof IStation)[];
      const newKeys = Object.keys(modified) as (keyof IStation)[];

      const patch: Record<string, unknown> = {};
      const remove: Record<string, boolean> = {};

      // Find changed and new fields
      for (const key of newKeys) {
        if (JSON.stringify(station[key]) !== JSON.stringify(modified[key])) {
          patch[key] = modified[key];
        }
      }

      // Find removed fields
      for (const key of originalKeys) {
        if (!newKeys.includes(key)) {
          remove[key] = true;
        }
      }

      const adminKey = localStorage.getItem("adminKey") ?? "";
      await patchStation(
        id!,
        { patch, remove } as unknown as Partial<IStation>,
        adminKey
      );
      toast.success("Station updated");
      navigate("/admin/edit-station-list");
    } catch {
      setError("Invalid JSON data");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/edit-station-list")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Edit Station</h1>
          {station && (
            <p className="text-sm text-muted-foreground">{station.name}</p>
          )}
        </div>
      </header>

      <main className="flex-1 p-6">
        {isLoading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
          <div className="max-w-2xl space-y-4">
            <div className="space-y-2">
              <Label htmlFor="data">Station Data (JSON)</Label>
              <Textarea
                id="data"
                value={stationData}
                onChange={(e) => setStationData(e.target.value)}
                className="font-mono text-sm min-h-[60vh]"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
