const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const functions = require('firebase-functions');
const axios = require('axios');

initializeApp();

async function getMetserviceData(siteId) {
  let windAverage = 0;
  let windGust = 0;
  let windBearing = 0;
  try {
    const response = await axios.get(
      `https://www.metservice.com/publicData/webdata/weather-station-location/${siteId}/`
    );
    const modules = response.data.layout.primary.slots.main.modules;
    if (modules && modules.length) {
      const wind = modules[0].observations.wind;
      if (wind && wind.length) {
        windAverage = wind[0].averageSpeed;
        windGust = wind[0].gustSpeed;
        switch (wind[0].direction) {
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
        }
      }
    }
  } catch (error) {
    functions.logger.log(error);
  }
  return {
    windAverage,
    windGust,
    windBearing
  };
}

exports.updateMetserviceData = functions
  .runWith({ timeoutSeconds: 30, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/15 * * * *') // at every 15th minute
  .onRun(async (req, res) => {
    const db = getFirestore();

    const snapshot = await db.collection('sites').where('type', '==', 'metservice').get();
    if (!snapshot.empty) {
      snapshot.forEach(async (doc) => {
        const data = await getMetserviceData(doc.data().externalId);
        await db.doc(`sites/${doc.id}`).update({
          currentAverage: data.windAverage,
          currentGust: data.windGust,
          currentBearing: data.windBearing
        });
        await db.collection(`sites/${doc.id}/data`).add({
          time: new Date(),
          windAverage: data.windAverage,
          windGust: data.windGust,
          windBearing: data.windBearing
        });
      });
    }

    res.json({ result: 'Metservice data updated.' });
  });
