import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Client } from '@/models/client.model';
import { ApiError } from '@/services/api-error';
import {
  addClient,
  deleteClient,
  getClientById,
  listClients,
  patchClient
} from '@/services/client.service';

export const clientKeys = {
  all: ['clients'] as const,
  detail: (id: string) => ['client', id] as const
};

export function useClients() {
  const { data, isLoading, error } = useQuery({
    queryKey: clientKeys.all,
    queryFn: listClients
  });
  return { clients: data ?? [], isLoading, error };
}

export function useClient(id: string | undefined) {
  const query = useQuery({
    queryKey: clientKeys.detail(id ?? ''),
    queryFn: id ? () => getClientById(id) : skipToken,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });
  return {
    client: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null
  };
}

export function useAddClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientKeys.all })
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Client> }) =>
      patchClient(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(id) });
    }
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteClient,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      queryClient.removeQueries({ queryKey: clientKeys.detail(id) });
    }
  });
}
