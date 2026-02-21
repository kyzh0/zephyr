import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
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
import { deleteStation, getStationById, patchStation } from '@/services/station.service';
import type { IStation } from '@/models/station.model';
import { lookupElevation } from '@/lib/utils';
import { useState } from 'react';

const coordinatesSchema = z.string().refine(
  (val) => {
    const parts = val.replace(/\s/g, '').split(',');
    if (parts.length !== 2) return false;
    const [lat, lon] = parts.map(Number);
    return !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  },
  { message: 'Enter valid coordinates: latitude, longitude' }
);

const validBearingsSchema = z
  .string()
  .refine(
    (val) => {
      if (!val.trim()) return true;
      const ranges = val.split(',');
      const rangePattern = /^[0-9]{3}-[0-9]{3}$/;
      return ranges.every((range) => {
        const trimmed = range.trim();
        if (!trimmed) return true;
        if (!rangePattern.test(trimmed)) return false;
        const [start, end] = trimmed.split('-').map(Number);
        return start >= 0 && start <= 360 && end >= 0 && end <= 360;
      });
    },
    { message: 'Format: 270-010,090-180 (bearings 0-360)' }
  )
  .optional()
  .or(z.literal(''));

const formSchema = z
  .object({
    name: z.string().min(1, 'Required'),
    type: z.string().min(1, 'Required'),
    externalLink: z.url('Enter a valid URL'),
    externalId: z.string().optional().or(z.literal('')),
    coordinates: coordinatesSchema,
    elevation: z.string().regex(/^-?\d+$/, 'Must be a number'),
    validBearings: validBearingsSchema,
    popupMessage: z.string().optional().or(z.literal('')),
    isDisabled: z.boolean(),
    isHighResolution: z.boolean(),
    harvestWindAverageId: z.string().optional().or(z.literal('')),
    harvestWindGustId: z.string().optional().or(z.literal('')),
    harvestWindDirectionId: z.string().optional().or(z.literal('')),
    harvestTemperatureId: z.string().optional().or(z.literal('')),
    harvestCookie: z.string().optional().or(z.literal('')),
    gwWindAverageFieldName: z.string().optional().or(z.literal('')),
    gwWindGustFieldName: z.string().optional().or(z.literal('')),
    gwWindBearingFieldName: z.string().optional().or(z.literal('')),
    gwTemperatureFieldName: z.string().optional().or(z.literal('')),
    weatherlinkCookie: z.string().optional().or(z.literal(''))
  });

type FormValues = z.infer<typeof formSchema>;

function formatCoordinates(location?: { coordinates: [number, number] }): string {
  if (!location?.coordinates) return '';
  const [lon, lat] = location.coordinates;
  return `${lat}, ${lon}`;
}

