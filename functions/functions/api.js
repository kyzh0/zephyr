const { getFirestore } = require('firebase-admin/firestore');

const functions = require('firebase-functions');
const fns = require('date-fns');

async function authenticateApiKey(db, apiKey) {
  if (!apiKey) {
    return {
      success: false,
      httpCode: 401,
      error: 'API key is required.'
    };
  }
  let snapshot = await db.collection('clients').where('apiKey', '==', apiKey).get();
  if (snapshot.empty) {
    return {
      success: false,
      httpCode: 401,
      error: 'Invalid API key.'
    };
  }

  const client = snapshot.docs[0];
  const date = new Date();
  const currentMonth = fns.format(date, 'yyyy-MM');
  snapshot = await db
    .collection(`clients/${client.id}/usage`)
    .where('month', '==', currentMonth)
    .get();
  if (!snapshot.empty) {
    const usage = snapshot.docs[0];
    const calls = usage.data().apiCalls;
    const limit = client.data().monthlyLimit;
    if (calls >= limit) {
      return {
        success: false,
        httpCode: 403,
        error: `Monthly limit of ${limit} API calls exceeded.`
      };
    }

    await db.doc(`clients/${client.id}/usage/${usage.id}`).update({
      apiCalls: calls + 1
    });
  } else {
    await db.collection(`clients/${client.id}/usage`).add({
      month: currentMonth,
      apiCalls: 1
    });
  }

  return { success: true };
}

exports.getGeojsonCallback = async function getGeojsonCallback(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('');
    return;
  }

  const geoJson = {
    type: 'FeatureCollection',
    features: []
  };

  try {
    const db = getFirestore();
    const auth = await authenticateApiKey(db, req.query.key);
    if (!auth.success) {
      res.status(auth.httpCode).json({ error: auth.error });
      return;
    }

    const snapshot = await db.collection('stations').orderBy('type').orderBy('name').get();
    if (snapshot.empty) {
      functions.logger.error('No stations found.');
      res.status(500).json({ error: 'No stations found. Please contact the Zephyr admin.' });
      return;
    }

    for (const doc of snapshot.docs) {
      const station = doc.data();
      const feature = {
        type: 'Feature',
        properties: {
          id: doc.id,
          name: station.name,
          type: station.type,
          link: station.externalLink,
          lastUpdateUnix: station.lastUpdate._seconds,
          currentAverage:
            station.currentAverage == null ? null : Math.round(station.currentAverage),
          currentGust: station.currentGust == null ? null : Math.round(station.currentGust),
          currentBearing:
            station.currentBearing == null ? null : Math.round(station.currentBearing),
          currentTemperature:
            station.currentTemperature == null ? null : Math.round(station.currentTemperature)
        },
        geometry: {
          type: 'Point',
          coordinates: [station.coordinates._longitude, station.coordinates._latitude]
        }
      };
      geoJson.features.push(feature);
    }
  } catch (e) {
    functions.logger.log(e);
  }

  res.json(geoJson);
};

exports.getJsonCallback = async function getJsonCallback(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('');
    return;
  }

  const output = [];

  try {
    const db = getFirestore();
    const auth = await authenticateApiKey(db, req.query.key);
    if (!auth.success) {
      res.status(auth.httpCode).json({ error: auth.error });
      return;
    }

    let dateFrom = null;
    let dateTo = null;
    if (req.query.dateFrom) {
      const temp = Number(req.query.dateFrom);
      if (!isNaN(temp)) {
        dateFrom = new Date(temp * 1000);
      } else {
        dateFrom = new Date(req.query.dateFrom);
      }
    }
    if (req.query.dateTo) {
      const temp = Number(req.query.dateTo);
      if (!isNaN(temp)) {
        dateTo = new Date(temp * 1000);
      } else {
        dateTo = new Date(req.query.dateTo);
      }
    }

    let query = db.collection('output').orderBy('time');
    if (dateFrom != null && !isNaN(dateFrom)) query = query.where('time', '>=', dateFrom);
    if (dateTo != null && !isNaN(dateTo)) query = query.where('time', '<=', dateTo);
    const snapshot = await query.get();
    if (!snapshot.empty) {
      for (const doc of snapshot.docs) {
        output.push({
          time: doc.data().time._seconds,
          url: doc.data().url
        });
      }
    }
  } catch (e) {
    functions.logger.log(e);
  }

  res.json(output);
};
