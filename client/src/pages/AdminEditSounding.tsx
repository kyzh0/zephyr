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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { RASP_REGIONS, type Sounding } from '@/models/sounding.model';
import { ApiError } from '@/services/api-error';
import { useSounding, useUpdateSounding, useDeleteSounding } from '@/hooks';

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
  raspRegion: z.enum(RASP_REGIONS.map((r) => r.value)),
  raspId: z.string().min(1, 'Required'),
  coordinates: coordinatesSchema
});

type FormValues = z.infer<typeof formSchema>;

function formatCoordinates(location?: { coordinates: [number, number] }): string {
  if (!location?.coordinates) return '';
  const [lon, lat] = location.coordinates;
  return `${lat}, ${lon}`;
}

export default function AdminEditSounding() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { sounding, isLoading } = useSounding(id);
  const updateMutation = useUpdateSounding();
  const deleteMutation = useDeleteSounding();

  function handleDelete() {
    if (!id || !sounding) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Sounding deleted');
        navigate('/admin/soundings');
      },
      onError: (error) => {
        const msg = error instanceof ApiError ? error.message : 'Unknown error';
        toast.error('Failed to delete sounding: ' + msg);
      }
    });
  }

  function handleSubmit(values: FormValues) {
    if (!id || !sounding) return;

    const [lat, lon] = values.coordinates.replace(/\s/g, '').split(',').map(Number);

    const updates = {
      name: values.name,
      raspRegion: values.raspRegion,
      raspId: values.raspId,
      coordinates: [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6] as [number, number]
    };

    updateMutation.mutate(
      { id, updates },
      {
        onSuccess: () => {
          toast.success('Sounding updated');
          navigate('/admin/soundings');
        },
        onError: (error) => {
          const msg = error instanceof ApiError ? error.message : 'Unknown error';
          toast.error('Failed to update sounding: ' + msg);
        }
      }
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/soundings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Edit Sounding</h1>
          {sounding && <p className="text-sm text-muted-foreground">{sounding.name}</p>}
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
              <AlertDialogTitle>Delete Sounding</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{sounding?.name}"? This action cannot be undone.
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
        {isLoading || !sounding ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
          <SoundingForm
            sounding={sounding}
            onSubmit={handleSubmit}
            isPending={updateMutation.isPending}
          />
        )}
      </main>
    </div>
  );
}

function SoundingForm({
  sounding,
  onSubmit,
  isPending
}: {
  sounding: Sounding;
  onSubmit: (values: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: sounding.name,
      raspRegion: sounding.raspRegion as FormValues['raspRegion'],
      raspId: sounding.raspId,
      coordinates: formatCoordinates(sounding.location)
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
              <FormLabel>Sounding Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="raspRegion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RASP Region</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RASP_REGIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
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
          name="raspId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RASP ID</FormLabel>
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
              <FormLabel>Latitude, Longitude</FormLabel>
              <FormControl>
                <Input {...field} placeholder="-41.2865, 174.7762" />
              </FormControl>
              <FormMessage />
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
