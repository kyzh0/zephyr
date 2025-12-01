import { useState } from "react";
import { Cctv, Grid3X3, Mountain, TrendingUp, Mail } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SignInDialog } from "./SignInDialog";
import { ContactDialog } from "./ContactDialog";

export const WELCOME_STORAGE_KEY = "zephyr-welcome-dismissed";

function shouldShowWelcome(): boolean {
  const dismissed = localStorage.getItem(WELCOME_STORAGE_KEY);
  return !dismissed;
}

interface HelpDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function HelpDialog({
  open: controlledOpen,
  onOpenChange,
}: HelpDialogProps) {
  const [internalOpen, setInternalOpen] = useState(shouldShowWelcome);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [signInOpen, setSignInOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const isOpen = controlledOpen ?? internalOpen;

  const handleOpenChange = (open: boolean) => {
    if (!open && dontShowAgain) {
      localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    }
    setInternalOpen(open);
    onOpenChange?.(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center sm:text-center">
          <div className="flex justify-between items-start">
            <button
              type="button"
              onClick={() => setSignInOpen(true)}
              className="text-xs text-transparent hover:text-transparent cursor-default select-none"
            >
              admin
            </button>
          </div>
          <div className="flex justify-center mb-2">
            <img src="/logo192.png" className="w-16 h-16" alt="Zephyr Logo" />
          </div>
          <DialogTitle className="text-xl">Welcome to Zephyr</DialogTitle>
          <DialogDescription>
            Live weather data for paragliding and hang gliding in New Zealand
          </DialogDescription>
        </DialogHeader>

        {/* Guide content */}
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <div className="flex justify-end items-center">
            <img
              src="/circle-yellow.png"
              alt="Station marker"
              className="w-5 h-7 -rotate-45"
            />
          </div>
          <div className="flex items-center">Click a station for details</div>

          <div className="flex justify-end items-center">
            <img
              src="/gold-circle-green.png"
              alt="Popular site marker"
              className="w-5 h-7 -rotate-45"
            />
          </div>
          <div className="flex items-center">Popular sites are outlined</div>

          <div className="flex justify-end items-center">
            <img
              src="/gold-valid-arrow-light-green.png"
              alt="Favourable wind marker"
              className="w-5 h-7 -rotate-45"
            />
          </div>
          <div className="flex items-center">
            Green tail = favourable wind direction
          </div>

          <div className="flex justify-end items-center">
            <Cctv className="w-6 h-6" />
          </div>
          <div className="flex items-center">Webcam overlay</div>

          <div className="flex justify-end items-center">
            <Mountain className="w-6 h-6" />
          </div>
          <div className="flex items-center">
            Elevation border (each dash = 250m)
          </div>

          <div className="flex justify-end items-center">
            <Grid3X3 className="w-6 h-6" />
          </div>
          <div className="flex items-center">Live grid view</div>

          <div className="flex justify-end items-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex items-center">RASP Skew-T soundings</div>
        </div>

        {/* Contact link */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setContactOpen(true)}
          >
            <Mail className="h-4 w-4 mr-2" />
            Contact Us
          </Button>
        </div>

        {/* Footer with checkbox */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <Label
              htmlFor="dontShowAgain"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Don't show again on startup
            </Label>
          </div>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />
    </Dialog>
  );
}
