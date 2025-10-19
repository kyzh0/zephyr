import axios from 'axios';

export async function exportXlsx(key, unixFrom, unixTo, lat, lon, radius) {
  try {
    const { data } = await axios.post(
      `${process.env.REACT_APP_API_PREFIX}/v1/export-xlsx?key=${key}`,
      { unixFrom, unixTo, lat, lon, radius }
    );
    return data.url;
  } catch (error) {
    console.error(error);
    if (error.message.includes('401') || error.message.includes('403')) {
      return 'INVALID KEY';
    }
  }
}
