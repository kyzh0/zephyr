import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';

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
import { addStation } from '@/services/station.service';
import { STATION_TYPES, type INewStation } from '@/models/station.model';
import { toast } from 'sonner';
import { lookupElevation } from '@/lib/utils';

const coordinatesSchema = z.string().refine(
  (val) => {
    const parts = val.replace(/\s/g, '').split(',');
    if (parts.length !== 2) return false;
    const [lat, lon] = parts.map(Number);
    return !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  },
  { message: 'Enter valid coordinates: latitude, longitude' }
);

const bearingsSchema = z.string().regex(/^$|^[0-9]{3}-[0-9]{3}(,[0-9]{3}-[0-9]{3})*$/, {
  message: 'Format: 000-090,180-270'
});

const baseSchema = z.object({
  name: z.string().min(1, 'Required'),
  externalId: z.string().min(1, 'Required'),
  externalLink: z.url('Enter a valid URL'),
  type: z.string().min(1, 'Required'),
  coordinates: coordinatesSchema,
  bearings: bearingsSchema
});

const harvestSchema = baseSchema.extend({
  type: z.literal('harvest'),
  harvestConfigId: z.string().regex(/^\d+$/, 'Must be numeric'),
  harvestWindAvgGraphId: z.string().regex(/^\d+$/, 'Must be numeric'),
  harvestWindAvgTraceId: z.string().regex(/^\d+$/, 'Must be numeric'),
  harvestWindGustGraphId: z.string().regex(/^\d+$/, 'Must be numeric'),
  harvestWindGustTraceId: z.string().regex(/^\d+$/, 'Must be numeric'),
  harvestWindDirGraphId: z.string().regex(/^\d+$/, 'Must be numeric'),
  harvestWindDirTraceId: z.string().regex(/^\d+$/, 'Must be numeric'),
  harvestTempGraphId: z.string().regex(/^\d+$/, 'Must be numeric'),
  harvestTempTraceId: z.string().regex(/^\d+$/, 'Must be numeric')
});

const gwSchema = baseSchema.extend({
  type: z.literal('gw'),
  gwWindAvgFieldName: z.string().min(1, 'Required'),
  gwWindGustFieldName: z.string().min(1, 'Required'),
  gwWindBearingFieldName: z.string().min(1, 'Required'),
  gwTemperatureFieldName: z.string().min(1, 'Required')
});

const formSchema = z.discriminatedUnion('type', [
  harvestSchema,
  gwSchema,
  baseSchema.extend({
    type: z.enum([
      'holfuy',
      'metservice',
      'wu',
      'tempest',
      'attentis',
      'wow',
      'windguru',
      'windy',
      'wp'
    ])
  })
]);

type FormValues = z.infer<typeof formSchema>;

export default function AdminAddStation() {
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      externalId: '',
      externalLink: '',
      type: '' as FormValues['type'],
      coordinates: '',
      bearings: ''
    }
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const stationType = form.watch('type');
  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    const [lat, lon] = values.coordinates.replace(/\s/g, '').split(',').map(Number);

    let elevation = 0;
    try {
      elevation = await lookupElevation(lat, lon);
    } catch {
      toast.error('Error fetching elevation data');
    }

    const station: INewStation = {
      name: values.name,
      type: values.type,
      coordinates: [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6],
      externalLink: values.externalLink,
      externalId: values.externalId,
      ...(elevation !== undefined && { elevation }),
      ...(values.bearings && { validBearings: values.bearings })
    };

    if (values.type === 'harvest') {
      const v = values;
      station.externalId = `${v.externalId}_${v.harvestConfigId}`;
      station.harvestWindAverageId = `${v.harvestWindAvgGraphId}_${v.harvestWindAvgTraceId}`;
      station.harvestWindGustId = `${v.harvestWindGustGraphId}_${v.harvestWindGustTraceId}`;
      station.harvestWindDirectionId = `${v.harvestWindDirGraphId}_${v.harvestWindDirTraceId}`;
      station.harvestTemperatureId = `${v.harvestTempGraphId}_${v.harvestTempTraceId}`;
    }

    if (values.type === 'gw') {
      const v = values;
      station.gwWindAverageFieldName = v.gwWindAvgFieldName;
      station.gwWindGustFieldName = v.gwWindGustFieldName;
      station.gwWindBearingFieldName = v.gwWindBearingFieldName;
      station.gwTemperatureFieldName = v.gwTemperatureFieldName;
    }

    await addStation(station);
    toast.success('Station added successfully');
    navigate('/admin/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">Add New Station</h1>
      </header>

      <main className="flex-1 p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-lg space-y-4">
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATION_TYPES.map(({ value, label }) => (
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

            <div className={stationType === 'harvest' ? 'grid grid-cols-2 gap-4' : ''}>
              <FormField
                control={form.control}
                name="externalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {stationType === 'harvest' && (
                <FormField
                  control={form.control}
                  name="harvestConfigId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Config ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

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
              name="bearings"
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

            {stationType === 'harvest' && (
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-medium text-muted-foreground">Harvest Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="harvestWindAvgGraphId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wind Avg Graph ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="harvestWindAvgTraceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trace ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="harvestWindGustGraphId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wind Gust Graph ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="harvestWindGustTraceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trace ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="harvestWindDirGraphId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wind Dir Graph ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="harvestWindDirTraceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trace ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="harvestTempGraphId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temp Graph ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="harvestTempTraceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trace ID</FormLabel>
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
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Greater Wellington Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="gwWindAvgFieldName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wind Avg Field</FormLabel>
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Station
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}
