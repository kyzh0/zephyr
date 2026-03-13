import { Anthropic } from '@anthropic-ai/sdk';

import { httpClient, logger, type StationAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

interface AnthropicJsonResponse {
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

    // fetch img because claude caches
    const imgResponse = await httpClient.get<ArrayBuffer>(
      'https://local.timaru.govt.nz/primeport/NorthMoleWind.jpg',
      { responseType: 'arraybuffer' }
    );
    const imgBuff = Buffer.from(imgResponse.data);
    const imgBase64 = Buffer.from(imgBuff).toString('base64');

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imgBase64
              }
            },
            {
              type: 'text',
              text: `Extract the following values from this wind data image and return as JSON only:
            - maxGust10min (numeric, knots)
            - windSpeed (numeric, knots)
            - windDirection (numeric, degrees)
            
            Return only raw JSON with no markdown, no code fences, no backticks, no preamble. 
            The response must start with { and end with }.
            If any value cannot be extracted, return null for that value instead of guessing.`
            }
          ]
        }
      ]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const cleaned = content.text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      const result: AnthropicJsonResponse = JSON.parse(cleaned);
      if (result.windSpeed != null) {
        windAverage = Math.round(result.windSpeed * 1.852 * 100) / 100; // kt -> km/h
      }
      if (result.maxGust10min != null) {
        windGust = Math.round(result.maxGust10min * 1.852 * 100) / 100; // kt -> km/h
      }
      if (result.windDirection != null) {
        windBearing = result.windDirection;
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
