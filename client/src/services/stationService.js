import axios from 'axios';
import { APIROOT } from '../constants';

export async function getStationById(id) {
  try {
    const { data } = await axios.get(`${APIROOT}/stations/${id}`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function listStations() {
  try {
    const { data } = await axios.get(`${APIROOT}/stations`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function listStationsUpdatedSince(unixTime, lat, lon, radius) {
  try {
    let url = `${APIROOT}/stations?unixTimeFrom=${unixTime}`;
    if (lat && lon && radius && !isNaN(lat) && !isNaN(lon) && !isNaN(radius)) {
      url += `&lat=${lat}&lon=${lon}&radius=${radius}`;
    }
    const { data } = await axios.get(url);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function listStationsWithinRadius(lat, lon, radius) {
  try {
    const { data } = await axios.get(`${APIROOT}/stations?lat=${lat}&lon=${lon}&radius=${radius}`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function listStationsWithErrors() {
  try {
    const { data } = await axios.get(`${APIROOT}/stations?err=${true}`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function loadStationData(id) {
  try {
    const { data } = await axios.get(`${APIROOT}/stations/${id}/data`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function addStation(station, key) {
  try {
    await axios.post(`${APIROOT}/stations?key=${key}`, station);
  } catch (error) {
    console.error(error);
  }
}