export default function AdminEditStation() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [station, setStation] = useState<IStation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [elevationLoading, setElevationLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: '',
      externalLink: '',
      externalId: '',
      coordinates: '',
      elevation: '0',
      validBearings: '',
      popupMessage: '',
      isDisabled: false,
      isHighResolution: false,
      harvestWindAverageId: '',
      harvestWindGustId: '',
      harvestWindDirectionId: '',
      harvestTemperatureId: '',
      harvestCookie: '',
      gwWindAverageFieldName: '',
      gwWindGustFieldName: '',
      gwWindBearingFieldName: '',
      gwTemperatureFieldName: '',
      weatherlinkCookie: ''
    }
  });

  const stationType = form.watch('type');
  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    if (!id) {
      navigate('/admin/stations');
      return;
    }

    async function load() {
      const data = await getStationById(id!);
      if (data) {
        setStation(data);
        form.reset({
          name: data.name,
          type: data.type,
          externalLink: data.externalLink,
          externalId: data.externalId ?? '',
          coordinates: formatCoordinates(data.location),
          elevation: String(data.elevation ?? 0),
          validBearings: data.validBearings ?? '',
          popupMessage: data.popupMessage ?? '',
          isDisabled: data.isDisabled ?? false,
          isHighResolution: data.isHighResolution ?? false,
          harvestWindAverageId: data.harvestWindAverageId ?? '',
          harvestWindGustId: data.harvestWindGustId ?? '',
          harvestWindDirectionId: data.harvestWindDirectionId ?? '',
          harvestTemperatureId: data.harvestTemperatureId ?? '',
          harvestCookie: data.harvestCookie ?? '',
          gwWindAverageFieldName: data.gwWindAverageFieldName ?? '',
          gwWindGustFieldName: data.gwWindGustFieldName ?? '',
          gwWindBearingFieldName: data.gwWindBearingFieldName ?? '',
          gwTemperatureFieldName: data.gwTemperatureFieldName ?? '',
          weatherlinkCookie: data.weatherlinkCookie ?? ''
        });
      }
      setIsLoading(false);
    }
    load();
  }, [id, navigate, form]);

  async function handleDelete() {
    if (!id) return;

    setIsDeleting(true);
    const adminKey = sessionStorage.getItem('adminKey') ?? '';
    try {
      await deleteStation(id, adminKey);
      toast.success('Station deleted');
      navigate('/admin/stations');
    } catch (error) {
      toast.error('Failed to delete station: ' + (error as Error).message);
      setIsDeleting(false);
    }
  }

  async function handleAutoElevation() {
    const coordsValue = form.getValues('coordinates');
    if (!coordsValue?.trim()) {
      toast.error('Please set coordinates first');
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
      form.setValue('elevation', String(elevation), { shouldDirty: true, shouldValidate: true });
      toast.success(`Elevation set to ${elevation} m`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setElevationLoading(false);
    }
  }

  async function onSubmit(values: FormValues) {
    if (!station || !id) return;

    const patch: Record<string, unknown> = {};
    const remove: Record<string, boolean> = {};

    const coords = values.coordinates.replace(/\s/g, '').split(',').map(Number);
    const [lat, lon] = coords;
    if (!isNaN(lat) && !isNaN(lon)) {
      patch.location = {
        type: 'Point' as const,
        coordinates: [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6]
      };
    }

    patch.name = values.name;
    patch.type = values.type;
    patch.externalLink = values.externalLink;
    patch.externalId = values.externalId?.trim();
    patch.elevation = parseInt(values.elevation, 10);
    patch.validBearings = values.validBearings?.trim();
    patch.popupMessage = values.popupMessage?.trim();
    patch.isDisabled = values.isDisabled;
    patch.isHighResolution = values.isHighResolution;

    if (values.externalId === '') remove.externalId = true;
    if (values.validBearings === '') remove.validBearings = true;
    if (values.popupMessage === '') remove.popupMessage = true;

    if (values.type === 'harvest') {
      patch.harvestWindAverageId = values.harvestWindAverageId?.trim();
      patch.harvestWindGustId = values.harvestWindGustId?.trim();
      patch.harvestWindDirectionId = values.harvestWindDirectionId?.trim();
      patch.harvestTemperatureId = values.harvestTemperatureId?.trim();
      patch.harvestCookie = values.harvestCookie?.trim();
      if (values.harvestWindAverageId === '') remove.harvestWindAverageId = true;
      if (values.harvestWindGustId === '') remove.harvestWindGustId = true;
      if (values.harvestWindDirectionId === '') remove.harvestWindDirectionId = true;
      if (values.harvestTemperatureId === '') remove.harvestTemperatureId = true;
      if (values.harvestCookie === '') remove.harvestCookie = true;
    } else {
      remove.harvestWindAverageId = true;
      remove.harvestWindGustId = true;
      remove.harvestWindDirectionId = true;
      remove.harvestTemperatureId = true;
      remove.harvestCookie = true;
    }

    if (values.type === 'gw') {
      patch.gwWindAverageFieldName = values.gwWindAverageFieldName?.trim();
      patch.gwWindGustFieldName = values.gwWindGustFieldName?.trim();
      patch.gwWindBearingFieldName = values.gwWindBearingFieldName?.trim();
      patch.gwTemperatureFieldName = values.gwTemperatureFieldName?.trim();
      if (values.gwWindAverageFieldName === '') remove.gwWindAverageFieldName = true;
      if (values.gwWindGustFieldName === '') remove.gwWindGustFieldName = true;
      if (values.gwWindBearingFieldName === '') remove.gwWindBearingFieldName = true;
      if (values.gwTemperatureFieldName === '') remove.gwTemperatureFieldName = true;
    } else {
      remove.gwWindAverageFieldName = true;
      remove.gwWindGustFieldName = true;
      remove.gwWindBearingFieldName = true;
      remove.gwTemperatureFieldName = true;
    }

    if (values.type === 'wl') {
      patch.weatherlinkCookie = values.weatherlinkCookie?.trim();
      if (values.weatherlinkCookie === '') remove.weatherlinkCookie = true;
    } else {
      remove.weatherlinkCookie = true;
    }

    const adminKey = sessionStorage.getItem('adminKey') ?? '';
    try {
      await patchStation(id, { patch, remove } as unknown as Partial<IStation>, adminKey);
      toast.success('Station updated');
      navigate('/admin/stations');
    } catch (error) {
      toast.error('Failed to update station: ' + (error as Error).message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/stations')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Edit Station</h1>
          {station && <p className="text-sm text-muted-foreground">{station.name}</p>}
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
              <AlertDialogTitle>Delete Station</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{station?.name}"? This will also delete all
                associated station data. This action cannot be undone.
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

      <main className="flex-1 p-6 overflow-auto">
        {isLoading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Basic Information</h2>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Station Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} placeholder="e.g. harvest, gw, wl, wu" />
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
                    <Button
                      type="button"
                      onClick={handleAutoElevation}
                      disabled={elevationLoading}
                    >
                      {elevationLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Auto
                    </Button>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="validBearings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid Bearings (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="000-090,180-270" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="popupMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Popup Message (optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 rounded-lg border p-4">
                  <h3 className="text-sm font-medium">Flags</h3>
                  <div className="flex flex-wrap gap-6">
                    <FormField
                      control={form.control}
                      name="isDisabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="font-normal">Disabled</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isHighResolution"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="font-normal">High Resolution</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {stationType === 'harvest' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-medium">Harvest Configuration</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="harvestWindAverageId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wind Average ID</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="harvestWindGustId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wind Gust ID</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="harvestWindDirectionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wind Direction ID</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="harvestTemperatureId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temperature ID</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="harvestCookie"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Harvest Cookie</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {stationType === 'gw' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-medium">Greater Wellington Configuration</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gwWindAverageFieldName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wind Average Field</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gwWindGustFieldName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wind Gust Field</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gwWindBearingFieldName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wind Bearing Field</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gwTemperatureFieldName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temperature Field</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {stationType === 'wl' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-medium">Weatherlink Configuration</h2>
                  <FormField
                    control={form.control}
                    name="weatherlinkCookie"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weatherlink Cookie</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !form.formState.isDirty}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        )}
      </main>
    </div>
  );
}
