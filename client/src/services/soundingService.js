import axios from 'axios';
import { APIROOT } from '../helpers/constants';

export async function getSoundingById(id) {
  try {
    const { data } = await axios.get(`${APIROOT}/soundings/${id}`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function listSoundings() {
  try {
    const { data } = await axios.get(`${APIROOT}/soundings`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function addSounding(sounding, key) {
  try {
    await axios.post(`${APIROOT}/soundings?key=${key}`, sounding);
  } catch (error) {
    console.error(error);
  }
}
