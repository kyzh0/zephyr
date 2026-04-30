import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, RefreshCw, Trash2 } from 'lucide-react';
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

import { ApiError } from '@/services/api-error';
import type { Client } from '@/models/client.model';
import { useClient, useUpdateClient, useDeleteClient } from '@/hooks';

const formSchema = z.object({
  name: z.string().min(1, 'Required'),
  apiKey: z.string().min(1, 'Required'),
  monthlyLimit: z.number().int().min(0, 'Must be a non-negative integer')
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminEditClient() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { client, isLoading } = useClient(id);
  const updateMutation = useUpdateClient();
  const deleteMutation = useDeleteClient();

  function handleDelete() {
    if (!id || !client) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Client deleted');
        navigate('/admin/clients');
      },
      onError: (error) => {
        const msg = error instanceof ApiError ? error.message : 'Unknown error';
        toast.error('Failed to delete client: ' + msg);
      }
    });
  }

  function handleSubmit(values: FormValues) {
    if (!id || !client) return;

    updateMutation.mutate(
      {
        id,
        updates: {
          __v: client.__v,
          name: values.name,
          apiKey: values.apiKey,
          monthlyLimit: values.monthlyLimit
        }
      },
      {
        onSuccess: () => {
          toast.success('Client updated');
          navigate('/admin/clients');
        },
        onError: (error) => {
          const msg = error instanceof ApiError ? error.message : 'Unknown error';
          toast.error('Failed to update client: ' + msg);
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
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Edit Client</h1>
          {client && <p className="text-sm text-muted-foreground">{client.name}</p>}
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
              <AlertDialogTitle>Delete Client</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{client?.name}"? This action cannot be undone.
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
        {isLoading || !client ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
          <ClientForm
            client={client}
            onSubmit={handleSubmit}
            isPending={updateMutation.isPending}
          />
        )}
      </main>
    </div>
  );
}

function ClientForm({
  client,
  onSubmit,
  isPending
}: {
  client: Client;
  onSubmit: (values: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: client.name,
      apiKey: client.apiKey,
      monthlyLimit: client.monthlyLimit
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

        <Button type="submit" className="w-full" disabled={isPending || !form.formState.isDirty}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
