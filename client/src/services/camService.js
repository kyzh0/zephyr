import axios from 'axios';

export async function getCamById(id) {
  try {
    const { data } = await axios.get(`${process.env.REACT_APP_API_PREFIX}/cams/${id}`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function listCams() {
  try {
    const { data } = await axios.get(`${process.env.REACT_APP_API_PREFIX}/cams`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function listCamsUpdatedSince(unixTime) {
  try {
    const { data } = await axios.get(
      `${process.env.REACT_APP_API_PREFIX}/cams?unixTimeFrom=${unixTime}`
    );
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function loadCamImages(id) {
  try {
    const { data } = await axios.get(`${process.env.REACT_APP_API_PREFIX}/cams/${id}/images`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function addCam(cam, key) {
  try {
    await axios.post(`${process.env.REACT_APP_API_PREFIX}/cams?key=${key}`, cam);
  } catch (error) {
    console.error(error);
  }
}
