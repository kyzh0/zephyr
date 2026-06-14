import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Landing } from '@zephyr/shared';

export function registerLandingTools(server: McpServer) {
  server.registerTool(
    'get_landings',
    {
      description:
        'Get all active paragliding and hang gliding landing zones as a GeoJSON FeatureCollection. Each feature includes name, elevation, hazards, and mandatory notices.'
    },
    async () => {
      const landings = await Landing.find({ isDisabled: false })
        .select('name location elevation description hazards mandatoryNotices')
        .lean();

      const geojson = {
        type: 'FeatureCollection',
        features: landings.map((l) => ({
          type: 'Feature',
          geometry: { type: l.location.type, coordinates: l.location.coordinates },
          properties: {
            id: l._id.toString(),
            name: l.name,
            elevation: l.elevation,
            description: l.description ?? null,
            hazards: l.hazards ?? null,
            mandatoryNotices: l.mandatoryNotices ?? null
          }
        }))
      };

      return { content: [{ type: 'text', text: JSON.stringify(geojson, null, 2) }] };
    }
  );
}
