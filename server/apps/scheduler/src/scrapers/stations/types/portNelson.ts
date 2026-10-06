import { GoogleGenAI } from '@google/genai';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';
import { isTimestampFresh } from '@/lib/utils';
import { fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';

interface GeminiJsonResponse {
  timestamp: string | null;
  maxGust15Min: number | null;
  windAverage15Min: number | null;
  windDirection: number | null;
}

export default async function scrapePortNelsonData(
  stations: WithId<StationAttrs>[]
): Promise<void> {
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
      'https://web.portnelson.co.nz/Webcam/PNL_Situation.jpg',
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
          text: `Extract the relevant values for "Fairway Beacon: Wave & Wind" only from this wind data image and return as JSON only.            
            Ignore data for other sites in the image. If any value cannot be extracted, return null for that value instead of guessing.`
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            maxGust15Min: {
              type: 'number',
              description: 'Maximum gust in the last 15 minutes, in knots'
            },
            windAverage15Min: {
              type: 'number',
              description: 'Wind average over the latest 15 minutes, in knots'
            },
            windDirection: {
              type: 'number',
              description: 'Wind direction, in degrees'
            },
            timestamp: {
              type: 'string',
              description:
                'Date and time the image was taken, in the format "d/M/yyyy HH:mm". Located in the top right corner of the image'
            }
          },
          required: ['maxGust15Min', 'windAverage15Min', 'windDirection', 'timestamp']
        }
      }
    });

    if (response?.text) {
      const data: GeminiJsonResponse = JSON.parse(response.text);
      let lastUpdate = null;
      if (data.timestamp?.length) {
        lastUpdate = fromZonedTime(
          parse(data.timestamp, 'd/M/yyyy HH:mm', new Date()),
          'Pacific/Auckland'
        );
      }
      if (isTimestampFresh(lastUpdate)) {
        if (data.windAverage15Min != null) {
          windAverage = Math.round(data.windAverage15Min * 1.852 * 100) / 100; // kt -> km/h
        }
        if (data.maxGust15Min != null) {
          windGust = Math.round(data.maxGust15Min * 1.852 * 100) / 100; // kt -> km/h
        }
        if (data.windDirection != null) {
          windBearing = data.windDirection;
        }
      } else {
        logger.warn(`port nelson stale data - ${station.externalId}`, {
          service: 'station',
          type: 'nelson'
        });
      }

      await processScrapedData(station, windAverage, windGust, windBearing, temperature);
    }
  } catch (error) {
    logger.warn('port nelson error', { service: 'station', type: 'nelson' });

    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(msg, { service: 'station', type: 'nelson' });

    await processScrapedData(station, null, null, null, null, true);
  }
}
