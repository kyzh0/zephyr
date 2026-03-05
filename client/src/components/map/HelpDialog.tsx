import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Grid3X3, Mountain } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SignInDialog } from './SignInDialog';
import { SiteMarker } from './SiteMarker';
import { LandingMarker } from './LandingMarker';
import { StationMarker } from './StationMarker';

export const WELCOME_STORAGE_KEY = 'zephyr-welcome-dismissed';

function shouldShowWelcome(): boolean {
  const dismissed =
    window.self !== window.top || // Dismiss if iframe
    localStorage.getItem(WELCOME_STORAGE_KEY) === 'true';
  return !dismissed;
}

interface HelpDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function HelpDialog({ open: controlledOpen, onOpenChange }: HelpDialogProps) {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(shouldShowWelcome);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [signInOpen, setSignInOpen] = useState(false);

  const isOpen = controlledOpen ?? internalOpen;

  const handleOpenChange = (open: boolean) => {
    if (!open && dontShowAgain) {
      localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    }
    setInternalOpen(open);
    onOpenChange?.(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto pb-2">
        <DialogHeader className="text-center sm:text-center">
          <div className="hidden sm:flex justify-between items-start">
            <Button
              variant="link"
              onClick={() => setSignInOpen(true)}
              className="text-xs text-transparent hover:text-transparent cursor-default select-none focus-visible:ring-0 focus-visible:ring-offset-0"
              tabIndex={-1}
            >
              admin
            </Button>
          </div>
          <div className="flex justify-center mb-1 sm:mb-2">
            <img src="/logo192.png" className="w-12 h-12 sm:w-16 sm:h-16" alt="Zephyr Logo" />
          </div>
          <DialogTitle className="text-lg sm:text-xl">Welcome to Zephyr</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Live weather data for free flying in New Zealand.
          </DialogDescription>
        </DialogHeader>

        {/* Guide content */}
        <div className="flex flex-col gap-2 sm:gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 sm:gap-4 h-7 sm:h-8">
            <div className="flex justify-center items-center flex-shrink-0">
              <StationMarker speed={15} bearing={240} unit="kmh" size={40} />
            </div>
            <div className="flex items-center">Click a station for details</div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 h-7 sm:h-8">
            <div className="flex justify-center items-center flex-shrink-0">
              <StationMarker speed={15} gust={30} bearing={240} unit="kmh" size={40} />
            </div>
            <div className="flex items-center">Tails colour indicates wind gusts</div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 h-7 sm:h-8">
            <div className="flex justify-center items-center flex-shrink-0">
              <StationMarker
                speed={15}
                gust={30}
                bearing={240}
                validBearings={'220-260'}
                unit="kmh"
                size={40}
              />
            </div>
            <div className="flex items-center">Gold border indicates valid wind direction</div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 h-7 sm:h-8">
            <div className="flex justify-center items-center flex-shrink-0">
              <SiteMarker validBearings="45-140" size={30} borderWidth={5} />
            </div>
            <div className="flex items-center">PG / HG site info</div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 h-7 sm:h-8">
            <div className="flex justify-center items-center flex-shrink-0">
              <LandingMarker size={30} borderWidth={5} />
            </div>
            <div className="flex items-center">Landing info</div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 h-7 sm:h-8">
            <div className="flex justify-center items-center flex-shrink-0">
              <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex items-center">Webcam overlay</div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 h-7 sm:h-8">
            <div className="flex justify-center items-center flex-shrink-0">
              <Mountain className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex items-center">Elevation border (each dash = 250m)</div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 h-7 sm:h-8">
            <div className="flex justify-center items-center flex-shrink-0">
              <Grid3X3 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex items-center">Live grid view</div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 h-7 sm:h-8">
            <div className="flex justify-center items-center flex-shrink-0">
              <svg viewBox="0 0 18 18" className="h-4 w-4">
                <g transform="rotate(-90, 9, 9)">
                  <path d="m18,2.47l-9,6.53l-4.38,-4.38l-4.62,3.38l0,-2.48l4.83,-3.52l4.38,4.38l8.79,-6.38m0,12l-4.7,0l-4.17,3.34l-6.13,-5.93l-3,2.13l0,2.46l2.8,-2l6.2,6l5,-4l4,0l0,-2z" />
                </g>
              </svg>
            </div>
            <div className="flex items-center">RASP Skew-T soundings</div>
          </div>
        </div>

        {/* Footer with checkbox */}
        <div className="flex items-center justify-between pt-2 sm:pt-4 border-t">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              className="h-3 w-3 sm:h-4 sm:w-4"
            />
            <Label
              htmlFor="dontShowAgain"
              className="text-xs sm:text-sm text-muted-foreground cursor-pointer"
            >
              Hide on startup
            </Label>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button
              variant="link"
              className="text-xs text-muted-foreground cursor-pointer px-1 sm:px-2"
              onClick={() => {
                handleOpenChange(false);
                navigate('/export-map-data');
              }}
            >
              Export Data
            </Button>
          </div>
        </div>
      </DialogContent>

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </Dialog>
  );
}
