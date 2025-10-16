import scrapeAttentisData from './types/attentis.js';
import scrapeAucklandCouncilData from './types/aucklandCouncil.js';
import scrapeCwuData from './types/cwu.js';
import scrapeCentrePortData from './types/centrePort.js';
import scrapeEcowittData from './types/ecowitt.js';
import scrapeHbrcData from './types/hbrc.js';
import scrapeHolfuyData from './types/holfuy.js';
import scrapeMetserviceData from './types/metservice.js';
import scrapeNavigatusData from './types/navigatus.js';
import scrapePortOtagoData from './types/portOtago.js';
import scrapePredictWindData from './types/predictWind.js';
import scrapeSofarOceanData from './types/sofarOcean.js';
import scrapeTempestData from './types/tempest.js';
import scrapeWeatherProData from './types/weatherPro.js';
import scrapeWeatherUndergroundData from './types/weatherUnderground.js';
import scrapeWindGuruData from './types/windGuru.js';
import scrapeWowData from './types/wow.js';

export default {
  attentis: scrapeAttentisData,
  ac: scrapeAucklandCouncilData,
  cwu: scrapeCwuData,
  cp: scrapeCentrePortData,
  ecowitt: scrapeEcowittData,
  hbrc: scrapeHbrcData,
  holfuy: scrapeHolfuyData,
  metservice: scrapeMetserviceData,
  navigatus: scrapeNavigatusData,
  po: scrapePortOtagoData,
  pw: scrapePredictWindData,
  sfo: scrapeSofarOceanData,
  tempest: scrapeTempestData,
  wp: scrapeWeatherProData,
  wu: scrapeWeatherUndergroundData,
  windguru: scrapeWindGuruData,
  wow: scrapeWowData
};
