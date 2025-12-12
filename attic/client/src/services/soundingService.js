import axios from 'axios';

export async function getSoundingById(id) {
  try {
    const { data } = await axios.get(`${process.env.REACT_APP_API_PREFIX}/soundings/${id}`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function listSoundings() {
  try {
    const { data } = await axios.get(`${process.env.REACT_APP_API_PREFIX}/soundings`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function addSounding(sounding, key) {
  try {
    await axios.post(`${process.env.REACT_APP_API_PREFIX}/soundings?key=${key}`, sounding);
  } catch (error) {
    console.error(error);
  }
}
