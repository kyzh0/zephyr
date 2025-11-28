import { useState } from "react";
import { Cctv, CheckCircle, Grid3X3, Mountain, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import emailjs from "@emailjs/browser";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SignInDialog } from "./SignInDialog";
import { WindIcon } from "./WindIcon";

export const WELCOME_STORAGE_KEY = "zephyr-welcome-dismissed";

function shouldShowWelcome(): boolean {
  const dismissed = localStorage.getItem(WELCOME_STORAGE_KEY);
  return !dismissed;
}

const formSchema = z.object({
  user_email: z.email("Email is not valid").min(1, "Email is required"),
  message: z.string().min(1, "Message is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface HelpDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function HelpDialog({
  open: controlledOpen,
  onOpenChange,
}: HelpDialogProps) {
  const [internalOpen, setInternalOpen] = useState(shouldShowWelcome);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [success, setSuccess] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const isOpen = controlledOpen ?? internalOpen;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      user_email: "",
      message: "",
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open && dontShowAgain) {
      localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    }
    setInternalOpen(open);
    onOpenChange?.(open);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID as string,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string,
        {
          user_email: data.user_email,
          message: data.message,
        },
        { publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string }
      );

      setSuccess(true);
      toast.success("Thanks for your feedback!");
      form.reset();
    } catch (error) {
      toast.error("Something went wrong, please try again.");
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
            <WindIcon
              shape="circle"
              border="none"
              color="#fbbf24"
              className="w-5 h-7 -rotate-45"
            />
          </div>
          <div className="flex items-center">Click a station for details</div>

          <div className="flex justify-end items-center">
            <WindIcon
              shape="circle"
              border="gold"
              color="#22c55e"
              className="w-5 h-7 -rotate-45"
            />
          </div>
          <div className="flex items-center">Popular sites are outlined</div>

          <div className="flex justify-end items-center">
            <WindIcon
              shape="circle"
              border="gold-valid"
              color="#86efac"
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

        {/* Contact form */}
        <div className="border-t pt-4 mt-2">
          {success ? (
            <div className="flex flex-col items-center justify-center py-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="mt-2 text-sm">Thanks for your feedback!</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Got feedback, or want a weather station added?
              </p>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-3"
                >
                  <FormField
                    control={form.control}
                    name="user_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            autoComplete="email"
                            placeholder="your@email.com"
                            className="h-9"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Message</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            placeholder="Your message..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? "Sending..." : "Send"}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>

        {/* Footer with checkbox */}
        <div className="flex items-center justify-between pt-2 border-t">
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
    </Dialog>
  );
}
