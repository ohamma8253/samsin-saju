import * as Astronomy from 'astronomy-engine';
import type { BirthInput } from './manselyeok-core';

export type ZodiacSign =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces';

export type PlanetId =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'
  | 'Chiron'
  | 'NorthNode'
  | 'SouthNode';

export type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

export interface PlanetPositionCore {
  id: PlanetId;
  longitude: number;
  latitude: number;
  speed: number;
  sign: ZodiacSign;
  degreeInSign: number;
  isRetrograde: boolean;
  house: number;
}

export interface NatalHouseCore {
  number: number;
  cuspLongitude: number;
  sign: ZodiacSign;
  degreeInSign: number;
}

export interface NatalAnglePointCore {
  longitude: number;
  sign: ZodiacSign;
  degreeInSign: number;
}

export interface NatalAnglesCore {
  asc: NatalAnglePointCore;
  mc: NatalAnglePointCore;
  desc: NatalAnglePointCore;
  ic: NatalAnglePointCore;
}

export interface NatalAspectCore {
  planet1: PlanetId;
  planet2: PlanetId;
  type: AspectType;
  angle: number;
  orb: number;
}

export interface NatalChartCore {
  input: BirthInput;
  planets: PlanetPositionCore[];
  houses: NatalHouseCore[];
  angles: NatalAnglesCore;
  aspects: NatalAspectCore[];
}

const ZODIAC_SIGNS: ZodiacSign[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

const PLANET_BODIES: Array<{ id: PlanetId; body: Astronomy.Body }> = [
  { id: 'Sun', body: Astronomy.Body.Sun },
  { id: 'Moon', body: Astronomy.Body.Moon },
  { id: 'Mercury', body: Astronomy.Body.Mercury },
  { id: 'Venus', body: Astronomy.Body.Venus },
  { id: 'Mars', body: Astronomy.Body.Mars },
  { id: 'Jupiter', body: Astronomy.Body.Jupiter },
  { id: 'Saturn', body: Astronomy.Body.Saturn },
  { id: 'Uranus', body: Astronomy.Body.Uranus },
  { id: 'Neptune', body: Astronomy.Body.Neptune },
  { id: 'Pluto', body: Astronomy.Body.Pluto },
];

const ASPECTS: Array<{ type: AspectType; angle: number; orb: number }> = [
  { type: 'conjunction', angle: 0, orb: 8 },
  { type: 'sextile', angle: 60, orb: 6 },
  { type: 'square', angle: 90, orb: 8 },
  { type: 'trine', angle: 120, orb: 8 },
  { type: 'opposition', angle: 180, orb: 8 },
];

const DEFAULT_LATITUDE = 37.5194;
const DEFAULT_LONGITUDE = 127.0992;

function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function angularDistance(a: number, b: number): number {
  const distance = Math.abs(norm(a) - norm(b));
  return distance > 180 ? 360 - distance : distance;
}

export function lonToSign(lon: number): ZodiacSign {
  return ZODIAC_SIGNS[Math.floor(norm(lon) / 30)] ?? 'Aries';
}

function degreeInSign(lon: number): number {
  return norm(lon) % 30;
}

function anglePoint(lon: number): NatalAnglePointCore {
  return {
    longitude: norm(lon),
    sign: lonToSign(lon),
    degreeInSign: degreeInSign(lon),
  };
}

function offsetMinutesForTimeZone(date: Date, timeZone: string): number {
  const utcString = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const timeZoneString = date.toLocaleString('en-US', { timeZone });
  return (new Date(timeZoneString).getTime() - new Date(utcString).getTime()) / 60000;
}

function toUtcDate(input: BirthInput): Date {
  const localMillis = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0);
  let utcMillis = localMillis - 9 * 60 * 60000;

  for (let i = 0; i < 3; i++) {
    const offsetMinutes = offsetMinutesForTimeZone(new Date(utcMillis), 'Asia/Seoul');
    utcMillis = localMillis - offsetMinutes * 60000;
  }

  return new Date(utcMillis);
}

function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function greenwichMeanSiderealTime(date: Date): number {
  const jd = julianDay(date);
  const t = (jd - 2451545.0) / 36525;
  return norm(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t - (t * t * t) / 38710000);
}

function meanObliquity(date: Date): number {
  const t = (julianDay(date) - 2451545.0) / 36525;
  return 23.439291 - 0.0130042 * t;
}

