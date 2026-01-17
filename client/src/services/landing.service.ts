import type { ILanding } from "@/models/landing.model";

export const getLandingById = async (id: string) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/landings/${id}`
    );
    return (await res.json()) as ILanding;
  } catch (error) {
    console.error(error);
  }
};

export const listLandings = async (includeDisabled?: boolean) => {
  try {
    let url = `${import.meta.env.VITE_API_PREFIX}/landings`;
    if (includeDisabled) url += "?includeDisabled=true";
    const res = await fetch(url);
    return (await res.json()) as ILanding[];
  } catch (error) {
    console.error(error);
  }
};

export async function addLanding(landing: Partial<ILanding>) {
  try {
    const key = sessionStorage.getItem("adminKey") ?? "";
    await fetch(`${import.meta.env.VITE_API_PREFIX}/landings?key=${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(landing),
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function patchLanding(
  id: string,
  updates: Partial<ILanding>,
  key: string
) {
  try {
    await fetch(
      `${import.meta.env.VITE_API_PREFIX}/landings/${id}?key=${key}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      }
    );
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function deleteLanding(id: string, key: string) {
  try {
    await fetch(
      `${import.meta.env.VITE_API_PREFIX}/landings/${id}?key=${key}`,
      {
        method: "DELETE",
      }
    );
    return { success: true };
  } catch (error) {
    console.error(error);
    throw error;
  }
}
