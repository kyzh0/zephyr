import type { ISounding } from '@/models/sounding.model';
import { getKeyQueryThrowIfInvalid, throwIfNotOk } from './api-error';

export async function getSoundingById(id: string) {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/soundings/${id}`);
  await throwIfNotOk(res);
  return (await res.json()) as ISounding;
}

export async function listSoundings() {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/soundings`);
  await throwIfNotOk(res);
  return (await res.json()) as ISounding[];
}

export async function patchSounding(
  id: string,
  updates: {
    name?: string;
    raspRegion?: string;
    raspId?: string;
    coordinates?: [number, number];
  }
): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/soundings/${id}?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );
  await throwIfNotOk(res);
}

export async function deleteSounding(id: string): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/soundings/${id}?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'DELETE'
    }
  );
  await throwIfNotOk(res);
}

export async function addSounding(sounding: Partial<ISounding>): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/soundings?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sounding)
    }
  );
  await throwIfNotOk(res);
}
