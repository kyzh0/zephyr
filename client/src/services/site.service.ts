import type { ISite } from "@/models/site.model";

export const getSiteById = async (id: string) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/sites/${id}`);
    return (await res.json()) as ISite;
  } catch (error) {
    console.error(error);
  }
};

export const listSites = async () => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/sites`);
    return (await res.json()) as ISite[];
  } catch (error) {
    console.error(error);
  }
};

export async function addSite(site: Partial<ISite>) {
  try {
    const key = sessionStorage.getItem("adminKey") ?? "";
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/sites?key=${key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(site),
      }
    );
    return (await res.json()) as ISite;
  } catch (error) {
    console.error(error);
  }
}

export async function patchSite(
  id: string,
  updates: Partial<ISite>,
  key: string
) {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/sites/${id}?key=${key}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      }
    );
    return (await res.json()) as ISite;
  } catch (error) {
    console.error(error);
  }
}

export async function deleteSite(id: string, key: string) {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/sites/${id}?key=${key}`,
      {
        method: "DELETE",
      }
    );
    return (await res.json()) as { success: boolean };
  } catch (error) {
    console.error(error);
  }
}
