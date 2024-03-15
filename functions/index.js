const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const functions = require('firebase-functions');
const axios = require('axios');

initializeApp();

async function getMetserviceData(siteId) {
  let windAverage = 0;
  let windGust = 0;
  let windBearing = 0;
  let temperature = 0;
  const { data } = await axios.get(
    `https://www.metservice.com/publicData/webdata/weather-station-location/${siteId}/`
  );
  const modules = data.layout.primary.slots.main.modules;
  if (modules && modules.length) {
    const wind = modules[0].observations.wind;
    if (wind && wind.length) {
      windAverage = wind[0].averageSpeed ?? 0;
      windGust = wind[0].gustSpeed ?? 0;
      switch (wind[0].direction.toUpperCase()) {
        case 'N':
          windBearing = 0;
          break;
        case 'NE':
          windBearing = 45;
          break;
        case 'E':
          windBearing = 90;
          break;
        case 'SE':
          windBearing = 135;
          break;
        case 'S':
          windBearing = 180;
          break;
        case 'SW':
          windBearing = 225;
          break;
        case 'W':
          windBearing = 270;
          break;
        case 'NW':
          windBearing = 325;
          break;
        default:
          windBearing = 0;
          break;
      }
    }
    const temp = modules[0].observations.temperature;
    if (temp && temp.length) {
      temperature = temp[0].current ?? 0;
    }
  }
  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function processHarvestResponse(sid, configId, graphId, traceId, format) {
  let date = new Date();
  let utcYear = date.getUTCFullYear();
  let utcMonth = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  let utcDay = date.getUTCDate().toString().padStart(2, '0');
  let utcHours = date.getUTCHours().toString().padStart(2, '0');
  let utcMins = date.getUTCMinutes().toString().padStart(2, '0');
  const dateTo = `${utcYear}-${utcMonth}-${utcDay}T${utcHours}:${utcMins}:00.000`;

  date = new Date(date.getTime() - 20 * 60 * 1000); // get data for last 20 min
  utcYear = date.getUTCFullYear();
  utcMonth = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  utcDay = date.getUTCDate().toString().padStart(2, '0');
  utcHours = date.getUTCHours().toString().padStart(2, '0');
  utcMins = date.getUTCMinutes().toString().padStart(2, '0');
  const dateFrom = `${utcYear}-${utcMonth}-${utcDay}T${utcHours}:${utcMins}:00.000`;

  const { data } = await axios.post(
    `https://data1.harvest.com//php/site_graph_functions.php?retrieve_trace=&req_ref=${sid}_${configId}_${graphId}}`,
    {
      config_id: configId,
      trace_id: traceId,
      graph_id: graphId,
      start_date: dateFrom,
      start_date_stats: dateFrom,
      end_date: dateTo,
      resolution: 205,
      max_interp_seconds: 8640,
      interpolate: true,
      trace_type: 'Line'
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  if (format === 'array') {
    if (data && data.length) {
      const d = data[0].data;
      if (d && d.length) {
        const d1 = d[d.length - 1];
        return d1.data_value;
      }
    }
  } else if (format === 'object') {
    if (data && data['1']) {
      const d = data['1'].data;
      if (d && d.length) {
        const d1 = d[d.length - 1];
        return d1.data_value;
      }
    }
  }

  return null;
}

async function getHarvestData(siteId, windAvgId, windGustId, windDirId, tempId) {
  let ids = siteId.split('_');
  if (ids.length != 2) {
    return;
  }
  const sid = ids[0];
  const configId = ids[1];

  let windAverage = 0;
  let windGust = 0;
  let windBearing = 0;
  let temperature = 0;

  // wind avg
  ids = windAvgId.split('_');
  if (ids.length == 2) {
    const result = await processHarvestResponse(sid, configId, ids[0], ids[1], 'object');
    if (result) {
      windAverage = result;
    }
  }

  // wind gust
  ids = windGustId.split('_');
  if (ids.length == 2) {
    const result = await processHarvestResponse(sid, configId, ids[0], ids[1], 'array');
    if (result) {
      windGust = result;
    }
  }

  // wind direction
  ids = windDirId.split('_');
  if (ids.length == 2) {
    const result = await processHarvestResponse(sid, configId, ids[0], ids[1], 'array');
    if (result) {
      windBearing = result;
    }
  }

  // temperature
  ids = tempId.split('_');
  if (ids.length == 2) {
    const result = await processHarvestResponse(sid, configId, ids[0], ids[1], 'array');
    if (result) {
      temperature = result;
    }
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function wrapper() {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('sites').get();
    if (!snapshot.empty) {
      snapshot.forEach(async (doc) => {
        let data = null;
        const docData = doc.data();
        if (docData.type === 'harvest') {
          data = await getHarvestData(
            docData.externalId,
            docData.harvestWindAverageId,
            docData.harvestWindGustId,
            docData.harvestWindDirectionId,
            docData.harvestTemperatureId
          );
          functions.logger.log(`harvest data updated - ${docData.externalId}`);
          functions.logger.log(data);
        } else if (docData.type === 'metservice') {
          data = await getMetserviceData(docData.externalId);
          functions.logger.log(`metservice data updated - ${docData.externalId}`);
          functions.logger.log(data);
        }
        if (data) {
          // update site data
          await db.doc(`sites/${doc.id}`).update({
            currentAverage: data.windAverage,
            currentGust: data.windGust,
            currentBearing: data.windBearing,
            currentTemperature: data.temperature
          });
          // add data
          await db.collection(`sites/${doc.id}/data`).add({
            time: new Date(),
            windAverage: data.windAverage,
            windGust: data.windGust,
            windBearing: data.windBearing,
            temperature: data.temperature
          });
        }
      });
    }
    functions.logger.log('Weather station data updated.');
  } catch (error) {
    functions.logger.log('An error occured.');
    functions.logger.log(error);
    return null;
  }
}

exports.updateWeatherStationData = functions
  .runWith({ timeoutSeconds: 30, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/10 * * * *') // at every 10th minute
  .onRun(async (data, context) => {
    return wrapper();
  });
