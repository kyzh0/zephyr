import type { WithId } from '@/types/mongoose';
import type { StationAttrs } from '@/models/stationModel';

import scrapeAttentisData from './types/attentis';
import scrapeAucklandCouncilData from './types/aucklandCouncil';
import scrapeCwuData from './types/cwu';
import scrapeCentrePortData from './types/centrePort';
import scrapeEcowittData from './types/ecowitt';
import scrapeGreaterWellingtonData from './types/greaterWellington';
import scrapeHarvestData from './types/harvest';
import scrapeHbrcData from './types/hbrc';
import scrapeHolfuyData from './types/holfuy';
import scrapeHuttWeatherData from './types/huttWeather';
import scrapeLevinMacData from './types/levinMac';
import scrapeLpcData from './types/lpc';
import scrapeMetserviceData from './types/metservice';
import scrapeMfhbData from './types/mfhb';
import scrapeMpycData from './types/mpyc';
import scrapeMrcData from './types/mrc';
import scrapeNavigatusData from './types/navigatus';
import scrapePortersData from './types/porters';
import scrapePortOtagoData from './types/portOtago';
import scrapePredictWindData from './types/predictWind';
import scrapePrimePortData from './types/primePort';
import scrapeSofarOceanData from './types/sofarOcean';
import scrapeSouthPortData from './types/southPort';
import scrapeTempestData from './types/tempest';
import scrapeWainuiData from './types/wainui';
import scrapeWeatherLinkData from './types/weatherlink';
import scrapeWeatherProData from './types/weatherPro';
import scrapeWeatherUndergroundData from './types/weatherUnderground';
import scrapeWhanganuiInletData from './types/whanganuiInlet';
import scrapeWindGuruData from './types/windGuru';
import scrapeWindyData from './types/windy';
import scrapeWowData from './types/wow';
import scrapeWswrData from './types/wswr';

export type StationScraper = (stations: WithId<StationAttrs>[]) => Promise<void>;

const scrapers = {
  attentis: scrapeAttentisData,
  ac: scrapeAucklandCouncilData,
  cwu: scrapeCwuData,
  cp: scrapeCentrePortData,
  ecowitt: scrapeEcowittData,
  gw: scrapeGreaterWellingtonData,
  harvest: scrapeHarvestData,
  hbrc: scrapeHbrcData,
  holfuy: scrapeHolfuyData,
  hw: scrapeHuttWeatherData,
  levin: scrapeLevinMacData,
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
  sp: scrapeSouthPortData,
  tempest: scrapeTempestData,
  wainui: scrapeWainuiData,
  wl: scrapeWeatherLinkData,
  wp: scrapeWeatherProData,
  wu: scrapeWeatherUndergroundData,
  wi: scrapeWhanganuiInletData,
  windguru: scrapeWindGuruData,
  windy: scrapeWindyData,
  wow: scrapeWowData,
  wswr: scrapeWswrData
} satisfies Record<string, StationScraper>;

export type StationScraperType = keyof typeof scrapers;

export default scrapers;
