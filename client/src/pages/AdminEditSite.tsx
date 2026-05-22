import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CoordinatesPicker } from '@/components/ui/coordinates-picker';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';

import {
  useSite,
  useLandings,
  useUpdateSite,
  useDeleteSite,
  useUploadSiteImage,
  useDeleteSiteImage,
  useUpdateSiteImageCaption
} from '@/hooks';
import { PhotosEditor, type PhotoImage } from '@/components/admin/PhotosEditor';
import type { Site, UpdateSiteDto } from '@/models/site.model';
import type { Landing } from '@/models/landing.model';
import { lookupElevation } from '@/lib/utils';
import { ApiError } from '@/services/api-error';

const coordinatesSchema = z.string().refine(
  (val) => {
    if (!val.trim()) return true; // Allow empty
    const parts = val.replace(/\s/g, '').split(',');
    if (parts.length !== 2) return false;
    const [lat, lon] = parts.map(Number);
    return !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  },
  { message: 'Enter valid coordinates: latitude, longitude' }
);

const bearingsSchema = z
  .string()
  .refine(
    (val) => {
      if (!val.trim()) return true;
      const ranges = val.split(',');
      const rangePattern = /^[0-9]{3}-[0-9]{3}$/;
      return ranges.every((range) => {
        if (!rangePattern.test(range)) return false;
        const [start, end] = range.split('-').map(Number);
        return start >= 0 && start <= 360 && end >= 0 && end <= 360;
      });
    },
    { message: 'Format: 270-010,090-180 (bearings 0-360)' }
  )
  .min(1, 'Bearings are required');

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  coordinates: coordinatesSchema,
  elevation: z
    .string()
    .regex(/^$|^\d+$/, 'Must be a number')
    .min(1, 'Elevation is required'),
  validBearings: bearingsSchema,
  landingIds: z.array(z.string().min(1)).optional(),
  isDisabled: z.boolean(),
  description: z.string().optional(),
  mandatoryNotices: z.string().optional(),
  siteGuideUrl: z.url('Enter a valid URL').or(z.literal('')).optional(),
  hazards: z.string().optional(),
  access: z.string().optional(),
  otherLinks: z
    .array(
      z.object({
        link: z.url('Enter a valid URL'),
        description: z.string().min(1, 'Description is required')
      })
    )
    .optional()
});

type FormValues = z.infer<typeof formSchema>;

function formatCoordinates(location?: { coordinates: [number, number] }): string {
  if (!location?.coordinates) return '';
  const [lon, lat] = location.coordinates;
  return `${lat}, ${lon}`;
}

function parseCoordinates(
  value: string
): { type: 'Point'; coordinates: [number, number] } | undefined {
  if (!value.trim()) return undefined;
  const [lat, lon] = value.replace(/\s/g, '').split(',').map(Number);
  return {
    type: 'Point',
    coordinates: [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6]
  };
}

export default function AdminEditSite() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { site, isLoading } = useSite(id);
  const { landings } = useLandings();
  const updateMutation = useUpdateSite();
  const deleteMutation = useDeleteSite();

  function handleDelete() {
    if (!id || !site) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Site deleted');
        navigate('/admin/sites');
      },
      onError: (error) => {
        const msg = error instanceof ApiError ? error.message : 'Unknown error';
        toast.error('Failed to delete site: ' + msg);
      }
    });
  }

  function handleSubmit(values: FormValues) {
    if (!id || !site) return;

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
      otherLinks: values.otherLinks
    };

    const location = parseCoordinates(values.coordinates);
    if (location) {
      updates.location = location;
    }

    updateMutation.mutate(
      { id, updates },
      {
        onSuccess: () => {
          toast.success('Site updated');
          navigate('/admin/sites');
        },
        onError: (error) => {
          const msg = error instanceof ApiError ? error.message : 'Unknown error';
          toast.error('Failed to update site: ' + msg);
        }
      }
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/sites')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Edit Site</h1>
          {site && <p className="text-sm text-muted-foreground">{site.name}</p>}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? (
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
                Are you sure you want to delete "{site?.name}"? This action cannot be undone.
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

      <main className="flex-1 p-6 space-y-8">
        {isLoading || !site ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
          <>
            <SiteForm
              site={site}
              landings={landings}
              onSubmit={handleSubmit}
              isPending={updateMutation.isPending}
            />
            <SitePhotos siteId={id!} images={site.images ?? []} />
          </>
        )}
      </main>
    </div>
  );
}

