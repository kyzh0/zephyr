import scrapeArthursPassData from './types/arthursPass.js';
import scrapeCamFtpData from './types/camFtp.js';
import scrapeCastleHillData from './types/castleHill.js';
import scrapeCgcData from './types/cgc.js';
import scrapeCheesemanData from './types/cheeseman.js';
import scrapeCwuData from './types/cwu.js';
import scrapeHarvestData from './types/harvest.js';
import scrapeLakeWanakaData from './types/lakeWanaka.js';
import scrapeMetserviceData from './types/metservice.js';
import scrapeQueenstownAirportData from './types/queenstownAirport.js';
import scrapeSnowgrassData from './types/snowgrass.js';
import scrapeWanakaAirportData from './types/wanakaAirport.js';

export default {
  ap: scrapeArthursPassData,
  camftp: scrapeCamFtpData,
  ch: scrapeCastleHillData,
  cgc: scrapeCgcData,
  cm: scrapeCheesemanData,
  cwu: scrapeCwuData,
  harvest: scrapeHarvestData,
  lw: scrapeLakeWanakaData,
  metservice: scrapeMetserviceData,
  qa: scrapeQueenstownAirportData,
  snowgrass: scrapeSnowgrassData,
  wa: scrapeWanakaAirportData
};
