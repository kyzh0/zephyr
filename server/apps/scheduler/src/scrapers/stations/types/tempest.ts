import pLimit from 'p-limit';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

type TempestResponse = {
  current_conditions?: {
    includes_station_data?: boolean;
    wind_avg?: number | null;
    wind_gust?: number | null;
    wind_direction?: number | null;
    air_temperature?: number | null;
  };
};

type FirebaseAuthResponse = {
  idToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: string;
};

// Tempest's web app authenticates with a Firebase anonymous user. The ID token it issues
// is a JWT that expires after 1 hour, so we mint and refresh our own.
const FIREBASE_API_KEY = 'AIzaSyA8aLVHWe7TVmctOXXVXYTl4pnzTgUydG4';
const FIREBASE_HEADERS = { Origin: 'https://tempestwx.com', Referer: 'https://tempestwx.com/' };
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

let idToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiresAt = 0;
let pendingToken: Promise<string> | null = null;

function storeToken(
  token: string | undefined,
  refresh: string | undefined,
  expiresIn: string | undefined
): string {
  if (!token) throw new Error('missing id token in firebase response');

  idToken = token;
  refreshToken = refresh ?? refreshToken;
  tokenExpiresAt = Date.now() + (Number(expiresIn) || 3600) * 1000;
  return token;
}

async function signInAnonymously(): Promise<string> {
  const { data } = await httpClient.post<FirebaseAuthResponse>(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    { returnSecureToken: true },
    { headers: FIREBASE_HEADERS }
  );

  return storeToken(data.idToken, data.refreshToken, data.expiresIn);
}

async function refreshIdToken(): Promise<string> {
  const { data } = await httpClient.post<FirebaseAuthResponse>(
    `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
    new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken as string }),
    { headers: FIREBASE_HEADERS }
  );

  return storeToken(data.id_token, data.refresh_token, data.expires_in);
}

async function getToken(): Promise<string> {
  if (idToken && Date.now() < tokenExpiresAt - REFRESH_MARGIN_MS) return idToken;

  // share one in-flight request between concurrent stations
  pendingToken ??= (async () => {
    try {
      if (refreshToken) {
        try {
          return await refreshIdToken();
        } catch {
          logger.warn('tempest token refresh failed, signing in again', {
            service: 'station',
            type: 'tempest'
          });
        }
      }

      return await signInAnonymously();
    } finally {
      pendingToken = null;
    }
  })();

  return pendingToken;
}

export default async function scrapeTempestData(stations: WithId<StationAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    stations.map((station) =>
      limit(async () => {
        try {
          let windAverage: number | null = null;
          let windGust: number | null = null;
          let windBearing: number | null = null;
          let temperature: number | null = null;

          const token = await getToken();

          const { data } = await httpClient.get<TempestResponse>(
            `https://swd.weatherflow.com/swd/rest/better_forecast?api_key=${process.env.TEMPEST_KEY}&station_id=${station.externalId}&units_temp=c&units_wind=kph&token=${token}`
          );

          const cc = data.current_conditions;
          if (cc && cc.includes_station_data) {
            windAverage = cc.wind_avg ?? null;
            windGust = cc.wind_gust ?? null;
            windBearing = cc.wind_direction ?? null;
            temperature = cc.air_temperature ?? null;
          }

          await processScrapedData(station, windAverage, windGust, windBearing, temperature);
        } catch {
          logger.warn(`tempest error - ${station.externalId}`, {
            service: 'station',
            type: 'tempest'
          });

          await processScrapedData(station, null, null, null, null, true);
        }
      })
    )
  );
}
