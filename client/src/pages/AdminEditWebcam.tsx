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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';

import { ApiError } from '@/services/api-error';
import type { ICam } from '@/models/cam.model';
import { useWebcam, useUpdateWebcam, useDeleteWebcam } from '@/hooks';

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
  const { webcam: cam, isLoading } = useWebcam(id);
  const updateMutation = useUpdateWebcam();
  const deleteMutation = useDeleteWebcam();

  function handleDelete() {
    if (!id || !cam) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Webcam deleted');
        navigate('/admin/webcams');
      },
      onError: (error) => {
        const msg = error instanceof ApiError ? error.message : 'Unknown error';
        toast.error('Failed to delete webcam: ' + msg);
      }
    });
  }

  function handleSubmit(values: FormValues) {
    if (!id || !cam) return;

    const [lat, lon] = values.coordinates.replace(/\s/g, '').split(',').map(Number);

    const updates = {
      name: values.name,
      externalId: values.externalId || undefined,
      externalLink: values.externalLink,
      type: values.type,
      coordinates: [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6] as [number, number],
      isDisabled: values.isDisabled
    };

    updateMutation.mutate(
      { id, updates },
      {
        onSuccess: () => {
          toast.success('Webcam updated');
          navigate('/admin/webcams');
        },
        onError: (error) => {
          const msg = error instanceof ApiError ? error.message : 'Unknown error';
          toast.error('Failed to update webcam: ' + msg);
        }
      }
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/webcams')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Edit Webcam</h1>
          {cam && <p className="text-sm text-muted-foreground">{cam.name}</p>}
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
              <AlertDialogTitle>Delete Webcam</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{cam?.name}"? This action cannot be undone.
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
        {isLoading || !cam ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
          <WebcamForm cam={cam} onSubmit={handleSubmit} isPending={updateMutation.isPending} />
        )}
      </main>
    </div>
  );
}

function WebcamForm({
  cam,
  onSubmit,
  isPending
}: {
  cam: ICam;
  onSubmit: (values: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: cam.name,
      externalId: cam.externalId ?? '',
      externalLink: cam.externalLink,
      type: cam.type,
      coordinates: formatCoordinates(cam.location),
      isDisabled: cam.isDisabled ?? false
    }
  });

  return (
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

        <Button type="submit" className="w-full" disabled={isPending || !form.formState.isDirty}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