function SiteForm({
  site,
  landings,
  onSubmit,
  isPending
}: {
  site: Site;
  landings: Landing[];
  onSubmit: (values: FormValues) => void;
  isPending: boolean;
}) {
  const [elevationLoading, setElevationLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: site.name,
      coordinates: formatCoordinates(site.location),
      elevation: site.elevation.toString(),
      validBearings: site.validBearings,
      landingIds: site.landings?.map((l) => l.landingId) ?? [],
      isDisabled: site.isDisabled,
      description: site.description ?? '',
      mandatoryNotices: site.mandatoryNotices ?? '',
      siteGuideUrl: site.siteGuideUrl ?? '',
      hazards: site.hazards ?? '',
      access: site.access ?? '',
      otherLinks: site.otherLinks ?? []
    }
  });

  const {
    fields: linkFields,
    append: appendLink,
    remove: removeLink
  } = useFieldArray({
    control: form.control,
    name: 'otherLinks'
  });

  async function handleAutoElevation() {
    const coordsValue = form.getValues('coordinates');

    if (!coordsValue?.trim()) {
      toast.error('Please select coordinates first');
      return;
    }

    const parts = coordsValue.replace(/\s/g, '').split(',');
    if (parts.length !== 2) {
      toast.error('Invalid coordinates');
      return;
    }

    const [lat, lon] = parts.map(Number);
    if (isNaN(lat) || isNaN(lon)) {
      toast.error('Invalid coordinates');
      return;
    }

    try {
      setElevationLoading(true);

      const elevation = await lookupElevation(lat, lon);
      form.setValue('elevation', elevation.toString(), {
        shouldDirty: true,
        shouldValidate: true
      });

      toast.success(`Elevation set to ${elevation} m`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setElevationLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
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
                    <div className="max-h-35 overflow-y-auto space-y-1">
                      {landings.map((landing) => {
                        const checked = selectedIds.includes(landing._id);

                        return (
                          <div key={landing._id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(isChecked) => {
                                if (isChecked) {
                                  field.onChange([...selectedIds, landing._id]);
                                } else {
                                  field.onChange(selectedIds.filter((id) => id !== landing._id));
                                }
                              }}
                            />
                            <span className="text-sm">{landing.name}</span>
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
              <FormItem className="flex items-start space-x-3 space-y-0 rounded-lg border p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
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
                <FormDescription>Click on the map to set the location</FormDescription>
                <CoordinatesPicker value={field.value} onChange={field.onChange} />
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
              <Button type="button" onClick={handleAutoElevation} disabled={elevationLoading}>
                {elevationLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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

        {/* Other Links */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Other Links - Optional</h2>

          {linkFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <FormField
                  control={form.control}
                  name={`otherLinks.${index}.link`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} type="url" placeholder="https://" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`otherLinks.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="Description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-1 shrink-0"
                onClick={() => removeLink(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendLink({ link: '', description: '' })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Link
          </Button>
        </div>

        <Button type="submit" className="w-full" disabled={isPending || !form.formState.isDirty}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}

function SitePhotos({ siteId, images }: { siteId: string; images: PhotoImage[] }) {
  return (
    <PhotosEditor
      images={images}
      uploadMutation={useUploadSiteImage(siteId)}
      deleteMutation={useDeleteSiteImage(siteId)}
      captionMutation={useUpdateSiteImageCaption(siteId)}
    />
  );
}
