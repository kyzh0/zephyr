import { GoogleGenAI } from '@google/genai';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

interface GeminiJsonResponse {
  maxGust10min: number | null;
  windSpeed: number | null;
  windDirection: number | null;
}

export default async function scrapePrimePortData(stations: WithId<StationAttrs>[]): Promise<void> {
  const station = stations[0];
  if (!station) {
    return;
  }

  try {
    let windAverage: number | null = null;
    let windGust: number | null = null;
    let windBearing: number | null = null;
    const temperature: number | null = null;

    // fetch img to bust caching
    const imgResponse = await httpClient.get<ArrayBuffer>(
      'https://local.timaru.govt.nz/primeport/NorthMoleWind.jpg',
      { responseType: 'arraybuffer' }
    );
    const imgBuff = Buffer.from(imgResponse.data);
    const imgBase64 = Buffer.from(imgBuff).toString('base64');

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imgBase64
          }
        },
        {
          text: `Extract the relevant values from this wind data image and return as JSON only.            
            If any value cannot be extracted, return null for that value instead of guessing.`
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            maxGust10min: {
              type: 'number',
              description: 'Maximum gust in the last 10 minutes, in knots'
            },
            windSpeed: {
              type: 'number',
              description: 'Wind speed, in knots'
            },
            windDirection: {
              type: 'number',
              description: 'Wind direction, in degrees'
            }
          },
          required: ['maxGust10min', 'windSpeed', 'windDirection']
        }
      }
    });

    if (response?.text) {
      const data: GeminiJsonResponse = JSON.parse(response.text);
      if (data.windSpeed != null) {
        windAverage = Math.round(data.windSpeed * 1.852 * 100) / 100; // kt -> km/h
      }
      if (data.maxGust10min != null) {
        windGust = Math.round(data.maxGust10min * 1.852 * 100) / 100; // kt -> km/h
      }
      if (data.windDirection != null) {
        windBearing = data.windDirection;
      }
    }

    await processScrapedData(station, windAverage, windGust, windBearing, temperature);
  } catch (error) {
    logger.warn('primeport error', { service: 'station', type: 'prime' });

    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(msg, { service: 'station', type: 'prime' });

    await processScrapedData(station, null, null, null, null, true);
  }
}
