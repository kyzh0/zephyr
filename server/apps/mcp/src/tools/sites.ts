import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Site } from '@zephyr/shared';

export function registerSiteTools(server: McpServer) {
  server.registerTool(
    'get_sites',
    {
      description:
        'Get all active paragliding and hang gliding launch sites as a GeoJSON FeatureCollection. Each feature includes the site name, elevation, valid wind bearings, hazards, mandatory notices, and a list of associated landing zones.'
    },
    async () => {
      const sites = await Site.find({ isDisabled: false })
        .populate('landings', 'name location elevation description hazards mandatoryNotices')
        .lean();

      const geojson = {
        type: 'FeatureCollection',
        features: sites.map((s) => {
          const landings = (
            s.landings as unknown as Array<{
              _id: { toString(): string };
              name: string;
              location: { coordinates: [number, number] };
              elevation: number;
              description?: string;
              hazards?: string;
              mandatoryNotices?: string;
            }>
          ).map((l) => ({
            id: l._id.toString(),
            name: l.name,
            elevation: l.elevation,
            coordinates: l.location.coordinates,
            description: l.description ?? null,
            hazards: l.hazards ?? null,
            mandatoryNotices: l.mandatoryNotices ?? null
          }));

          return {
            type: 'Feature',
            geometry: { type: s.location.type, coordinates: s.location.coordinates },
            properties: {
              id: s._id.toString(),
              name: s.name,
              elevation: s.elevation,
              validBearings: s.validBearings,
              description: s.description ?? null,
              hazards: s.hazards ?? null,
              mandatoryNotices: s.mandatoryNotices ?? null,
              radioFrequency: s.radioFrequency ?? null,
              siteGuideUrl: s.siteGuideUrl ?? null,
              access: s.access ?? null,
              landings
            }
          };
        })
      };

      return { content: [{ type: 'text', text: JSON.stringify(geojson, null, 2) }] };
    }
  );
}
