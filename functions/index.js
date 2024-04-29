const { initializeApp } = require('firebase-admin/app');
const functions = require('firebase-functions');

const {
  stationWrapper,
  processJsonOutputWrapper,
  holfuyWrapper,
  checkForErrors,
  updateKeys
} = require('./functions/stations');
const { webcamWrapper } = require('./functions/cams');
const { getGeojsonCallback, getJsonCallback } = require('./functions/api');

initializeApp();

exports.updateWeatherStationData = functions
  .runWith({ timeoutSeconds: 60, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/10 * * * *') // at every 10th minute
  .onRun(() => {
    return stationWrapper();
  });

exports.updateHarvestStationData = functions
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/10 * * * *')
  .onRun(() => {
    return stationWrapper('harvest');
  });

exports.updateHolfuyStationData = functions
  .runWith({ timeoutSeconds: 30, memory: '512MB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/10 * * * *')
  .onRun(() => {
    return holfuyWrapper();
  });

exports.updateMetserviceStationData = functions
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/10 * * * *')
  .onRun(() => {
    return stationWrapper('metservice');
  });

exports.processJsonOutput = functions
  .runWith({ timeoutSeconds: 10, memory: '256MB' })
  .region('australia-southeast1')
  .pubsub.schedule('5-59/10 * * * *') // every 10 min with +5min offset
  .onRun(() => {
    return processJsonOutputWrapper();
  });

exports.checkForErrors = functions
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('0 */6 * * *') // every 6h
  .onRun(() => {
    return checkForErrors();
  });

exports.updateWebcamImages = functions
  .runWith({ timeoutSeconds: 60, memory: '1GB' })
  .region('australia-southeast1')
  .pubsub.schedule('*/20 * * * *') // at every 20th minute
  .onRun(() => {
    return webcamWrapper();
  });

exports.updateKeys = functions
  .runWith({ timeoutSeconds: 10, memory: '256MB' })
  .region('australia-southeast1')
  .pubsub.schedule('0 0 * * *') // midnight every day
  .onRun(() => {
    return updateKeys();
  });

exports.data = functions
  .runWith({ timeoutSeconds: 20, memory: '256MB' })
  .region('australia-southeast1')
  .https.onRequest(getGeojsonCallback);

exports.output = functions
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .region('australia-southeast1')
  .https.onRequest(getJsonCallback);

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
