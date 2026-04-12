import type { Landing } from '@/models/landing.model';
import { getKeyQueryThrowIfInvalid, throwIfNotOk } from './api-error';

export async function getLandingById(id: string): Promise<Landing> {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/landings/${id}`);
  await throwIfNotOk(res);
  return (await res.json()) as Landing;
}

export async function listLandings(includeDisabled?: boolean): Promise<Landing[]> {
  let url = `${import.meta.env.VITE_API_PREFIX}/landings`;
  if (includeDisabled) url += '?includeDisabled=true';
  const res = await fetch(url);
  await throwIfNotOk(res);
  return (await res.json()) as Landing[];
}

export async function addLanding(landing: Partial<Landing>): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/landings?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(landing)
    }
  );
  await throwIfNotOk(res);
}

export async function updateLanding(id: string, updates: Partial<Landing>): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/landings/${id}?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );
  await throwIfNotOk(res);
}

export async function deleteLanding(id: string): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/landings/${id}?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'DELETE'
    }
  );
  await throwIfNotOk(res);
}
