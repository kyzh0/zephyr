import scrapeAttentisData from './types/attentis.js';
import scrapeHolfuyData from './types/holfuy.js';
import scrapeMetserviceData from './types/metservice.js';
import scrapeTempestData from './types/tempest.js';
import scrapeWeatherUndergroundData from './types/weatherUnderground.js';

export default {
  attentis: scrapeAttentisData,
  holfuy: scrapeHolfuyData,
  metservice: scrapeMetserviceData,
  tempest: scrapeTempestData,
  wu: scrapeWeatherUndergroundData
};
