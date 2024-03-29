const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const functions = require('firebase-functions');
const axios = require('axios');

initializeApp();

async function processHarvestResponse(sid, configId, graphId, traceId, longInterval, format) {
  let date = new Date();
  let utcYear = date.getUTCFullYear();
  let utcMonth = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  let utcDay = date.getUTCDate().toString().padStart(2, '0');
  let utcHours = date.getUTCHours().toString().padStart(2, '0');
  let utcMins = date.getUTCMinutes().toString().padStart(2, '0');
  const dateTo = `${utcYear}-${utcMonth}-${utcDay}T${utcHours}:${utcMins}:00.000`;

  const intervalMins = longInterval ? 40 : 20; // get data for last 20 min, with some exceptions
  date = new Date(date.getTime() - intervalMins * 60 * 1000);
  utcYear = date.getUTCFullYear();
  utcMonth = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  utcDay = date.getUTCDate().toString().padStart(2, '0');
  utcHours = date.getUTCHours().toString().padStart(2, '0');
  utcMins = date.getUTCMinutes().toString().padStart(2, '0');
  const dateFrom = `${utcYear}-${utcMonth}-${utcDay}T${utcHours}:${utcMins}:00.000`;

  try {
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
          'Content-Type': 'application/x-www-form-urlencoded',
          Connection: 'keep-alive'
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
  } catch (error) {
    functions.logger.error(error);
  }

  return null;
}

