import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CoordinatesPicker } from "@/components/ui/coordinates-picker";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { deleteSite, getSiteById, patchSite } from "@/services/site.service";
import type { ISite } from "@/models/site.model";

const coordinatesSchema = z.string().refine(
  (val) => {
    if (!val.trim()) return true; // Allow empty
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

const bearingsSchema = z.string().refine(
  (val) => {
    if (!val.trim()) return true;
    const ranges = val.split(",");
    const rangePattern = /^[0-9]{3}-[0-9]{3}$/;
    return ranges.every((range) => {
      if (!rangePattern.test(range)) return false;
      const [start, end] = range.split("-").map(Number);
      return start >= 0 && start <= 360 && end >= 0 && end <= 360;
    });
  },
  { message: "Format: 270-010,090-180 (bearings 0-360)" }
);

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  takeoffCoordinates: coordinatesSchema,
  landingCoordinates: coordinatesSchema,
  paraglidingRating: z.string().min(1, "Required"),
  hangGlidingRating: z.string().min(1, "Required"),
  siteGuideURL: z.url("Enter a valid URL"),
  validBearings: bearingsSchema,
  elevation: z.string().regex(/^$|^\d+$/, "Must be a number"),
  description: z.string().min(1, "Description is required"),
  radio: z.string().optional(),
  mandatoryNotices: z.string().optional(),
  airspaceNotices: z.string().optional(),
  landingNotices: z.string().optional(),
  isDisabled: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function formatCoordinates(location?: {
  coordinates: [number, number];
}): string {
  if (!location?.coordinates) return "";
  const [lon, lat] = location.coordinates;
  return `${lat}, ${lon}`;
}

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

export default function AdminEditSite() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [site, setSite] = useState<ISite | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      elevation: "0",
      radio: "",
      description: "",
      mandatoryNotices: "",
      airspaceNotices: "",
      landingNotices: "",
      isDisabled: false,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    if (!id) {
      navigate("/admin/sites");
      return;
    }

    async function load() {
      const data = await getSiteById(id!);
      if (data) {
        setSite(data);
        form.reset({
          name: data.name ?? "",
          takeoffCoordinates: formatCoordinates(data.takeoffLocation),
          landingCoordinates: formatCoordinates(data.landingLocation),
          paraglidingRating: data.rating?.paragliding ?? "",
          hangGlidingRating: data.rating?.hangGliding ?? "",
          siteGuideURL: data.siteGuideUrl ?? "",
          elevation: data.elevation?.toString() ?? "",
          validBearings: data.validBearings ?? "",
          radio: data.radio ?? "",
          description: data.description ?? "",
          mandatoryNotices: data.mandatoryNotices ?? "",
          airspaceNotices: data.airspaceNotices ?? "",
          landingNotices: data.landingNotices ?? "",
          isDisabled: data.isDisabled ?? false,
        });
      }
      setIsLoading(false);
    }
    load();
  }, [id, navigate, form]);

  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!id) return;

    setIsDeleting(true);
    const adminKey = sessionStorage.getItem("adminKey") ?? "";
    try {
      await deleteSite(id, adminKey);
      toast.success("Site deleted");
      navigate("/admin/sites");
    } catch (error) {
      toast.error("Failed to delete site: " + (error as Error).message);
      setIsDeleting(false);
    }
  }

  async function onSubmit(values: FormValues) {
    if (!site) return;

    const updates: Partial<ISite> = {
      name: values.name,
      rating: {
        paragliding: values.paraglidingRating,
        hangGliding: values.hangGlidingRating,
      },
      siteGuideUrl: values.siteGuideURL,
      elevation: parseInt(values.elevation, 10),
      radio: values.radio,
      description: values.description,
      mandatoryNotices: values.mandatoryNotices,
      airspaceNotices: values.airspaceNotices,
      landingNotices: values.landingNotices,
      isDisabled: values.isDisabled,
    };

    const takeoff = parseCoordinates(values.takeoffCoordinates);
    if (takeoff) {
      updates.takeoffLocation = takeoff;
    }

    const landing = parseCoordinates(values.landingCoordinates);
    if (landing) {
      updates.landingLocation = landing;
    } else {
      updates.landingLocation = updates.takeoffLocation;
    }

    if (values.validBearings) {
      updates.validBearings = values.validBearings;
    }

    const adminKey = sessionStorage.getItem("adminKey") ?? "";
    try {
      await patchSite(id!, updates, adminKey);
      toast.success("Site updated");
      navigate(`/admin/sites/${id}`);
    } catch (error) {
      toast.error("Failed to update site: " + (error as Error).message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/sites")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Edit Site</h1>
          {site && <p className="text-sm text-muted-foreground">{site.name}</p>}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Delete</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Site</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{site?.name}"? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      <main className="flex-1 p-6">
        {isLoading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
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
                        <FormControl>
                          <Input {...field} placeholder="e.g. PG2" />
                        </FormControl>
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
                        <FormControl>
                          <Input {...field} placeholder="e.g. HG2" />
                        </FormControl>
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
                      <FormDescription>
                        Click on the map to set the takeoff location
                      </FormDescription>
                      <CoordinatesPicker
                        value={field.value}
                        onChange={field.onChange}
                      />
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
                      <FormLabel>Landing Coordinates (lat, lon)</FormLabel>
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
                        <FormLabel>Elevation (m)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" />
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
                        <FormLabel>Valid Bearings</FormLabel>
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
                      <FormLabel>Site Guide URL</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" />
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} />
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

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !form.formState.isDirty}
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </form>
          </Form>
        )}
      </main>
    </div>
  );
}
