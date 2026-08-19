import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(scriptDir, '..');
const inputPath = path.join(clientDir, 'public', 'airspace.txt');
const outputPath = path.join(clientDir, 'public', 'airspace.geojson');

const EARTH_RADIUS_NM = 3440.069;
const ARC_STEP_DEGREES = 1;
const CIRCLE_POINTS = 72;

function parseCoordinate(value) {
  const match = value.match(
    /^(\d+):([\d.]+):([\d.]+)\s*([NS])\s+(\d+):([\d.]+):([\d.]+)\s*([EW])$/i
  );
  if (!match) throw new Error(`Invalid coordinate: ${value}`);

  const [
    ,
    latDegrees,
    latMinutes,
    latSeconds,
    latHemisphere,
    lonDegrees,
    lonMinutes,
    lonSeconds,
    lonHemisphere
  ] = match;
  const latitude = Number(latDegrees) + Number(latMinutes) / 60 + Number(latSeconds) / 3600;
  const longitude = Number(lonDegrees) + Number(lonMinutes) / 60 + Number(lonSeconds) / 3600;

  return [
    lonHemisphere.toUpperCase() === 'W' ? -longitude : longitude,
    latHemisphere.toUpperCase() === 'S' ? -latitude : latitude
  ];
}

function parseCoordinatePair(value) {
  const [start, end] = value.split(/\s*,\s*/);
  return [parseCoordinate(start), parseCoordinate(end)];
}

function distanceNm(from, to) {
  const lat1 = (from[1] * Math.PI) / 180;
  const lat2 = (to[1] * Math.PI) / 180;
  const deltaLat = lat2 - lat1;
  const deltaLon = ((to[0] - from[0]) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}

function bearing(from, to) {
  const lat1 = (from[1] * Math.PI) / 180;
  const lat2 = (to[1] * Math.PI) / 180;
  const deltaLon = ((to[0] - from[0]) * Math.PI) / 180;
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return (Math.atan2(y, x) * 180) / Math.PI + 360;
}

function destination(center, distance, bearingDegrees) {
  const latitude = (center[1] * Math.PI) / 180;
  const longitude = (center[0] * Math.PI) / 180;
  const bearingRadians = (bearingDegrees * Math.PI) / 180;
  const angularDistance = distance / EARTH_RADIUS_NM;
  const destinationLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance) +
      Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearingRadians)
  );
  const destinationLongitude =
    longitude +
    Math.atan2(
      Math.sin(bearingRadians) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(destinationLatitude)
    );

  return [(destinationLongitude * 180) / Math.PI, (destinationLatitude * 180) / Math.PI];
}

function arcPoints(center, endpoints, direction) {
  const [start, end] = endpoints;
  const radius = distanceNm(center, start);
  const startBearing = bearing(center, start) % 360;
  const endBearing = bearing(center, end) % 360;
  const clockwiseDelta = (endBearing - startBearing + 360) % 360;
  const delta = direction === '-' ? -(360 - clockwiseDelta) : clockwiseDelta;
  const steps = Math.max(1, Math.ceil(Math.abs(delta) / ARC_STEP_DEGREES));

  return Array.from({ length: steps + 1 }, (_, index) =>
    destination(center, radius, startBearing + (delta * index) / steps)
  );
}

function circlePoints(center, radiusNm) {
  return Array.from({ length: CIRCLE_POINTS + 1 }, (_, index) =>
    destination(center, radiusNm, (index / CIRCLE_POINTS) * 360)
  );
}

function getNzAirspaceType(airspaceClass, name) {
  const identifierMatch = name?.match(/\b(NZ[A-Z])\s*\d+/i);
  const identifier = identifierMatch?.[1]?.toUpperCase();

  if (airspaceClass === 'Q') {
    if (identifier === 'NZV') return 'VHZ';
    if (identifier === 'NZD') return 'D';
  }
  if (airspaceClass === 'W') {
    if (identifier === 'NZT') return 'T';
    if (identifier === 'NZG') return 'GAA';
  }
  if (airspaceClass === 'F') return 'GAA Temporary';
  if (airspaceClass === 'O') return 'R Temporary';

  const classMap = {
    A: 'MBZ',
    B: 'CFZ',
    C: 'CTA C',
    D: 'CTA D',
    E: 'PLA',
    P: 'MOA',
    R: 'R',
    CTR: 'CTR'
  };

  return classMap[airspaceClass] ?? airspaceClass ?? null;
}

function parseAltitudeFeet(value) {
  if (!value) return null;
  const normalizedValue = value.trim();

  if (/^SFC(?:\b|\/)/i.test(normalizedValue)) return 0;

  const flightLevelMatch = normalizedValue.match(/^FL\s*(\d+)\b/i);
  if (flightLevelMatch) return Number(flightLevelMatch[1]) * 100;

  const feetMatch = normalizedValue.match(/^(\d+(?:\.\d+)?)\s*(?:FT)?\b/i);
  return feetMatch ? Number(feetMatch[1]) : null;
}

function parseAirspace(text) {
  const features = [];
  let current = null;

  const finish = () => {
    if (!current) return;
    const coordinates = current.coordinates;
    if (coordinates.length < 3) return;
    if (
      coordinates[0][0] !== coordinates.at(-1)[0] ||
      coordinates[0][1] !== coordinates.at(-1)[1]
    ) {
      coordinates.push(coordinates[0]);
    }
    features.push({
      type: 'Feature',
      properties: {
        name: current.name ?? 'Unnamed airspace',
        airspaceClass: getNzAirspaceType(current.airspaceClass, current.name),
        openAirClass: current.airspaceClass ?? null,
        upper: current.upper ?? null,
        lower: current.lower ?? null,
        upperFeet: parseAltitudeFeet(current.upper),
        lowerFeet: parseAltitudeFeet(current.lower)
      },
      geometry: { type: 'Polygon', coordinates: [coordinates] }
    });
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('*')) continue;

    const [command, ...rest] = line.split(/\s+/);
    const value = rest.join(' ').trim();

    if (command === 'AC') {
      finish();
      current = { airspaceClass: value, coordinates: [], center: null, direction: '+' };
    } else if (!current) {
      continue;
    } else if (command === 'AN') {
      current.name = value;
    } else if (command === 'AH') {
      current.upper = value;
    } else if (command === 'AL') {
      current.lower = value;
    } else if (command === 'DP') {
      current.coordinates.push(parseCoordinate(value));
    } else if (command === 'V' && /^X=/i.test(value)) {
      current.center = parseCoordinate(value.slice(2).trim());
    } else if (command === 'V' && /^D=/i.test(value)) {
      current.direction = value.slice(2).trim();
    } else if (command === 'DB') {
      if (!current.center)
        throw new Error(`Arc has no center in ${current.name ?? 'unnamed airspace'}`);
      const points = arcPoints(current.center, parseCoordinatePair(value), current.direction);
      current.coordinates.push(...points.slice(1));
    } else if (command === 'DC') {
      if (!current.center)
        throw new Error(`Circle has no center in ${current.name ?? 'unnamed airspace'}`);
      current.coordinates.push(...circlePoints(current.center, Number(value)));
    }
  }

  finish();
  return { type: 'FeatureCollection', features };
}

const text = await readFile(inputPath, 'utf8');
const geojson = parseAirspace(text);
await writeFile(outputPath, `${JSON.stringify(geojson)}\n`);
console.log(
  `Wrote ${geojson.features.length} airspace features to ${path.relative(process.cwd(), outputPath)}`
);
