import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { getCamById, patchCam } from '@/services/cam.service';
import type { ICam } from '@/models/cam.model';
import { toast } from 'sonner';
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

const formSchema = z.object({
  name: z.string().min(1, 'Required'),
  externalId: z.string(),
  externalLink: z.url('Enter a valid URL'),
  type: z.string().min(1, 'Required'),
  coordinates: coordinatesSchema,
  isDisabled: z.boolean()
});

type FormValues = z.infer<typeof formSchema>;

function formatCoordinates(location?: { coordinates: [number, number] }): string {
  if (!location?.coordinates) return '';
  const [lon, lat] = location.coordinates;
  return `${lat}, ${lon}`;
}

export default function AdminEditWebcam() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [cam, setCam] = useState<ICam | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      externalId: '',
      externalLink: '',
      type: '',
      coordinates: '',
      isDisabled: false
    }
  });

  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    if (!id) {
      navigate('/admin/webcams');
      return;
    }

    async function load() {
      const data = await getCamById(id!);
      if (data) {
        setCam(data);
        form.reset({
          name: data.name,
          externalId: data.externalId ?? '',
          externalLink: data.externalLink,
          type: data.type,
          coordinates: formatCoordinates(data.location),
          isDisabled: data.isDisabled ?? false
        });
      }
      setIsLoading(false);
    }
    load();
  }, [id, navigate, form]);

  async function onSubmit(values: FormValues) {
    if (!id) return;

    const [lat, lon] = values.coordinates.replace(/\s/g, '').split(',').map(Number);

    const updates = {
      name: values.name,
      externalId: values.externalId || undefined,
      externalLink: values.externalLink,
      type: values.type,
      coordinates: [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6] as [number, number],
      isDisabled: values.isDisabled
    };

    const adminKey = sessionStorage.getItem('adminKey') ?? '';
    try {
      await patchCam(id, updates, adminKey);
      toast.success('Webcam updated');
      navigate('/admin/webcams');
    } catch (error) {
      toast.error('Failed to update webcam: ' + (error as Error).message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/webcams')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Edit Webcam</h1>
          {cam && <p className="text-sm text-muted-foreground">{cam.name}</p>}
        </div>
      </header>

      <main className="flex-1 p-6">
        {isLoading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-lg space-y-4">
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

              <FormField
                control={form.control}
                name="isDisabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Disabled</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

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
