import scrapeAttentisData from './types/attentis.js';
import scrapeAucklandCouncilData from './types/aucklandCouncil.js';
import scrapeCwuData from './types/cwu.js';
import scrapeCentrePortData from './types/centrePort.js';
import scrapeEcowittData from './types/ecowitt.js';
import scrapeGreaterWellingtonData from './types/greaterWellington.js';
import scrapeHbrcData from './types/hbrc.js';
import scrapeHolfuyData from './types/holfuy.js';
import scrapeLpcData from './types/lpc.js';
import scrapeMetserviceData from './types/metservice.js';
import scrapeMpycData from './types/mpyc.js';
import scrapeNavigatusData from './types/navigatus.js';
import scrapePortOtagoData from './types/portOtago.js';
import scrapePredictWindData from './types/predictWind.js';
import scrapeSofarOceanData from './types/sofarOcean.js';
import scrapeTempestData from './types/tempest.js';
import scrapeWeatherLinkData from './types/weatherlink.js';
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
  gw: scrapeGreaterWellingtonData,
  hbrc: scrapeHbrcData,
  holfuy: scrapeHolfuyData,
  lpc: scrapeLpcData,
  metservice: scrapeMetserviceData,
  mpyc: scrapeMpycData,
  navigatus: scrapeNavigatusData,
  po: scrapePortOtagoData,
  pw: scrapePredictWindData,
  sfo: scrapeSofarOceanData,
  tempest: scrapeTempestData,
  wl: scrapeWeatherLinkData,
  wp: scrapeWeatherProData,
  wu: scrapeWeatherUndergroundData,
  windguru: scrapeWindGuruData,
  wow: scrapeWowData
};
