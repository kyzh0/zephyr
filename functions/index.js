const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const functions = require('firebase-functions');
const axios = require('axios');
const puppeteer = require('puppeteer');

initializeApp();

async function getMetserviceData(siteId) {
  let windAverage = 0;
  let windGust = 0;
  let windBearing = 0;
  let temperature = 0;
  try {
    const response = await axios.get(
      `https://www.metservice.com/publicData/webdata/weather-station-location/${siteId}/`
    );
    const modules = response.data.layout.primary.slots.main.modules;
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
  } catch {} // eslint-disable-line
  return {
    windAverage,
    windGust,
    windBearing,
    temperature
  };
}

async function getHarvestData(siteId) {
  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(`https://live.harvest.com/?cmd=home&sid=${siteId}`);

    await page.waitForSelector('text.last_value', { visible: true });
    const data = await page.evaluate(async () => {
      const result = {
        windAverage: 0,
        windGust: 0,
        windBearing: 0,
        temperature: 0
      };

      const values = document.querySelectorAll('text.last_value'); // eslint-disable-line
      const textContent = (elem) => (elem ? elem.innerHTML.trim() : '');
      if (values.length >= 4) {
        result.temperature = Number(textContent(values[0]));
        switch (textContent(values[1]).toUpperCase()) {
          case 'N':
            result.windBearing = 0;
            break;
          case 'NNE':
            result.windBearing = 23;
            break;
          case 'NE':
            result.windBearing = 45;
            break;
          case 'ENE':
            result.windBearing = 68;
            break;
          case 'E':
            result.windBearing = 90;
            break;
          case 'ESE':
            result.windBearing = 113;
            break;
          case 'SE':
            result.windBearing = 135;
            break;
          case 'SSE':
            result.windBearing = 158;
            break;
          case 'S':
            result.windBearing = 180;
            break;
          case 'SSW':
            result.windBearing = 203;
            break;
          case 'SW':
            result.windBearing = 225;
            break;
          case 'WSW':
            result.windBearing = 248;
            break;
          case 'W':
            result.windBearing = 270;
            break;
          case 'WNW':
            result.windBearing = 293;
            break;
          case 'NW':
            result.windBearing = 325;
            break;
          case 'NNW':
            result.windBearing = 338;
            break;
          default:
            result.windBearing = 0;
            break;
        }
        result.windGust = Math.round(Number(textContent(values[2])));
        result.windAverage = Math.round(Number(textContent(values[3])));
      }

      return result;
    });

    await browser.close();
    return data;
  } catch {} // eslint-disable-line
}

exports.updateWeatherStationData = functions
  .runWith({ timeoutSeconds: 30, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/15 * * * *') // at every 15th minute
  .onRun(async (req, res) => {
    const db = getFirestore();

    try {
      const snapshot = await db.collection('sites').get();
      if (!snapshot.empty) {
        snapshot.forEach(async (doc) => {
          let data = null;
          const docData = doc.data();
          if (docData.type === 'harvest') {
            data = await getHarvestData(docData.externalId);
          } else if (docData.type === 'metservice') {
            data = await getMetserviceData(docData.externalId);
          }
          if (data) {
            await db.doc(`sites/${doc.id}`).update({
              currentAverage: data.windAverage,
              currentGust: data.windGust,
              currentBearing: data.windBearing,
              currentTemperature: data.temperature
            });
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
    } catch (error) {
      res.json({ result: 'An error occured.', error });
    }

    res.json({ result: 'Weather station data updated.' });
  });
