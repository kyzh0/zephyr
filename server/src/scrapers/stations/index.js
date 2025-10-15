import scrapeAttentisData from './types/attentis.js';
import scrapeHolfuyData from './types/holfuy.js';
import scrapeMetserviceData from './types/metservice.js';
import scrapeTempestData from './types/tempest.js';
import scrapeWeatherUndergroundData from './types/weatherUnderground.js';
import scrapeWindGuruData from './types/windGuru.js';
import scrapeWowData from './types/wow.js';

export default {
  attentis: scrapeAttentisData,
  holfuy: scrapeHolfuyData,
  metservice: scrapeMetserviceData,
  tempest: scrapeTempestData,
  wu: scrapeWeatherUndergroundData,
  windguru: scrapeWindGuruData,
  wow: scrapeWowData
};
