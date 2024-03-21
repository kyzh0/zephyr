const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const functions = require('firebase-functions');
const axios = require('axios');

initializeApp();

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
      end_date: dateTo
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

async function getHolfuyData(siteId) {
  // const { data } = await axios.get(
  //   `https://api.holfuy.com/live/?pw=${process.env.HOLFUY_KEY}&m=JSON&tu=C&su=km/h&s=${siteId}`
  // );

  // return {
  //   windAverage: data.wind.speed ?? 0,
  //   windGust: data.wind.gust ?? 0,
  //   windBearing: data.wind.direction ?? 0,
  //   temperature: data.temperature ?? 0
  // };

  let windAverage = 0;
  let windGust = 0;
  let windBearing = 0;
  let temperature = 0;

  const { headers } = await axios.get(`https://holfuy.com/en/weather/${siteId}`);
  const cookies = headers['set-cookie'];
  if (cookies && cookies.length && cookies[0].length) {
    const { data } = await axios.get(`https://holfuy.com/puget/mjso.php?k=${siteId}`, {
      headers: {
        Cookie: cookies[0]
      }
    });
    windAverage = data.speed ?? 0;
    windGust = data.gust ?? 0;
    windBearing = data.dir ?? 0;
    temperature = data.temperature ?? 0;
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getAttentisData(siteId) {
  let windAverage = 0;
  let windGust = 0;
  let windBearing = 0;
  let temperature = 0;

  const { data } = await axios.get('https://api.attentistechnology.com/sensor-overview', {
    headers: { Authorization: `Bearer ${process.env.ATTENTIS_KEY}` }
  });
  if (data.data && data.data.weather_readings) {
    const d = data.data.weather_readings[siteId];
    if (d) {
      windAverage = d.wind_speed ?? 0;
      windGust = d.wind_gust_speed ?? 0;
      windBearing = d.wind_direction ?? 0;
      temperature = d.air_temp ?? 0;
    }
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getCwuData(siteId) {
  let windAverage = 0;
  let windGust = 0;
  let windBearing = 0;
  let temperature = 0;

  const { data } = await axios.get(`https://cwu.co.nz/forecast/${siteId}/`, {
    responseType: 'text'
  });
  if (data.length) {
    // wind avg + direction
    let startStr = 'Current Windspeed:&nbsp;</label><span>&nbsp;';
    let i = data.indexOf(startStr);
    if (i >= 0) {
      const j = data.indexOf('km/h.</span>', i);
      if (j > i) {
        const tempArray = data
          .slice(i + startStr.length, j)
          .trim()
          .split(' ');
        if (tempArray.length == 2) {
          const temp = tempArray[0];
          switch (temp.toUpperCase()) {
            case 'N':
              windBearing = 0;
              break;
            case 'NNE':
              windBearing = 22.5;
              break;
            case 'NE':
              windBearing = 45;
              break;
            case 'ENE':
              windBearing = 67.5;
              break;
            case 'E':
              windBearing = 90;
              break;
            case 'ESE':
              windBearing = 112.5;
              break;
            case 'SE':
              windBearing = 135;
              break;
            case 'SSE':
              windBearing = 157.5;
              break;
            case 'S':
              windBearing = 180;
              break;
            case 'SSW':
              windBearing = 202.5;
              break;
            case 'SW':
              windBearing = 225;
              break;
            case 'WSW':
              windBearing = 247.5;
              break;
            case 'W':
              windBearing = 270;
              break;
            case 'WNW':
              windBearing = 292.5;
              break;
            case 'NW':
              windBearing = 325;
              break;
            case 'NNW':
              windBearing = 337.5;
              break;
            default:
              windBearing = 0;
              break;
          }

          const temp1 = Number(tempArray[1]);
          if (!isNaN(temp1)) {
            windAverage = temp1;
          }
        }
      }
    }

    // wind gust
    startStr = 'Wind Gusting To:&nbsp;</label><span>&nbsp;';
    i = data.indexOf(startStr);
    if (i >= 0) {
      const j = data.indexOf('km/h.</span>', i);
      if (j > i) {
        const temp = Number(data.slice(i + startStr.length, j).trim());
        if (!isNaN(temp)) {
          windGust = temp;
        }
      }
    }

    // temperature
    startStr = 'Now</span><br/>';
    i = data.indexOf(startStr);
    if (i >= 0) {
      const j = data.indexOf('°C</p>', i);
      if (j > i) {
        const temp = Number(data.slice(i + startStr.length, j).trim());
        if (!isNaN(temp)) {
          temperature = temp;
        }
      }
    }
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getLpcData() {
  let windAverage = 0;
  let windGust = 0;
  let windBearing = 0;
  let temperature = 0;

  let date = new Date();
  const dateTo = date.toISOString();
  date = new Date(date.getTime() - 1441 * 60 * 1000); // date from is current time - (1 day + 1 min)
  const dateFrom = date.toISOString();
  let { data } = await axios.get(
    'https://portweather-public.omcinternational.com/api/datasources/proxy/391//api/data/transformRecordsFromPackets' +
      `?sourcePath=${encodeURIComponent('NZ/Lyttelton/Meteo/Measured/Lyttelton TABW')}` +
      '&transformer=LatestNoTransform' +
      `&fromDate_Utc=${encodeURIComponent(dateFrom)}` +
      `&toDate_Utc=${encodeURIComponent(dateTo)}` +
      '&qaStatusesString=*',
    {
      headers: { 'x-grafana-org-id': 338 }
    }
  );
  if (data.length && data[0]) {
    windAverage = data[0].windspd_01mnavg * 1.852 ?? 0; // data is in kt
    windGust = data[0].windgst_01mnmax * 1.852 ?? 0;
    windBearing = data[0].winddir_01mnavg ?? 0;
  }

  ({ data } = await axios.post('https://portweather-public.omcinternational.com/api/ds/query', {
    from: dateFrom,
    queries: [
      {
        datasourceId: 391,
        sourcePath: 'NZ/Lyttelton/Meteo/Measured/Lyttelton IHJ3',
        sourceProperty: 'airtemp_01mnavg',
        transformerType: 'LatestMeasuredGenericPlot',
        type: 'timeseries'
      }
    ],
    to: dateTo
  }));
  const frames = data.results[''].frames;
  if (frames && frames.length) {
    const vals = frames[0].data.values;
    if (vals && vals.length == 2) {
      if (vals[1] && vals[1].length) {
        temperature = vals[1][0] ?? 0;
      }
    }
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function wrapper(source) {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('sites').get();
    if (!snapshot.empty) {
      snapshot.forEach(async (doc) => {
        let data = null;
        const docData = doc.data();

        if (source === 'harvest') {
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
          }
        } else if (source === 'holfuy') {
          if (docData.type === 'holfuy') {
            data = await getHolfuyData(docData.externalId);
            functions.logger.log(`holfuy data updated - ${docData.externalId}`);
            functions.logger.log(data);
          }
        } else if (source === 'metservice') {
          if (docData.type === 'metservice') {
            data = await getMetserviceData(docData.externalId);
            functions.logger.log(`metservice data updated - ${docData.externalId}`);
            functions.logger.log(data);
          }
        } else {
          if (docData.type === 'attentis') {
            data = await getAttentisData(docData.externalId);
            functions.logger.log(`attentis data updated - ${docData.externalId}`);
            functions.logger.log(data);
          } else if (docData.type === 'cwu') {
            data = await getCwuData(docData.externalId);
            functions.logger.log(`cwu data updated - ${docData.externalId}`);
            functions.logger.log(data);
          } else if (docData.type === 'lpc') {
            data = await getLpcData();
            functions.logger.log('lpc data updated');
            functions.logger.log(data);
          }
        }

        if (data) {
          // update site data
          await db.doc(`sites/${doc.id}`).update({
            currentAverage: data.windAverage,
            currentGust: data.windGust,
            currentBearing: data.windBearing,
            currentTemperature: data.temperature
          });
          // add data - floor time to nearest 10 min
          let date = new Date();
          const rem = date.getMinutes() % 10;
          if (rem > 0) {
            date = new Date(date.getTime() - rem * 60 * 1000);
          }
          await db.collection(`sites/${doc.id}/data`).add({
            time: date,
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

async function removeOldData() {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('sites').get();
    if (!snapshot.empty) {
      snapshot.forEach(async (doc) => {
        const date = new Date();
        date.setDate(date.getDate() - 3);
        const query = db.collection(`sites/${doc.id}/data`).where('time', '<', date);
        const snap = await query.get();
        if (!snap.empty) {
          snap.forEach(async (doc) => {
            await doc.ref.delete();
          });
        }
      });
    }
    functions.logger.log('Old data removed.');
  } catch (error) {
    functions.logger.log('An error occured.');
    functions.logger.log(error);
    return null;
  }
}

exports.updateWeatherStationData = functions
  .runWith({ timeoutSeconds: 120, memory: '2GB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/10 * * * *') // at every 10th minute
  .onRun((data, context) => {
    return wrapper();
  });

exports.updateHarvestStationData = functions
  .runWith({ timeoutSeconds: 60, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/10 * * * *')
  .onRun((data, context) => {
    return wrapper('harvest');
  });

exports.updateHolfuyStationData = functions
  .runWith({ timeoutSeconds: 60, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/10 * * * *')
  .onRun((data, context) => {
    return wrapper('holfuy');
  });

exports.updateMetserviceStationData = functions
  .runWith({ timeoutSeconds: 60, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/10 * * * *')
  .onRun((data, context) => {
    return wrapper('metservice');
  });

exports.removeOldData = functions
  .runWith({ timeoutSeconds: 60, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/10 * * * *')
  .onRun((data, context) => {
    return removeOldData();
  });

// exports.test = functions
//   .runWith({ timeoutSeconds: 30, memory: '1GB' })
//   .region('australia-southeast1')
//   .https.onRequest(async (req, res) => {
//     try {
//       functions.logger.log(await getLpcData());
//     } catch (e) {
//       functions.logger.log(e);
//     }
//     res.send('ok');
//   });
