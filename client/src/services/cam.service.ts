import type { ICam, ICamImage } from '@/models/cam.model';

export const getCamById = async (id: string) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/cams/${id}`);
    return (await res.json()) as ICam;
  } catch (error) {
    console.error(error);
  }
};

export const listCams = async (includeDisabled?: boolean) => {
  try {
    let url = `${import.meta.env.VITE_API_PREFIX}/cams`;
    if (includeDisabled) {
      url += '?includeDisabled=true';
    }
    const res = await fetch(url);
    return (await res.json()) as ICam[];
  } catch (error) {
    console.error(error);
  }
};

export async function listCamsUpdatedSince(unixTime: number, includeDisabled?: boolean) {
  try {
    let url = `${import.meta.env.VITE_API_PREFIX}/cams?unixTimeFrom=${unixTime}`;
    if (includeDisabled) {
      url += '&includeDisabled=true';
    }
    const res = await fetch(url);
    return (await res.json()) as ICam[];
  } catch (error) {
    console.error(error);
  }
}

export async function loadCamImages(id: string) {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/cams/${id}/images`);
    return (await res.json()) as ICamImage[];
  } catch (error) {
    console.error(error);
  }
}

export async function addCam(cam: Partial<ICam>) {
  try {
    const key = sessionStorage.getItem('adminKey') ?? '';
    const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/cams?key=${key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cam)
    });
    return (await res.json()) as ICam;
  } catch (error) {
    console.error(error);
  }
}
