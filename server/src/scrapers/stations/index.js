import scrapeAttentisData from './types/attentis.js';
import scrapeCWUData from './types/cwu.js';
import scrapeHolfuyData from './types/holfuy.js';
import scrapeMetserviceData from './types/metservice.js';
import scrapeTempestData from './types/tempest.js';
import scrapeWeatherProData from './types/weatherPro.js';
import scrapeWeatherUndergroundData from './types/weatherUnderground.js';
import scrapeWindGuruData from './types/windGuru.js';
import scrapeWowData from './types/wow.js';

export default {
  attentis: scrapeAttentisData,
  cwu: scrapeCWUData,
  holfuy: scrapeHolfuyData,
  metservice: scrapeMetserviceData,
  tempest: scrapeTempestData,
  wp: scrapeWeatherProData,
  wu: scrapeWeatherUndergroundData,
  windguru: scrapeWindGuruData,
  wow: scrapeWowData
};
