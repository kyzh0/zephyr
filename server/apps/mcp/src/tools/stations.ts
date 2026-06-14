import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Station, StationData } from '@zephyr/shared';

const MS_24H = 24 * 60 * 60 * 1000;
const MS_30D = 30 * 24 * 60 * 60 * 1000;

function parseDate(value: string): Date | null {
  const num = Number(value);
  if (!Number.isNaN(num)) {
    return new Date(num * 1000);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function registerStationTools(server: McpServer) {
  server.registerTool(
    'get_stations',
    {
      description:
        'Get all active weather stations with their current wind speed, gust, bearing, and temperature readings as a GeoJSON FeatureCollection. Each feature includes an "id" property you can pass to get_station_data.'
    },
    async () => {
      const stations = await Station.find({ isDisabled: { $ne: true } })
        .select(
          'name location elevation currentAverage currentGust currentBearing currentTemperature isHighResolution isOffline lastUpdate'
        )
        .lean();

      const geojson = {
        type: 'FeatureCollection',
        features: stations.map((s) => ({
          type: 'Feature',
          geometry: s.location,
          properties: {
            id: s._id.toString(),
            name: s.name,
            elevation: s.elevation ?? null,
            currentAverage: s.currentAverage ?? null,
            currentGust: s.currentGust ?? null,
            currentBearing: s.currentBearing ?? null,
            currentTemperature: s.currentTemperature ?? null,
            isHighResolution: s.isHighResolution ?? false,
            isOffline: s.isOffline ?? false,
            lastUpdate: s.lastUpdate
          }
        }))
      };

      return { content: [{ type: 'text', text: JSON.stringify(geojson, null, 2) }] };
    }
  );

  server.registerTool(
    'get_station_data',
    {
      description:
        'Get historical wind and temperature readings for a station. Omit from/to to get the last 24 hours. Supply a range for historical data — the window is capped at 30 days. Dates accept ISO 8601 strings or Unix seconds.',
      inputSchema: {
        stationId: z.string().describe('Station ID from the id property in get_stations output'),
        from: z
          .string()
          .optional()
          .describe('Range start — ISO 8601 or Unix seconds. Defaults to 24h ago.'),
        to: z.string().optional().describe('Range end — ISO 8601 or Unix seconds. Defaults to now.')
      }
    },
    async ({ stationId, from, to }) => {
      if (!isValidObjectId(stationId)) {
        return {
          content: [
            { type: 'text', text: JSON.stringify({ error: `Invalid station ID: ${stationId}` }) }
          ],
          isError: true
        };
      }

      const station = await Station.findById(stationId).select('name').lean();
      if (!station) {
        return {
          content: [
            { type: 'text', text: JSON.stringify({ error: `Station ${stationId} not found` }) }
          ],
          isError: true
        };
      }

      const dateTo = to ? parseDate(to) : new Date();
      let dateFrom = from ? parseDate(from) : null;

      if (!dateTo) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Invalid "to" date: ${to}` }) }],
          isError: true
        };
      }
      if (from && !dateFrom) {
        return {
          content: [
            { type: 'text', text: JSON.stringify({ error: `Invalid "from" date: ${from}` }) }
          ],
          isError: true
        };
      }

      // Default to last 24h; cap window at 30 days
      if (!dateFrom) {
        dateFrom = new Date(dateTo.getTime() - MS_24H);
      } else if (dateTo.getTime() - dateFrom.getTime() > MS_30D) {
        dateFrom = new Date(dateTo.getTime() - MS_30D);
      }

      const data = await StationData.find({
        station: stationId,
        time: { $gte: dateFrom, $lte: dateTo }
      })
        .sort({ time: -1 })
        .select('time windAverage windGust windBearing temperature -_id')
        .lean();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                stationId,
                stationName: station.name,
                from: dateFrom.toISOString(),
                to: dateTo.toISOString(),
                count: data.length,
                data
              },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
