import type { Webcam, WebcamImage } from '@/models/webcam.model';
import { getKeyQueryThrowIfInvalid, throwIfNotOk } from './api-error';

export async function getWebcamById(id: string): Promise<Webcam> {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/webcams/${id}`);
  await throwIfNotOk(res);
  return (await res.json()) as Webcam;
}

export async function listWebcams(includeDisabled?: boolean): Promise<Webcam[]> {
  let url = `${import.meta.env.VITE_API_PREFIX}/webcams`;
  if (includeDisabled) {
    url += '?includeDisabled=true';
  }
  const res = await fetch(url);
  await throwIfNotOk(res);
  return (await res.json()) as Webcam[];
}

export async function loadWebcamImages(id: string): Promise<WebcamImage[]> {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/webcams/${id}/images`);
  await throwIfNotOk(res);
  return (await res.json()) as WebcamImage[];
}

export async function addWebcam(webcam: Partial<Webcam>): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/webcams?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webcam)
    }
  );
  await throwIfNotOk(res);
}

export async function deleteWebcam(id: string): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/webcams/${id}?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'DELETE'
    }
  );
  await throwIfNotOk(res);
}

export async function patchWebcam(
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
    `${import.meta.env.VITE_API_PREFIX}/webcams/${id}?${getKeyQueryThrowIfInvalid()}`,
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
