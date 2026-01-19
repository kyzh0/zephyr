import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
  dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname });
}

export * from './lib/httpClient';
export * from './lib/logger';
export * from './lib/utils';

export * from './models/camModel';
export * from './models/clientModel';
export * from './models/landingModel';
export * from './models/outputModel';
export * from './models/siteModel';
export * from './models/soundingModel';
export * from './models/stationDataModel';
export * from './models/stationModel';
export * from './models/userModel';

export * from './types/mongoose';
