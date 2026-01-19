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
import { listLandings } from "@/services/landing.service";
import type { ISite, UpdateSiteDto } from "@/models/site.model";
import type { ILanding } from "@/models/landing.model";
import { lookupElevation } from "@/lib/utils";

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
  { message: "Enter valid coordinates: latitude, longitude" },
);

const bearingsSchema = z
  .string()
  .refine(
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
    { message: "Format: 270-010,090-180 (bearings 0-360)" },
  )
  .min(1, "Bearings are required");

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  coordinates: coordinatesSchema,
  elevation: z
    .string()
    .regex(/^$|^\d+$/, "Must be a number")
    .min(1, "Elevation is required"),
  validBearings: bearingsSchema,
  landingIds: z.array(z.string().min(1)).optional(),
  isDisabled: z.boolean(),
  description: z.string().optional(),
  mandatoryNotices: z.string().optional(),
  siteGuideUrl: z.url("Enter a valid URL").or(z.literal("")).optional(),
  hazards: z.string().optional(),
  access: z.string().optional(),
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
  value: string,
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
  const [elevationLoading, setElevationLoading] = useState(false);
  const { id } = useParams<{ id: string }>();

  const [site, setSite] = useState<ISite | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [landings, setLandings] = useState<ILanding[]>([]);
  useEffect(() => {
    async function fetchLandings() {
      const landings = (await listLandings()) ?? [];
      landings.sort((a, b) => a.name.localeCompare(b.name));
      setLandings(landings);
    }
    fetchLandings();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      coordinates: "",
      elevation: "",
      validBearings: "",
      landingIds: [],
      isDisabled: false,
      description: "",
      siteGuideUrl: "",
      hazards: "",
      access: "",
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
          name: data.name,
          coordinates: formatCoordinates(data.location),
          elevation: data.elevation.toString(),
          validBearings: data.validBearings,
          landingIds: data.landings?.map((l) => l.landingId) ?? [],
          isDisabled: data.isDisabled,
          description: data.description ?? "",
          mandatoryNotices: data.mandatoryNotices ?? "",
          siteGuideUrl: data.siteGuideUrl ?? "",
          hazards: data.hazards ?? "",
          access: data.access ?? "",
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

  async function handleAutoElevation() {
    const coordsValue = form.getValues("coordinates");

    if (!coordsValue?.trim()) {
      toast.error("Please select coordinates first");
      return;
    }

    const parts = coordsValue.replace(/\s/g, "").split(",");
    if (parts.length !== 2) {
      toast.error("Invalid coordinates");
      return;
    }

    const [lat, lon] = parts.map(Number);
    if (isNaN(lat) || isNaN(lon)) {
      toast.error("Invalid coordinates");
      return;
    }

    try {
      setElevationLoading(true);

      const elevation = await lookupElevation(lat, lon);
      form.setValue("elevation", elevation.toString(), {
        shouldDirty: true,
        shouldValidate: true,
      });

      toast.success(`Elevation set to ${elevation} m`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setElevationLoading(false);
    }
  }

  async function onSubmit(values: FormValues) {
    if (!site) return;

    const updates: UpdateSiteDto = {
      _id: site._id,
      __v: site.__v,
      name: values.name,
      location: site.location,
      elevation: parseInt(values.elevation, 10),
      validBearings: values.validBearings,
      landingIds: values.landingIds ?? [],
      isDisabled: values.isDisabled,
      description: values.description,
      mandatoryNotices: values.mandatoryNotices,
      siteGuideUrl: values.siteGuideUrl,
      hazards: values.hazards,
      access: values.access,
    };

    const location = parseCoordinates(values.coordinates);
    if (location) {
      updates.location = location;
    }

    const adminKey = sessionStorage.getItem("adminKey") ?? "";
    try {
      await patchSite(id!, updates, adminKey);
      toast.success("Site updated");
      navigate(`/admin/sites`);
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

                <FormField
                  control={form.control}
                  name="landingIds"
                  render={({ field }) => {
                    const selectedIds = field.value ?? [];

                    return (
                      <FormItem>
                        <FormLabel>Landings</FormLabel>

                        <div className="space-y-2 rounded-md border p-3">
                          <div className="max-h-[60px] overflow-y-auto space-y-1">
                            {landings.map((landing) => {
                              const checked = selectedIds.includes(landing._id);

                              return (
                                <div
                                  key={landing._id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(isChecked) => {
                                      if (isChecked) {
                                        field.onChange([
                                          ...selectedIds,
                                          landing._id,
                                        ]);
                                      } else {
                                        field.onChange(
                                          selectedIds.filter(
                                            (id) => id !== landing._id,
                                          ),
                                        );
                                      }
                                    }}
                                  />
                                  <span className="text-sm">
                                    {landing.name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

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
                  name="coordinates"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coordinates (lat, lon)</FormLabel>
                      <FormDescription>
                        Click on the map to set the location
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

                <div className="grid grid-cols-3 gap-2">
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

                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={handleAutoElevation}
                      disabled={elevationLoading}
                    >
                      {elevationLoading && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Auto
                    </Button>
                  </div>

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
                  name="siteGuideUrl"
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
                  name="hazards"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hazards - Optional</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="access"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access - Optional</FormLabel>
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
