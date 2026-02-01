export async function exportXlsx(
  key: string,
  unixFrom: number,
  unixTo: number,
  lat: number,
  lon: number,
  radius: number
): Promise<string | null> {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/v1/export-xlsx?key=${key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ unixFrom, unixTo, lat, lon, radius })
    });

    if (res.status === 401 || res.status === 403) {
      return 'INVALID KEY';
    }

    const data = (await res.json()) as { url: string };
    return data.url;
  } catch (error) {
    console.error(error);
    return null;
  }
}
