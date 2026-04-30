import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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

import { ApiError } from '@/services/api-error';
import { useAddClient } from '@/hooks';

const formSchema = z.object({
  name: z.string().min(1, 'Required'),
  apiKey: z.string().min(1, 'Required'),
  monthlyLimit: z.number().int().min(0, 'Must be a non-negative integer')
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminAddClient() {
  const navigate = useNavigate();
  const addMutation = useAddClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      apiKey: '',
      monthlyLimit: 5000
    }
  });

  function onSubmit(values: FormValues) {
    addMutation.mutate(
      { name: values.name, apiKey: values.apiKey, monthlyLimit: values.monthlyLimit },
      {
        onSuccess: () => {
          toast.success('Client added successfully');
          navigate('/admin/clients');
        },
        onError: (error) => {
          const msg = error instanceof ApiError ? error.message : 'Unknown error';
          toast.error('Failed to add client: ' + msg);
        }
      }
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/clients')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">Add New Client</h1>
      </header>

      <main className="flex-1 p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-lg space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => field.onChange(crypto.randomUUID())}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monthlyLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Limit</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={0}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Client
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}
