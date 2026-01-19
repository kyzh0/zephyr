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
import {
  deleteLanding,
  getLandingById,
  patchLanding,
} from "@/services/landing.service";
import type { ILanding } from "@/models/landing.model";

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

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  coordinates: coordinatesSchema,
  elevation: z
    .string()
    .regex(/^$|^\d+$/, "Must be a number")
    .min(1, "Elevation is required"),
  isDisabled: z.boolean(),
  description: z.string().optional(),
  mandatoryNotices: z.string().optional(),
  siteGuideUrl: z.url("Enter a valid URL").or(z.literal("")).optional(),
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

export default function AdminEditLanding() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [landing, setLanding] = useState<ILanding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      coordinates: "",
      elevation: "",
      isDisabled: false,
      description: "",
      siteGuideUrl: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    if (!id) {
      navigate("/admin/landings");
      return;
    }

    async function load() {
      const data = await getLandingById(id!);
      if (data) {
        setLanding(data);
        form.reset({
          name: data.name,
          coordinates: formatCoordinates(data.location),
          elevation: data.elevation.toString(),
          isDisabled: data.isDisabled,
          description: data.description ?? "",
          mandatoryNotices: data.mandatoryNotices ?? "",
          siteGuideUrl: data.siteGuideUrl ?? "",
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
      await deleteLanding(id, adminKey);
      toast.success("Landing deleted");
      navigate("/admin/landings");
    } catch (error) {
      toast.error("Failed to delete landing: " + (error as Error).message);
      setIsDeleting(false);
    }
  }

  async function onSubmit(values: FormValues) {
    if (!landing) return;

    const updates: Partial<ILanding> = {
      name: values.name,
      elevation: parseInt(values.elevation, 10),
      isDisabled: values.isDisabled,
      description: values.description,
      mandatoryNotices: values.mandatoryNotices,
      siteGuideUrl: values.siteGuideUrl,
      __v: landing.__v,
    };

    const location = parseCoordinates(values.coordinates);
    if (location) {
      updates.location = location;
    }

    const adminKey = sessionStorage.getItem("adminKey") ?? "";
    try {
      await patchLanding(id!, updates, adminKey);
      toast.success("Site updated");
      navigate(`/admin/landings`);
    } catch (error) {
      toast.error("Failed to update landing: " + (error as Error).message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/landings")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Edit Landing</h1>
          {landing && (
            <p className="text-sm text-muted-foreground">{landing.name}</p>
          )}
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
                Are you sure you want to delete "{landing?.name}"? This action
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
                      <FormLabel>Landing Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
                        <FormLabel>
                          Disabled (remove refs from sites before disabling)
                        </FormLabel>
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
