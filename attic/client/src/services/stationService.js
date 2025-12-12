import axios from 'axios';

export async function getStationById(id) {
  try {
    const { data } = await axios.get(`${process.env.REACT_APP_API_PREFIX}/stations/${id}`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function listStations(includeDisabled) {
  try {
    let url = `${process.env.REACT_APP_API_PREFIX}/stations`;
    if (includeDisabled) {
      url += '?includeDisabled=true';
    }
    const { data } = await axios.get(url);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function listStationsUpdatedSince(unixTime, lat, lon, radius) {
  try {
    let url = `${process.env.REACT_APP_API_PREFIX}/stations?unixTimeFrom=${unixTime}`;
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
    const { data } = await axios.get(
      `${process.env.REACT_APP_API_PREFIX}/stations?lat=${lat}&lon=${lon}&radius=${radius}`
    );
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function listStationsWithErrors() {
  try {
    const { data } = await axios.get(`${process.env.REACT_APP_API_PREFIX}/stations?err=${true}`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function loadStationData(id, isHighResolution) {
  try {
    let url = `${process.env.REACT_APP_API_PREFIX}/stations/${id}/data`;
    if (isHighResolution) {
      url += '?hr=true';
    }
    const { data } = await axios.get(url);
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function loadAllStationDataAtTimestamp(time) {
  try {
    const { data } = await axios.get(
      `${process.env.REACT_APP_API_PREFIX}/stations/data?time=${time.toISOString()}`
    );
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function addStation(station, key) {
  try {
    await axios.post(`${process.env.REACT_APP_API_PREFIX}/stations?key=${key}`, station);
  } catch (error) {
    console.error(error);
  }
}

export async function patchStation(id, updates, key) {
  try {
    await axios.patch(`${process.env.REACT_APP_API_PREFIX}/stations/${id}?key=${key}`, updates);
  } catch (error) {
    console.error(error);
  }
}
