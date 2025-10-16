import scrapeHarvestData from './types/harvest.js';
import scrapeLakeWanakaData from './types/lakeWanaka.js';
import scrapeMetserviceData from './types/metservice.js';
import scrapeSnowgrassData from './types/snowgrass.js';

export default {
  harvest: scrapeHarvestData,
  lw: scrapeLakeWanakaData,
  metservice: scrapeMetserviceData,
  snowgrass: scrapeSnowgrassData
};
