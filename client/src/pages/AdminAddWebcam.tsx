import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { addCam } from "@/services/cam.service";
import { toast } from "sonner";

const coordinatesSchema = z.string().refine(
  (val) => {
    const parts = val.replace(/\s/g, "").split(",");
    if (parts.length !== 2) return false;
    const [lat, lon] = parts.map(Number);
    return (
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  },
  { message: "Enter valid coordinates: latitude, longitude" }
);

const formSchema = z.object({
  name: z.string().min(1, "Required"),
  externalId: z.string(),
  externalLink: z.url("Enter a valid URL"),
  type: z.string().min(1, "Required"),
  coordinates: coordinatesSchema,
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminAddWebcam() {
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      externalId: "",
      externalLink: "",
      type: "",
      coordinates: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    const [lat, lon] = values.coordinates
      .replace(/\s/g, "")
      .split(",")
      .map(Number);

    const cam = {
      name: values.name,
      externalId: values.externalId || undefined,
      externalLink: values.externalLink,
      type: values.type,
      coordinates: [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6],
    };

    await addCam(cam);
    toast.success("Webcam added successfully");
    navigate("/admin/dashboard");
  }

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
        <h1 className="text-xl font-semibold">Add New Webcam</h1>
      </header>

      <main className="flex-1 p-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="max-w-lg space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webcam Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="externalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External ID (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="externalLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External Link</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. weatherlink, windy" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coordinates"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Latitude, Longitude</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="-41.2865, 174.7762" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Webcam
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}
