import type { ISounding } from "@/models/sounding.model";

export async function getSoundingById(id: string) {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/soundings/${id}`
    );
    return (await res.json()) as ISounding;
  } catch (error) {
    console.error(error);
  }
}

export async function listSoundings() {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/soundings`);
    return (await res.json()) as ISounding[];
  } catch (error) {
    console.error(error);
  }
}

export async function addSounding(sounding: Partial<ISounding>) {
  try {
    const key = localStorage.getItem("adminKey") ?? "";
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/soundings?key=${key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sounding),
      }
    );
    return (await res.json()) as ISounding;
  } catch (error) {
    console.error(error);
  }
}
