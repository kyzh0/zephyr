import type { ISite } from '@/models/site.model';

export const getSiteById = async (id: string) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/sites/${id}`);
    return (await res.json()) as ISite;
  } catch (error) {
    console.error(error);
  }
};

export const listSites = async (includeDisabled?: boolean) => {
  try {
    let url = `${import.meta.env.VITE_API_PREFIX}/sites`;
    if (includeDisabled) url += '?includeDisabled=true';
    const res = await fetch(url);
    return (await res.json()) as ISite[];
  } catch (error) {
    console.error(error);
  }
};

export async function addSite(site: Partial<ISite>) {
  try {
    const key = sessionStorage.getItem('adminKey') ?? '';
    await fetch(`${import.meta.env.VITE_API_PREFIX}/sites?key=${key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(site)
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function patchSite(id: string, updates: Partial<ISite>, key: string) {
  try {
    await fetch(`${import.meta.env.VITE_API_PREFIX}/sites/${id}?key=${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function deleteSite(id: string, key: string) {
  try {
    await fetch(`${import.meta.env.VITE_API_PREFIX}/sites/${id}?key=${key}`, {
      method: 'DELETE'
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    throw error;
  }
}
