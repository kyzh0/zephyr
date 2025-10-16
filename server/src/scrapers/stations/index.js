import scrapeAttentisData from './types/attentis.js';
import scrapeCwuData from './types/cwu.js';
import scrapeCentrePortData from './types/centrePort.js';
import scrapeHolfuyData from './types/holfuy.js';
import scrapeMetserviceData from './types/metservice.js';
import scrapePortOtagoData from './types/portOtago.js';
import scrapeTempestData from './types/tempest.js';
import scrapeWeatherProData from './types/weatherPro.js';
import scrapeWeatherUndergroundData from './types/weatherUnderground.js';
import scrapeWindGuruData from './types/windGuru.js';
import scrapeWowData from './types/wow.js';

export default {
  attentis: scrapeAttentisData,
  cwu: scrapeCwuData,
  cp: scrapeCentrePortData,
  holfuy: scrapeHolfuyData,
  metservice: scrapeMetserviceData,
  po: scrapePortOtagoData,
  tempest: scrapeTempestData,
  wp: scrapeWeatherProData,
  wu: scrapeWeatherUndergroundData,
  windguru: scrapeWindGuruData,
  wow: scrapeWowData
};
