import type { Site } from '@/models/site.model';
import { getKeyQueryThrowIfInvalid, throwIfNotOk } from './api-error';

export async function getSiteById(id: string): Promise<Site> {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/sites/${id}`, { cache: 'no-store' });
  await throwIfNotOk(res);
  return (await res.json()) as Site;
}

export async function listSites(includeDisabled?: boolean): Promise<Site[]> {
  let url = `${import.meta.env.VITE_API_PREFIX}/sites`;
  if (includeDisabled) url += '?includeDisabled=true';
  const res = await fetch(url);
  await throwIfNotOk(res);
  return (await res.json()) as Site[];
}

export async function addSite(site: Partial<Site>): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/sites?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(site)
    }
  );
  await throwIfNotOk(res);
}

export async function updateSite(id: string, updates: Partial<Site>): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/sites/${id}?${getKeyQueryThrowIfInvalid()}`,
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

export async function deleteSite(id: string): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/sites/${id}?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'DELETE'
    }
  );
  await throwIfNotOk(res);
}

export async function uploadSiteImage(id: string, file: File, caption: string): Promise<void> {
  const body = new FormData();
  body.append('file', file);
  body.append('caption', caption);
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/sites/${id}/images?${getKeyQueryThrowIfInvalid()}`,
    { method: 'POST', body }
  );
  await throwIfNotOk(res);
}

export async function deleteSiteImage(id: string, filename: string): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/sites/${id}/images/${filename}?${getKeyQueryThrowIfInvalid()}`,
    { method: 'DELETE' }
  );
  await throwIfNotOk(res);
}

export async function updateSiteImageCaption(
  id: string,
  filename: string,
  caption: string
): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/sites/${id}/images/${filename}?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption })
    }
  );
  await throwIfNotOk(res);
}
