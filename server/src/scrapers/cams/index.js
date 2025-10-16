import scrapeCamFtpData from './types/camFtp.js';
import scrapeCheesemanData from './types/cheeseman.js';
import scrapeHarvestData from './types/harvest.js';
import scrapeLakeWanakaData from './types/lakeWanaka.js';
import scrapeMetserviceData from './types/metservice.js';
import scrapeQueenstownAirportData from './types/queenstownAirport.js';
import scrapeSnowgrassData from './types/snowgrass.js';

export default {
  camftp: scrapeCamFtpData,
  cm: scrapeCheesemanData,
  harvest: scrapeHarvestData,
  lw: scrapeLakeWanakaData,
  metservice: scrapeMetserviceData,
  qa: scrapeQueenstownAirportData,
  snowgrass: scrapeSnowgrassData
};
