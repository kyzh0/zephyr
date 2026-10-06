import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(scriptDir, '..');
const inputPath = path.join(clientDir, 'public', 'airspace.txt');
const outputPath = path.join(clientDir, 'public', 'airspace.geojson');

const EARTH_RADIUS_NM = 3440.069;
const ARC_STEP_DEGREES = 1;
const CIRCLE_POINTS = 72;
// Allow small differences from rounded coordinates, but report inconsistent source arcs.
const ARC_RADIUS_TOLERANCE_NM = 0.1;

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

export function arcPoints(center, endpoints, direction, onWarning = () => {}) {
  const [start, end] = endpoints;
  const radius = distanceNm(center, start);
  const radiusDifference = Math.abs(distanceNm(center, end) - radius);
  if (radiusDifference > ARC_RADIUS_TOLERANCE_NM) {
    onWarning(`Arc endpoints differ in radius by ${(radiusDifference * 1852).toFixed(0)} m`);
  }
  const startBearing = bearing(center, start) % 360;
  const endBearing = bearing(center, end) % 360;
  const clockwiseDelta = (endBearing - startBearing + 360) % 360;
  const delta = direction === '-' ? -((360 - clockwiseDelta) % 360) : clockwiseDelta;
  const steps = Math.max(1, Math.ceil(Math.abs(delta) / ARC_STEP_DEGREES));

  // Use the supplied vertices exactly, including when source radii are inconsistent.
  return [
    start,
    ...Array.from({ length: steps - 1 }, (_, index) =>
      destination(center, radius, startBearing + (delta * (index + 1)) / steps)
    ),
    end
  ];
}

function circlePoints(center, radiusNm) {
  const points = Array.from({ length: CIRCLE_POINTS }, (_, index) =>
    destination(center, radiusNm, (index / CIRCLE_POINTS) * 360)
  );
  return [...points, points[0]];
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

export function parseAltitude(value) {
  if (!value) return { feet: null, display: 'Not specified' };
  const normalizedValue = value.trim();

  if (/^SFC$/i.test(normalizedValue)) return { feet: 0, display: 'SFC' };

  const flightLevelMatch = normalizedValue.match(/^FL\s*(\d+)$/i);
  if (flightLevelMatch) {
    const feet = Number(flightLevelMatch[1]) * 100;
    return {
      feet,
      display: `FL ${flightLevelMatch[1]} (${feet.toLocaleString('en-NZ')} ft STD)`
    };
  }

  const feetMatch = normalizedValue.match(/^(\d+(?:\.\d+)?)\s*(?:FT)?\s*(AMSL|AGL)?$/i);
  if (feetMatch) {
    const feet = Number(feetMatch[1]);
    const reference = feetMatch[2] ? ` ${feetMatch[2].toUpperCase()}` : '';
    return { feet, display: `${feet.toLocaleString('en-NZ')} ft${reference}` };
  }

  // Conditional limits and unrecognised units retain the complete source text.
  return { feet: null, display: normalizedValue };
}

export function parseAirspace(text, { onWarning = console.warn } = {}) {
  const features = [];
  let current = null;

  const finish = () => {
    if (!current) return;
    const coordinates = current.coordinates;
    if (coordinates.length < 3) return;
    const upper = parseAltitude(current.upper);
    const lower = parseAltitude(current.lower);
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
        upperFeet: upper.feet,
        lowerFeet: lower.feet,
        upperDisplay: upper.display,
        lowerDisplay: lower.display
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
      appendPoints(current.coordinates, [parseCoordinate(value)]);
    } else if (command === 'V' && /^X=/i.test(value)) {
      current.center = parseCoordinate(value.slice(2).trim());
    } else if (command === 'V' && /^D=/i.test(value)) {
      current.direction = value.slice(2).trim();
    } else if (command === 'DB') {
      if (!current.center)
        throw new Error(`Arc has no center in ${current.name ?? 'unnamed airspace'}`);
      const points = arcPoints(
        current.center,
        parseCoordinatePair(value),
        current.direction,
        (warning) => onWarning(`${current.name ?? 'Unnamed airspace'}: ${warning}`)
      );
      appendPoints(current.coordinates, points);
    } else if (command === 'DC') {
      if (!current.center)
        throw new Error(`Circle has no center in ${current.name ?? 'unnamed airspace'}`);
      appendPoints(current.coordinates, circlePoints(current.center, Number(value)));
    }
  }

  finish();
  return { type: 'FeatureCollection', features };
}

function appendPoints(coordinates, points) {
  for (const point of points) {
    const previous = coordinates.at(-1);
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) coordinates.push(point);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const text = await readFile(inputPath, 'utf8');
  const geojson = parseAirspace(text);
  await writeFile(outputPath, `${JSON.stringify(geojson)}\n`);
  console.log(
    `Wrote ${geojson.features.length} airspace features to ${path.relative(process.cwd(), outputPath)}`
  );
}
