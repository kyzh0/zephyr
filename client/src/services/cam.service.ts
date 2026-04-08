import type { ICam, ICamImage } from '@/models/cam.model';
import { getKeyQueryThrowIfInvalid, throwIfNotOk } from './api-error';

export async function getCamById(id: string) {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/cams/${id}`);
  await throwIfNotOk(res);
  return (await res.json()) as ICam;
}

export async function listCams(includeDisabled?: boolean) {
  let url = `${import.meta.env.VITE_API_PREFIX}/cams`;
  if (includeDisabled) {
    url += '?includeDisabled=true';
  }
  const res = await fetch(url);
  await throwIfNotOk(res);
  return (await res.json()) as ICam[];
}

export async function loadCamImages(id: string) {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/cams/${id}/images`);
  await throwIfNotOk(res);
  return (await res.json()) as ICamImage[];
}

export async function addCam(cam: Partial<ICam>): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/cams?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cam)
    }
  );
  await throwIfNotOk(res);
}

export async function deleteCam(id: string): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/cams/${id}?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'DELETE'
    }
  );
  await throwIfNotOk(res);
}

export async function patchCam(
  id: string,
  updates: {
    name?: string;
    type?: string;
    coordinates?: [number, number];
    externalLink?: string;
    externalId?: string;
    isDisabled?: boolean;
  }
): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/cams/${id}?${getKeyQueryThrowIfInvalid()}`,
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
