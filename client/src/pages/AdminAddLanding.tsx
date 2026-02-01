import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
import { addLanding } from '@/services/landing.service';
import type { ILanding } from '@/models/landing.model';
import { lookupElevation } from '@/lib/utils';

const coordinatesSchema = z.string().refine(
  (val) => {
    if (!val.trim()) return false;
    const parts = val.replace(/\s/g, '').split(',');
    if (parts.length !== 2) return false;
    const [lat, lon] = parts.map(Number);
    return !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  },
  { message: 'Enter valid coordinates: latitude, longitude' }
);

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  coordinates: coordinatesSchema,
  elevation: z
    .string()
    .regex(/^$|^\d+$/, 'Must be a number')
    .min(1, 'Elevation is required'),
  isDisabled: z.boolean(),
  description: z.string().optional(),
  mandatoryNotices: z.string().optional(),
  hazards: z.string().optional(),
  siteGuideUrl: z.url('Enter a valid URL').or(z.literal('')).optional()
});

type FormValues = z.infer<typeof formSchema>;

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

export default function AdminAddLanding() {
  const navigate = useNavigate();
  const [elevationLoading, setElevationLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      coordinates: '',
      elevation: '',
      isDisabled: false,
      description: '',
      mandatoryNotices: '',
      hazards: '',
      siteGuideUrl: ''
    }
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

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    const location = parseCoordinates(values.coordinates);
    if (!location) return;

    const landing: Partial<ILanding> = {
      name: values.name,
      location: location,
      elevation: parseInt(values.elevation, 10),
      isDisabled: values.isDisabled,
      description: values.description,
      mandatoryNotices: values.mandatoryNotices,
      hazards: values.hazards,
      siteGuideUrl: values.siteGuideUrl
    };

    try {
      await addLanding(landing);
      toast.success('Landing added successfully');
      navigate('/admin/landings');
    } catch (error) {
      toast.error(`Failed to add landing: ${(error as Error).message}`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/landings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">Add New Landing</h1>
      </header>

      <main className="flex-1 p-6">
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
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Disabled (remove refs from sites before disabling)</FormLabel>
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
                name="siteGuideUrl"
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
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Landing
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}
