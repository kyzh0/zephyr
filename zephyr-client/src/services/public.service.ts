export async function exportXlsx(
  key: string,
  unixFrom: number,
  unixTo: number,
  lat: number,
  lon: number,
  radius: number
) {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_PREFIX}/v1/export-xlsx?key=${key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ unixFrom, unixTo, lat, lon, radius }),
      }
    );
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return "INVALID KEY";
      }
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.url;
  } catch (error) {
    console.error(error);
  }
}
