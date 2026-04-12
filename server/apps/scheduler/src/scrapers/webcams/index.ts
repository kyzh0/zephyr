import { WebcamAttrs, type WithId } from '@zephyr/shared';

import scrapeArthursPassData from './types/arthursPass';
import scrapeWebcamFtpData from './types/webcamFtp';
import scrapeCastleHillData from './types/castleHill';
import scrapeCgcData from './types/cgc';
import scrapeCheesemanData from './types/cheeseman';
import scrapeCwuData from './types/cwu';
import scrapeHarvestData from './types/harvest';
import scrapeLakeWanakaData from './types/lakeWanaka';
import scrapeMetserviceData from './types/metservice';
import scrapeMtHuttData from './types/mtHutt';
import scrapeQueenstownAirportData from './types/queenstownAirport';
import scrapeSnowgrassData from './types/snowgrass';
import scrapeSrsData from './types/srs';
import scrapeTaylorsSurfData from './types/taylorsSurf';
import scrapeWanakaAirportData from './types/wanakaAirport';

export type WebcamScraper = (webcams: WithId<WebcamAttrs>[]) => Promise<void>;

const scrapers = {
  ap: scrapeArthursPassData,
  camftp: scrapeWebcamFtpData,
  ch: scrapeCastleHillData,
  cgc: scrapeCgcData,
  cm: scrapeCheesemanData,
  cwu: scrapeCwuData,
  harvest: scrapeHarvestData,
  lw: scrapeLakeWanakaData,
  metservice: scrapeMetserviceData,
  hutt: scrapeMtHuttData,
  qa: scrapeQueenstownAirportData,
  snowgrass: scrapeSnowgrassData,
  srs: scrapeSrsData,
  ts: scrapeTaylorsSurfData,
  wa: scrapeWanakaAirportData
} satisfies Record<string, WebcamScraper>;

export type WebcamScraperType = keyof typeof scrapers;

export default scrapers;