async function getHarvestData(siteId, windAvgId, windGustId, windDirId, tempId, longInterval) {
  let ids = siteId.split('_');
  if (ids.length != 2) {
    return;
  }
  const sid = ids[0];
  const configId = ids[1];

  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  // wind avg
  ids = windAvgId.split('_');
  if (ids.length == 2) {
    const result = await processHarvestResponse(
      sid,
      configId,
      ids[0],
      ids[1],
      longInterval,
      'object'
    );
    if (result) {
      windAverage = result;
    }
  }

  // wind gust
  ids = windGustId.split('_');
  if (ids.length == 2) {
    const result = await processHarvestResponse(
      sid,
      configId,
      ids[0],
      ids[1],
      longInterval,
      'array'
    );
    if (result) {
      windGust = result;
    }
  }

  // wind direction
  ids = windDirId.split('_');
  if (ids.length == 2) {
    const result = await processHarvestResponse(
      sid,
      configId,
      ids[0],
      ids[1],
      longInterval,
      'array'
    );
    if (result) {
      windBearing = result;
    }
  }

  // temperature
  ids = tempId.split('_');
  if (ids.length == 2) {
    const result = await processHarvestResponse(
      sid,
      configId,
      ids[0],
      ids[1],
      longInterval,
      'array'
    );
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
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(
      `https://www.metservice.com/publicData/webdata/weather-station-location/${siteId}/`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    const modules = data.layout.primary.slots.main.modules;
    if (modules && modules.length) {
      const wind = modules[0].observations.wind;
      if (wind && wind.length) {
        windAverage = wind[0].averageSpeed;
        windGust = wind[0].gustSpeed;

        if (wind[0].strength === 'Calm') {
          if (windAverage == null) {
            windAverage = 0;
          }
          if (windGust == null) {
            windGust = 0;
          }
        }

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
        temperature = temp[0].current;
      }
    }
  } catch (error) {
    functions.logger.error(error);
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
  //   windAverage: data.wind.speed,
  //   windGust: data.wind.gust,
  //   windBearing: data.wind.direction,
  //   temperature: data.temperature
  // };

  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { headers } = await axios.get(`https://holfuy.com/en/weather/${siteId}`);
    const cookies = headers['set-cookie'];
    if (cookies && cookies.length && cookies[0].length) {
      const { data } = await axios.get(`https://holfuy.com/puget/mjso.php?k=${siteId}`, {
        headers: {
          Cookie: cookies[0],
          Connection: 'keep-alive'
        }
      });
      windAverage = data.speed;
      windGust = data.gust;
      windBearing = data.dir;
      temperature = data.temperature;
    }
  } catch (error) {
    functions.logger.error(error);
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getAttentisData(siteId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get('https://api.attentistechnology.com/sensor-overview', {
      headers: { Authorization: `Bearer ${process.env.ATTENTIS_KEY}`, Connection: 'keep-alive' }
    });
    if (data.data && data.data.weather_readings) {
      const d = data.data.weather_readings[siteId];
      if (d) {
        windAverage = d.wind_speed;
        windGust = d.wind_gust_speed;
        windBearing = d.wind_direction;
        temperature = d.air_temp;
      }
    }
  } catch (error) {
    functions.logger.error(error);
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getCwuData(siteId) {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get(`https://cwu.co.nz/forecast/${siteId}/`, {
      responseType: 'text',
      headers: {
        Connection: 'keep-alive'
      }
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
  } catch (error) {
    functions.logger.error(error);
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getLpcData() {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
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
        headers: { 'x-grafana-org-id': 338, Connection: 'keep-alive' }
      }
    );
    if (data.length && data[0]) {
      windAverage = data[0].windspd_01mnavg * 1.852; // data is in kt
      windGust = data[0].windgst_01mnmax * 1.852;
      windBearing = data[0].winddir_01mnavg;
    }

    ({ data } = await axios.post(
      'https://portweather-public.omcinternational.com/api/ds/query',
      {
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
      },
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    ));
    const frames = data.results[''].frames;
    if (frames && frames.length) {
      const vals = frames[0].data.values;
      if (vals && vals.length == 2) {
        if (vals[1] && vals[1].length) {
          temperature = vals[1][0];
        }
      }
    }
  } catch (error) {
    functions.logger.error(error);
  }

  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getMpycData() {
  let windAverage = null;
  let windGust = null;
  let windBearing = null;
  let temperature = null;

  try {
    const { data } = await axios.get('https://mpyc.nz/weather/json/weewx_data.json');
    if (data.current) {
      const avg = data.current.windspeed
        ? Number(data.current.windspeed.replace(' knots', ''))
        : null;
      if (avg != null && !isNaN(avg)) {
        windAverage = avg * 1.852; // data is in kt
      }
      const gust = data.current.windGust
        ? Number(data.current.windspeed.replace(' knots', ''))
        : null;
      if (gust != null && !isNaN(gust)) {
        windGust = gust * 1.852;
      }
      const bearing = data.current.winddir_formatted
        ? Number(data.current.winddir_formatted)
        : null;
      if (bearing != null && !isNaN(bearing)) {
        windBearing = bearing;
      }
      const temp = data.current.outTemp_formatted ? Number(data.current.outTemp_formatted) : null;
      if (temp != null && !isNaN(temp)) {
        temperature = temp;
      }
    }
  } catch (error) {
    functions.logger.error(error);
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
      const tempArray = [];
      snapshot.forEach((doc) => {
        tempArray.push(doc);
      });
      for (const doc of tempArray) {
        let data = null;
        const docData = doc.data();

        if (source === 'harvest') {
          if (docData.type === 'harvest') {
            data = await getHarvestData(
              docData.externalId,
              docData.harvestWindAverageId,
              docData.harvestWindGustId,
              docData.harvestWindDirectionId,
              docData.harvestTemperatureId,
              docData.harvestLongInterval // some harvest stations only update every 30 min
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
          } else if (docData.type === 'mpyc') {
            data = await getMpycData();
            functions.logger.log('mpyc data updated');
            functions.logger.log(data);
          }
        }

        if (data) {
          // handle likely erroneous values
          let avg = data.windAverage;
          if (avg < 0 || avg > 500) {
            avg = null;
          }
          let gust = data.windGust;
          if (gust < 0 || gust > 500) {
            gust = null;
          }
          let bearing = data.windBearing;
          if (bearing < 0 || bearing > 360) {
            bearing = null;
          }
          let temperature = data.temperature;
          if (temperature < -40 || temperature > 60) {
            temperature = null;
          }

          // update site data
          let date = new Date();
          const s = {
            lastUpdate: date,
            currentAverage: avg ?? null,
            currentGust: gust ?? null,
            currentBearing: bearing ?? null,
            currentTemperature: temperature ?? null
          };
          if (avg != null || gust != null) {
            s.isOffline = false;
          }
          if (avg != null && gust != null && bearing != null && temperature != null) {
            s.isError = false;
          }
          await db.doc(`sites/${doc.id}`).update(s);

          // add data
          // floor timestamp to 10 min
          const rem = date.getMinutes() % 10;
          if (rem > 0) {
            date = new Date(date.getTime() - rem * 60 * 1000);
          }
          await db.collection(`sites/${doc.id}/data`).add({
            time: date,
            expiry: new Date(date.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 day expiry to be deleted by TTL policy
            windAverage: avg ?? null,
            windGust: gust ?? null,
            windBearing: bearing ?? null,
            temperature: temperature ?? null
          });
        }
      }
    }
    functions.logger.log('Weather station data updated.');
  } catch (error) {
    functions.logger.error(error);
    return null;
  }
}

async function checkForErrors() {
  try {
    const errors = [];
    const timeNow = Math.round(Date.now() / 1000);
    const db = getFirestore();
    const snapshot = await db.collection('sites').get();
    if (!snapshot.empty) {
      const tempArray = [];
      snapshot.forEach((doc) => {
        tempArray.push(doc);
      });
      for (const doc of tempArray) {
        // check if last 6h data is all null
        let isDataError = true;
        let isWindError = true;
        let isBearingError = true;
        let isTempError = true;
        const query = db.collection(`sites/${doc.id}/data`).orderBy('time', 'desc').limit(36); // 36 records in 6h
        const snap = await query.get();
        if (!snap.empty) {
          const tempArray1 = [];
          snap.forEach((doc) => {
            tempArray1.push(doc);
          });
          if (tempArray1.length) {
            // check that data exists up to 20min before current time
            if (timeNow - tempArray1[0].data().time.seconds <= 20 * 60) {
              isDataError = false;
              for (const doc1 of tempArray1) {
                const data = doc1.data();
                if (data.windAverage != null || data.windGust != null) {
                  isWindError = false;
                }
                if (data.windBearing != null) {
                  isBearingError = false;
                }
                if (data.temperature != null) {
                  isTempError = false;
                }
              }
            }
          }
        }

        let errorMsg = '';
        if (isDataError) {
          errorMsg = 'ERROR: Data scraper has stopped.\n';
          await db.doc(`sites/${doc.id}`).update({
            isOffline: true
          });
        } else {
          if (isWindError) {
            errorMsg += 'ERROR: No wind avg/gust data.\n';
            await db.doc(`sites/${doc.id}`).update({
              isOffline: true
            });
          }
          if (isBearingError) {
            errorMsg += 'ERROR: No wind bearing data.\n';
          }
          if (isTempError) {
            errorMsg += 'ERROR: No temperature data.\n';
          }
        }

        if (errorMsg) {
          // skip error email if already sent)
          const err = doc.data().isError;
          if (err == null || !err) {
            await db.doc(`sites/${doc.id}`).update({
              isError: true
            });
            errors.push(
              `${errorMsg}Name: ${doc.data().name}\nURL: ${doc.data().externalLink}\nFirestore ID: ${doc.id}\n`
            );
          }
        }
      }
    }

    if (errors.length) {
      // send email
      await axios.post(`https://api.emailjs.com/api/v1.0/email/send`, {
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        template_params: {
          message: `Scheduled check ran successfully at ${new Date().toISOString()} with ${errors.length} station(s) flagged.\n\n${errors.join('\n')}`
        },
        accessToken: process.env.EMAILJS_PRIVATE_KEY
      });
    }

    functions.logger.log(`Checked for errors - ${errors.length} found.`);
  } catch (error) {
    functions.logger.error(error);
    return null;
  }
}

exports.updateWeatherStationData = functions
  .runWith({ timeoutSeconds: 30, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/10 * * * *') // at every 10th minute
  .onRun((data, context) => {
    return wrapper();
  });

exports.updateHarvestStationData = functions
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
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
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/10 * * * *')
  .onRun((data, context) => {
    return wrapper('metservice');
  });

exports.checkForErrors = functions
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('0 */6 * * *') // every 6h
  .onRun((data, context) => {
    return checkForErrors();
  });

// exports.test = functions
//   .runWith({ timeoutSeconds: 30, memory: '1GB' })
//   .region('australia-southeast1')
//   .https.onRequest(async (req, res) => {
//     try {

//     } catch (e) {
//       functions.logger.log(e);
//     }
//     res.send('ok');
//   });
