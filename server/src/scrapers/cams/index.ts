import type { CamDoc } from '@/models/camModel';

import scrapeArthursPassData from './types/arthursPass';
import scrapeCamFtpData from './types/camFtp';
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
import scrapeTaylorsSurfData from './types/taylorsSurf';
import scrapeWanakaAirportData from './types/wanakaAirport';

export type CamScraper = (cams: CamDoc[]) => Promise<void>;

const scrapers = {
  ap: scrapeArthursPassData,
  camftp: scrapeCamFtpData,
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
  ts: scrapeTaylorsSurfData,
  wa: scrapeWanakaAirportData
} satisfies Record<string, CamScraper>;

export type CamScraperType = keyof typeof scrapers;

export default scrapers;
