import axios from 'axios';

export async function exportXlsx(key, unixFrom, unixTo, lat, lon, radius) {
  try {
    const params = new URLSearchParams();
    params.append('key', key);
    params.append('unixFrom', unixFrom);
    params.append('unixTo', unixTo);
    params.append('lat', lat);
    params.append('lon', lon);
    params.append('radius', radius);
    const { data } = await axios.get(
      `${process.env.REACT_APP_API_PREFIX}/v1/xlsx?${params.toString()}`
    );
    return data.url;
  } catch (error) {
    console.error(error);
  }
}
