import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  HelpCircle,
  Grid3X3,
  TrendingUp,
  Layers,
  HandHelping,
  Cctv,
} from "lucide-react";
import { DonateDialog } from "./DonateDialog";
import { HelpDialog } from "./HelpDialog";
import { GridViewDialog } from "./GridViewDialog";
import type { WindUnit } from "./map.types";

interface MapControlButtonsProps {
  showWebcams: boolean;
  showSoundings: boolean;
  onWebcamClick: () => void;
  onSoundingClick: () => void;
  isSatellite: boolean;
  onLayerToggle: () => void;
  unit: WindUnit;
  onUnitToggle: () => void;
}

export function MapControlButtons({
  showWebcams,
  showSoundings,
  onWebcamClick,
  onSoundingClick,
  isSatellite,
  onLayerToggle,
  unit,
  onUnitToggle,
}: MapControlButtonsProps) {
  const [donateOpen, setDonateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);

  return (
    <div className="flex gap-2 items-center absolute top-2.5 left-2.5 z-50">
      <Button variant="outline" size="icon" onClick={() => setHelpOpen(true)}>
        <HelpCircle className="h-4 w-4" />
      </Button>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <Button variant="outline" size="icon" onClick={() => setDonateOpen(true)}>
        <HandHelping className="h-4 w-4 opacity-70" />
      </Button>
      <DonateDialog open={donateOpen} onOpenChange={setDonateOpen} />
      <Button
        id="grid-button"
        variant="outline"
        size="icon"
        onClick={() => setGridOpen(true)}
      >
        <Grid3X3 className="h-4 w-4 opacity-70" />
      </Button>
      <GridViewDialog open={gridOpen} onOpenChange={setGridOpen} />
      <Button
        id="webcam-button"
        variant="outline"
        size="icon"
        onClick={onWebcamClick}
      >
        <Cctv
          className={`h-4 w-4 ${showWebcams ? "opacity-100" : "opacity-50"}`}
        />
      </Button>
      <Button
        id="sounding-button"
        variant="outline"
        size="icon"
        onClick={onSoundingClick}
      >
        <TrendingUp
          className={`h-4 w-4 -rotate-90 ${
            showSoundings ? "opacity-100" : "opacity-70"
          }`}
        />
      </Button>
      <Button
        id="layer-button"
        variant="outline"
        size="icon"
        onClick={onLayerToggle}
      >
        <Layers
          className={`h-4 w-4 ${isSatellite ? "opacity-100" : "opacity-70"}`}
        />
      </Button>
      <Button
        id="unit-button"
        variant="outline"
        size="icon"
        onClick={onUnitToggle}
        className="text-xs font-semibold"
      >
        {unit === "kt" ? "kt" : "km/h"}
      </Button>
    </div>
  );
}
