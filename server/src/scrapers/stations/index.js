import scrapeAttentisData from './types/attentis.js';
import scrapeAucklandCouncilData from './types/aucklandCouncil.js';
import scrapeCwuData from './types/cwu.js';
import scrapeCentrePortData from './types/centrePort.js';
import scrapeEcowittData from './types/ecowitt.js';
import scrapeGreaterWellingtonData from './types/greaterWellington.js';
import scrapeHbrcData from './types/hbrc.js';
import scrapeHolfuyData from './types/holfuy.js';
import scrapeHuttWeatherData from './types/huttWeather.js';
import scrapeLpcData from './types/lpc.js';
import scrapeMetserviceData from './types/metservice.js';
import scrapeMfhbData from './types/mfhb.js';
import scrapeMpycData from './types/mpyc.js';
import scrapeMrcData from './types/mrc.js';
import scrapeNavigatusData from './types/navigatus.js';
import scrapePortersData from './types/porters.js';
import scrapePortOtagoData from './types/portOtago.js';
import scrapePredictWindData from './types/predictWind.js';
import scrapePrimePortData from './types/primePort.js';
import scrapeSofarOceanData from './types/sofarOcean.js';
import scrapeTempestData from './types/tempest.js';
import scrapeWainuiData from './types/wainui.js';
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
  hw: scrapeHuttWeatherData,
  lpc: scrapeLpcData,
  metservice: scrapeMetserviceData,
  mfhb: scrapeMfhbData,
  mpyc: scrapeMpycData,
  mrc: scrapeMrcData,
  navigatus: scrapeNavigatusData,
  porters: scrapePortersData,
  po: scrapePortOtagoData,
  pw: scrapePredictWindData,
  prime: scrapePrimePortData,
  sfo: scrapeSofarOceanData,
  tempest: scrapeTempestData,
  wainui: scrapeWainuiData,
  wl: scrapeWeatherLinkData,
  wp: scrapeWeatherProData,
  wu: scrapeWeatherUndergroundData,
  windguru: scrapeWindGuruData,
  wow: scrapeWowData
};
