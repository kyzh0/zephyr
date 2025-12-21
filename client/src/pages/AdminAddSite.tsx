import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addSite } from "@/services/site.service";
import type { ISite } from "@/models/site.model";

const RATING_OPTIONS = ["PG1", "PG2", "PG3", "PG4", "HG1", "HG2", "HG3", "N/A"];

const coordinatesSchema = z.string().refine(
  (val) => {
    if (!val.trim()) return false;
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

const optionalCoordinatesSchema = z.string().refine(
  (val) => {
    if (!val.trim()) return true;
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

const bearingsSchema = z
  .string()
  .regex(/^$|^[0-9]{3}-[0-9]{3}(,[0-9]{3}-[0-9]{3})*$/, {
    message: "Format: 000-090,180-270",
  });

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  takeoffCoordinates: coordinatesSchema,
  landingCoordinates: optionalCoordinatesSchema,
  paraglidingRating: z.string().min(1, "Required"),
  hangGlidingRating: z.string().min(1, "Required"),
  siteGuideURL: z.string().url("Enter a valid URL").or(z.literal("")),
  validBearings: bearingsSchema,
  elevation: z.string().regex(/^$|^\d+$/, "Must be a number"),
  radio: z.string(),
  description: z.string(),
  mandatoryNotices: z.string(),
  airspaceNotices: z.string(),
  landingNotices: z.string(),
  isDisabled: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function parseCoordinates(
  value: string
): { type: "Point"; coordinates: [number, number] } | undefined {
  if (!value.trim()) return undefined;
  const [lat, lon] = value.replace(/\s/g, "").split(",").map(Number);
  return {
    type: "Point",
    coordinates: [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6],
  };
}

async function fetchElevation(
  lat: number,
  lon: number
): Promise<number | undefined> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`
    );
    const data = (await res.json()) as { elevation?: number[] };
    return data.elevation?.[0];
  } catch {
    return undefined;
  }
}

export default function AdminAddSite() {
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      takeoffCoordinates: "",
      landingCoordinates: "",
      paraglidingRating: "",
      hangGlidingRating: "",
      siteGuideURL: "",
      validBearings: "",
      elevation: "",
      radio: "",
      description: "",
      mandatoryNotices: "",
      airspaceNotices: "",
      landingNotices: "",
      isDisabled: false,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    const takeoff = parseCoordinates(values.takeoffCoordinates);
    if (!takeoff) return;

    // Auto-fetch elevation if not provided
    let elevation: number | undefined;
    if (values.elevation) {
      elevation = parseInt(values.elevation, 10);
    } else {
      const [lat, lon] = values.takeoffCoordinates
        .replace(/\s/g, "")
        .split(",")
        .map(Number);
      elevation = await fetchElevation(lat, lon);
    }

    const site: Partial<ISite> = {
      name: values.name,
      takeoffLocation: takeoff,
      rating: {
        paragliding: values.paraglidingRating,
        hangGliding: values.hangGlidingRating,
      },
      siteGuideURL: values.siteGuideURL,
      radio: values.radio,
      description: values.description,
      mandatoryNotices: values.mandatoryNotices,
      airspaceNotices: values.airspaceNotices,
      landingNotices: values.landingNotices,
      isDisabled: values.isDisabled,
    };

    const landing = parseCoordinates(values.landingCoordinates);
    if (landing) {
      site.landingLocation = landing;
    }

    if (values.validBearings) {
      site.validBearings = values.validBearings;
    }

    if (elevation !== undefined) {
      site.elevation = elevation;
    }

    await addSite(site);
    toast.success("Site added successfully");
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
        <h1 className="text-xl font-semibold">Add New Site</h1>
      </header>

      <main className="flex-1 p-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="max-w-2xl space-y-6"
          >
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Basic Information</h2>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paraglidingRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paragliding Rating</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RATING_OPTIONS.map((rating) => (
                            <SelectItem key={rating} value={rating}>
                              {rating}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hangGlidingRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hang Gliding Rating</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RATING_OPTIONS.map((rating) => (
                            <SelectItem key={rating} value={rating}>
                              {rating}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isDisabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Disabled</FormLabel>
                      <FormDescription>
                        Disable this site to hide it from the map
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Location</h2>

              <FormField
                control={form.control}
                name="takeoffCoordinates"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Takeoff Coordinates (lat, lon)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="-41.2865, 174.7762" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="landingCoordinates"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Landing Coordinates (lat, lon) - Optional
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="-41.2865, 174.7762" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="elevation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Elevation (m) - Optional</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Auto-fetched if empty"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="validBearings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid Bearings - Optional</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="000-090,180-270" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Details</h2>

              <FormField
                control={form.control}
                name="siteGuideURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site Guide URL - Optional</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" placeholder="https://" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="radio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Radio Frequency - Optional</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description - Optional</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notices */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Notices</h2>

              <FormField
                control={form.control}
                name="mandatoryNotices"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mandatory Notices - Optional</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="airspaceNotices"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Airspace Notices - Optional</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="landingNotices"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Landing Notices - Optional</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Site
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}