function eclipticLongitudeFromRightAscension(rightAscension: number, obliquity: number): number {
  const ra = rightAscension * Math.PI / 180;
  const eps = obliquity * Math.PI / 180;
  return norm(Math.atan2(Math.sin(ra) / Math.cos(eps), Math.cos(ra)) * 180 / Math.PI);
}

function declinationFromEclipticLongitude(longitude: number, obliquity: number): number {
  const lon = longitude * Math.PI / 180;
  const eps = obliquity * Math.PI / 180;
  return Math.asin(Math.sin(eps) * Math.sin(lon)) * 180 / Math.PI;
}

function calculateAngles(date: Date, latitude: number, longitude: number): NatalAnglesCore {
  const lst = norm(greenwichMeanSiderealTime(date) + longitude) * Math.PI / 180;
  const lat = latitude * Math.PI / 180;
  const eps = meanObliquity(date) * Math.PI / 180;
  const mc = norm(Math.atan2(Math.sin(lst), Math.cos(lst) * Math.cos(eps)) * 180 / Math.PI);
  const asc = norm(Math.atan2(
    Math.cos(lst),
    -Math.sin(lst) * Math.cos(eps) - Math.tan(lat) * Math.sin(eps),
  ) * 180 / Math.PI);

  return {
    asc: anglePoint(asc),
    mc: anglePoint(mc),
    desc: anglePoint(asc + 180),
    ic: anglePoint(mc + 180),
  };
}

function longitudeForBody(body: Astronomy.Body, date: Date): { longitude: number; latitude: number } {
  const vector = Astronomy.GeoVector(body, date, true);
  const ecliptic = Astronomy.Ecliptic(vector);
  return {
    longitude: norm(ecliptic.elon),
    latitude: ecliptic.elat,
  };
}

function centeredSpeedForBody(body: Astronomy.Body, date: Date, stepMillis: number): number {
  const previous = new Date(date.getTime() - stepMillis);
  const next = new Date(date.getTime() + stepMillis);
  const previousLon = longitudeForBody(body, previous).longitude;
  const nextLon = longitudeForBody(body, next).longitude;
  const forward = norm(nextLon - previousLon);
  const motion = forward > 180 ? forward - 360 : forward;
  return motion / (2 * stepMillis / 86400000);
}

function speedForBody(body: Astronomy.Body, date: Date): number {
  const oneDaySpeed = centeredSpeedForBody(body, date, 86400000);
  if (Math.abs(oneDaySpeed) >= 0.02) return oneDaySpeed;

  const sixHourSpeed = centeredSpeedForBody(body, date, 21600000);
  if (Math.abs(sixHourSpeed) >= 0.001) return sixHourSpeed;

  return centeredSpeedForBody(body, date, 3600000);
}

function house(number: number, cuspLongitude: number): NatalHouseCore {
  return {
    number,
    cuspLongitude: norm(cuspLongitude),
    sign: lonToSign(cuspLongitude),
    degreeInSign: degreeInSign(cuspLongitude),
  };
}

function placidusCusp(
  ramc: number,
  obliquity: number,
  latitude: number,
  baseRightAscensionOffset: number,
  ascensionalDifferenceFactor: number,
): number {
  let rightAscension = norm(ramc + baseRightAscensionOffset);
  const lat = latitude * Math.PI / 180;

  for (let i = 0; i < 20; i++) {
    const longitude = eclipticLongitudeFromRightAscension(rightAscension, obliquity);
    const declination = declinationFromEclipticLongitude(longitude, obliquity) * Math.PI / 180;
    const raw = Math.tan(lat) * Math.tan(declination);
    const clipped = Math.max(-1, Math.min(1, raw));
    const ascensionalDifference = Math.asin(clipped) * 180 / Math.PI;
    rightAscension = norm(ramc + baseRightAscensionOffset + ascensionalDifferenceFactor * ascensionalDifference);
  }

  return eclipticLongitudeFromRightAscension(rightAscension, obliquity);
}

