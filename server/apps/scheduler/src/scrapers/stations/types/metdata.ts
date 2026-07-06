import { GoogleGenAI } from '@google/genai';

import {
  getWindBearingFromDirection,
  httpClient,
  logger,
  type StationAttrs,
  type WithId
} from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

interface GeminiJsonResponse {
  stAnnePoint: GeminiStationData;
  copperPoint: GeminiStationData;
}

interface GeminiStationData {
  windGusting: number | null;
  windSpeed: number | null;
  windDirection: string | null;
}

export default async function scrapeMetdataData(stations: WithId<StationAttrs>[]): Promise<void> {
  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    const temperature: number | null = null;

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
                }
              },
              required: ['windGusting', 'windSpeed', 'windDirection']
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
                }
              },
              required: ['windGusting', 'windSpeed', 'windDirection']
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
        await processScrapedData(s, windAverage, windGust, windBearing, temperature);
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
