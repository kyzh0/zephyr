import type { Client } from '@/models/client.model';
import { getKeyQueryThrowIfInvalid, throwIfNotOk } from './api-error';

export async function getClientById(id: string): Promise<Client> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/clients/${id}?${getKeyQueryThrowIfInvalid()}`
  );
  await throwIfNotOk(res);
  return (await res.json()) as Client;
}

export async function listClients(): Promise<Client[]> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/clients?${getKeyQueryThrowIfInvalid()}`
  );
  await throwIfNotOk(res);
  return (await res.json()) as Client[];
}

export async function addClient(client: {
  name: string;
  apiKey: string;
  monthlyLimit: number;
}): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/clients?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client)
    }
  );
  await throwIfNotOk(res);
}

export async function deleteClient(id: string): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/clients/${id}?${getKeyQueryThrowIfInvalid()}`,
    { method: 'DELETE' }
  );
  await throwIfNotOk(res);
}

export async function patchClient(id: string, updates: Partial<Client>): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/clients/${id}?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }
  );
  await throwIfNotOk(res);
}
