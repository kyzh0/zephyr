import type { ICam, ICamImage } from "@/models/cam.model";

export const getCamById = async (id: string) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/cams/${id}`);
    const data = await res.json();
    return data as ICam;
  } catch (error) {
    console.error(error);
  }
};

export const listCams = async () => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/cams`);
    const data = await res.json();
    return data as ICam[];
  } catch (error) {
    console.error(error);
  }
};

export async function listCamsUpdatedSince(unixTime: number) {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/cams?unixTimeFrom=${unixTime}`
    );
    const data = await res.json();
    return data as ICam[];
  } catch (error) {
    console.error(error);
  }
}

export async function loadCamImages(id: string) {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/cams/${id}/images`
    );
    const data = await res.json();
    return data as ICamImage[];
  } catch (error) {
    console.error(error);
  }
}

export async function addCam(cam: Partial<ICam>) {
  try {
    const key = localStorage.getItem("adminKey") ?? "";
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/cams?key=${key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cam),
      }
    );
    const data = await res.json();
    return data as ICam;
  } catch (error) {
    console.error(error);
  }
}