function placidusHouses(date: Date, latitude: number, longitude: number, angles: NatalAnglesCore): NatalHouseCore[] {
  const ramc = norm(greenwichMeanSiderealTime(date) + longitude);
  const obliquity = meanObliquity(date);
  const cusp2 = placidusCusp(ramc, obliquity, latitude, 120, 1 / 3);
  const cusp3 = placidusCusp(ramc, obliquity, latitude, 150, 2 / 3);
  const cusp11 = placidusCusp(ramc, obliquity, latitude, 30, 4 / 3);
  const cusp12 = placidusCusp(ramc, obliquity, latitude, 60, 5 / 3);

  return [
    house(1, angles.asc.longitude),
    house(2, cusp2),
    house(3, cusp3),
    house(4, angles.ic.longitude),
    house(5, cusp11 + 180),
    house(6, cusp12 + 180),
    house(7, angles.desc.longitude),
    house(8, cusp2 + 180),
    house(9, cusp3 + 180),
    house(10, angles.mc.longitude),
    house(11, cusp11),
    house(12, cusp12),
  ];
}

function findHouse(lon: number, houses: NatalHouseCore[]): number {
  const normalized = norm(lon);
  for (let index = 0; index < houses.length; index++) {
    const start = houses[index].cuspLongitude;
    const end = houses[(index + 1) % houses.length].cuspLongitude;
    if (start <= end) {
      if (normalized >= start && normalized < end) return houses[index].number;
    } else if (normalized >= start || normalized < end) {
      return houses[index].number;
    }
  }
  return 1;
}

function meanLunarNodeLongitude(date: Date): number {
  const t = (julianDay(date) - 2451545.0) / 36525;
  return norm(125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t * t * t) / 450000);
}

function approximateChironLongitude(date: Date): number {
  const daysSinceJ2000 = julianDay(date) - 2451545.0;
  return norm(248.6 + daysSinceJ2000 * (360 / (50.7 * 365.2422)));
}

function syntheticPlanet(
  id: PlanetId,
  longitude: number,
  speed: number,
  isRetrograde: boolean,
  houses: NatalHouseCore[],
): PlanetPositionCore {
  return {
    id,
    longitude: norm(longitude),
    latitude: 0,
    speed,
    sign: lonToSign(longitude),
    degreeInSign: degreeInSign(longitude),
    isRetrograde,
    house: findHouse(longitude, houses),
  };
}

function calculatePlanets(date: Date, houses: NatalHouseCore[]): PlanetPositionCore[] {
  const planets = PLANET_BODIES.map(({ id, body }) => {
    const position = longitudeForBody(body, date);
    const speed = speedForBody(body, date);
    return {
      id,
      longitude: position.longitude,
      latitude: position.latitude,
      speed,
      sign: lonToSign(position.longitude),
      degreeInSign: degreeInSign(position.longitude),
      isRetrograde: speed < 0,
      house: findHouse(position.longitude, houses),
    };
  });
  const northNodeLongitude = meanLunarNodeLongitude(date);
  const southNodeLongitude = norm(northNodeLongitude + 180);
  const chironLongitude = approximateChironLongitude(date);
  planets.push(syntheticPlanet('Chiron', chironLongitude, 0.08, false, houses));
  planets.push(syntheticPlanet('NorthNode', northNodeLongitude, -0.05295, true, houses));
  planets.push(syntheticPlanet('SouthNode', southNodeLongitude, -0.05295, false, houses));
  return planets;
}

function calculateAspects(planets: PlanetPositionCore[]): NatalAspectCore[] {
  const aspects: NatalAspectCore[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];
      const angle = angularDistance(p1.longitude, p2.longitude);
      const aspect = ASPECTS
        .map(item => ({
          ...item,
          actualOrb: Math.abs(angle - item.angle),
        }))
        .filter(item => item.actualOrb <= item.orb)
        .sort((a, b) => a.actualOrb - b.actualOrb)[0];

      if (!aspect) continue;
      aspects.push({
        planet1: p1.id,
        planet2: p2.id,
        type: aspect.type,
        angle: aspect.angle,
        orb: Number(aspect.actualOrb.toFixed(1)),
      });
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb || a.planet1.localeCompare(b.planet1) || a.planet2.localeCompare(b.planet2));
}

export function calculateNatalCore(input: BirthInput): NatalChartCore {
  const date = toUtcDate(input);
  const latitude = input.latitude ?? DEFAULT_LATITUDE;
  const longitude = input.longitude ?? DEFAULT_LONGITUDE;
  const angles = calculateAngles(date, latitude, longitude);
  const houses = placidusHouses(date, latitude, longitude, angles);
  const planets = calculatePlanets(date, houses);

  return {
    input,
    planets,
    houses,
    angles,
    aspects: calculateAspects(planets),
  };
}
