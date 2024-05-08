import axios from 'axios';
import { APIROOT } from '../helpers/constants';

export async function getCamById(id) {
  try {
    const { data } = await axios.get(`${APIROOT}/cams/${id}`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function listCams() {
  try {
    const { data } = await axios.get(`${APIROOT}/cams`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function listCamsUpdatedSince(unixTime) {
  try {
    const { data } = await axios.get(`${APIROOT}/cams?unixTimeFrom=${unixTime}`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function loadCamImages(id) {
  try {
    const { data } = await axios.get(`${APIROOT}/cams/${id}/images`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function addCam(cam, key) {
  try {
    await axios.post(`${APIROOT}/cams?key=${key}`, cam);
  } catch (error) {
    console.error(error);
  }
}
