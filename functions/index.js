const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const functions = require('firebase-functions');
const axios = require('axios');

initializeApp();

async function getMetserviceData(siteId) {
  let windAverage = 0;
  let windGust = 0;
  let windDirection = 0;
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
        windDirection = wind[0].direction;
      }
    }
  } catch (error) {
    functions.logger.log(error);
  }
  return {
    windAverage,
    windGust,
    windDirection
  };
}

exports.updateMetserviceData = functions
  .runWith({ timeoutSeconds: 30, memory: '1GB' })
  .region('australia-southeast1')
  .https.onRequest(async (req, res) => {
    const db = getFirestore();

    const snapshot = await db.collection('sites').where('type', '==', 'metservice').get();
    if (!snapshot.empty) {
      snapshot.forEach(async (doc) => {
        const data = await getMetserviceData(doc.data().externalId);
        await db.collection(`sites/${doc.id}/data`).add({
          time: new Date(),
          windAverage: data.windAverage,
          windGust: data.windGust,
          windDirection: data.windDirection
        });
      });
    }

    res.json({ result: 'Metservice data updated.' });
  });
