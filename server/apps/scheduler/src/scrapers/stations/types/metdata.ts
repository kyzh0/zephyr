import { GoogleGenAI } from '@google/genai';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

import {
  getWindBearingFromDirection,
  httpClient,
  logger,
  type StationAttrs,
  type WithId
} from '@zephyr/shared';
import processScrapedData from '../processScrapedData';
import { isTimestampFresh } from '@/lib/utils';

interface GeminiJsonResponse {
  stAnnePoint: GeminiStationData;
  copperPoint: GeminiStationData;
}

interface GeminiStationData {
  windGusting: number | null;
  windSpeed: number | null;
  windDirection: string | null;
  timestamp: string | null;
}

export default async function scrapeMetdataData(stations: WithId<StationAttrs>[]): Promise<void> {
  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    const temperature: number | null = null;
    let timestamp: string | null = null;

    // fetch img to bust caching
    const imgResponse = await httpClient.get<ArrayBuffer>(
      'https://www.metdata.net.nz/es/Milford_DataMap.png',
      { responseType: 'arraybuffer' }
    );
    const imgBuff = Buffer.from(imgResponse.data);
    const imgBase64 = Buffer.from(imgBuff).toString('base64');

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imgBase64
          }
        },
        {
          text: `Extract the relevant values for St Anne Point and Copper Point from this wind data image and return as JSON only.            
            If any value cannot be extracted, or is invalid, return null for that value instead of guessing.`
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            stAnnePoint: {
              type: 'object',
              properties: {
                windGusting: {
                  type: 'number',
                  description: 'Maximum gust, in knots'
                },
                windSpeed: {
                  type: 'number',
                  description: 'Wind speed, in knots'
                },
                windDirection: {
                  type: 'string',
                  description: 'Cardinal wind direction'
                },
                timestamp: {
                  type: 'string',
                  description: 'Timestamp of the data in the string format hh:mm aa dd/MM'
                }
              },
              required: ['windGusting', 'windSpeed', 'windDirection', 'timestamp']
            },
            copperPoint: {
              type: 'object',
              properties: {
                windGusting: {
                  type: 'number',
                  description: 'Maximum gust, in knots'
                },
                windSpeed: {
                  type: 'number',
                  description: 'Wind speed, in knots'
                },
                windDirection: {
                  type: 'string',
                  description: 'Cardinal wind direction'
                },
                timestamp: {
                  type: 'string',
                  description: 'Timestamp of the data in the string format hh:mm aa dd/MM'
                }
              },
              required: ['windGusting', 'windSpeed', 'windDirection', 'timestamp']
            }
          },
          required: ['stAnnePoint', 'copperPoint']
        }
      }
    });

    if (response?.text) {
      const data: GeminiJsonResponse = JSON.parse(response.text);
      for (const s of stations) {
        if (s.externalId === 'stannepoint') {
          if (data.stAnnePoint?.timestamp != null) {
            timestamp = data.stAnnePoint?.timestamp;
          }
          if (data.stAnnePoint?.windSpeed != null) {
            windAverage = Math.round(data.stAnnePoint.windSpeed * 1.852 * 100) / 100; // kt -> km/h
          }
          if (data.stAnnePoint?.windGusting != null) {
            windGust = Math.round(data.stAnnePoint.windGusting * 1.852 * 100) / 100; // kt -> km/h
          }
          if (data.stAnnePoint?.windDirection != null) {
            windBearing = getWindBearingFromDirection(data.stAnnePoint.windDirection);
          }
        } else if (s.externalId === 'copperpoint') {
          if (data.copperPoint?.timestamp != null) {
            timestamp = data.copperPoint?.timestamp;
          }
          if (data.copperPoint?.windSpeed != null) {
            windAverage = Math.round(data.copperPoint.windSpeed * 1.852 * 100) / 100; // kt -> km/h
          }
          if (data.copperPoint?.windGusting != null) {
            windGust = Math.round(data.copperPoint.windGusting * 1.852 * 100) / 100; // kt -> km/h
          }
          if (data.copperPoint?.windDirection != null) {
            windBearing = getWindBearingFromDirection(data.copperPoint.windDirection);
          }
        }

        let lastUpdate = null;
        if (timestamp?.length) {
          lastUpdate = fromZonedTime(
            parse(timestamp, 'hh:mm aa dd/MM', new Date()),
            'Pacific/Auckland'
          );
        }
        if (isTimestampFresh(lastUpdate)) {
          await processScrapedData(s, windAverage, windGust, windBearing, temperature);
        } else {
          logger.warn('metdata stale data', {
            service: 'station',
            type: 'metdata'
          });
        }
      }
    }
  } catch (error) {
    logger.warn('metdata error', { service: 'station', type: 'metdata' });

    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(msg, { service: 'station', type: 'metdata' });

    for (const s of stations) {
      await processScrapedData(s, null, null, null, null, true);
    }
  }
}
