import { useState } from "react";
import {
  HelpCircle,
  Grid3X3,
  TrendingUp,
  Layers,
  HandHelping,
  Cctv,
  LocateFixed,
} from "lucide-react";
import { DonateDialog } from "./DonateDialog";
import { HelpDialog, WELCOME_STORAGE_KEY } from "./HelpDialog";
import { GridViewDialog } from "./GridViewDialog";
import { HistorySlider } from "./HistorySlider";
import { ElevationSlider } from "./ElevationSlider";
import type { WindUnit } from "./map.types";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MapControlButtonsProps {
  onWebcamClick: () => void;
  onSoundingClick: () => void;
  onLayerToggle: () => void;
  onLocateClick: () => void;
  unit: WindUnit;
  onUnitToggle: () => void;
  historyOffset: number;
  onHistoryChange: (offset: number) => void;
  isHistoricData: boolean;
  showElevation: boolean;
  elevationFilter: number;
  onToggleElevation: () => void;
  onElevationChange: (value: number) => void;
}

export function MapControlButtons({
  onWebcamClick,
  onSoundingClick,
  onLayerToggle,
  onLocateClick,
  unit,
  onUnitToggle,
  historyOffset,
  onHistoryChange,
  isHistoricData,
  showElevation,
  elevationFilter,
  onToggleElevation,
  onElevationChange,
}: MapControlButtonsProps) {
  const [donateOpen, setDonateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(
    localStorage.getItem(WELCOME_STORAGE_KEY) !== "true"
  );
  const [gridOpen, setGridOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2 items-start absolute top-2.5 left-2.5 z-50">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}>
            <HelpCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>View Help</TooltipContent>
      </Tooltip>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDonateOpen(true)}
          >
            <HandHelping className="h-4 w-4 opacity-70" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Donate to support Zephyr</TooltipContent>
      </Tooltip>
      <DonateDialog open={donateOpen} onOpenChange={setDonateOpen} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGridOpen(true)}
            disabled={isHistoricData}
          >
            <Grid3X3 className="h-4 w-4 opacity-70" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Grid View of Nearby Weather Stations</TooltipContent>
      </Tooltip>
      <GridViewDialog open={gridOpen} onOpenChange={setGridOpen} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            variant="outline"
            size="sm"
            onClick={onWebcamClick}
            disabled={isHistoricData}
            className="bg-background data-[state=on]:*:[svg]:fill-blue-500 data-[state=on]:*:[svg]:stroke-blue-500"
          >
            <Cctv className="h-4 w-4 opacity-70" />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>Show Webcams on Map</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            variant="outline"
            size="sm"
            onClick={onSoundingClick}
            disabled={isHistoricData}
            className="bg-background data-[state=on]:*:[svg]:fill-blue-500 data-[state=on]:*:[svg]:stroke-blue-500"
          >
            <TrendingUp className="h-4 w-4 opacity-70" />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>Show Soundings on Map</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            variant="outline"
            size="sm"
            onClick={onLayerToggle}
            className="bg-background data-[state=on]:*:[svg]:fill-blue-500 data-[state=on]:*:[svg]:stroke-blue-500"
          >
            <Layers className="h-4 w-4 opacity-70" />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>Switch Map Layer</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={onLocateClick}>
            <LocateFixed className="h-4 w-4 opacity-70" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Find My Location</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            variant="outline"
            size="sm"
            onClick={onUnitToggle}
            className="text-xs font-semibold bg-background"
          >
            {unit === "kt" ? "kt" : "km/h"}
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>Toggle Units</TooltipContent>
      </Tooltip>
      <ElevationSlider
        showElevation={showElevation}
        elevationFilter={elevationFilter}
        onToggleElevation={onToggleElevation}
        onElevationChange={onElevationChange}
      />
      <HistorySlider
        historyOffset={historyOffset}
        onHistoryChange={onHistoryChange}
      />
    </div>
  );
}
