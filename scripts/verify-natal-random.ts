import { calculateNatal } from '@orrery/core';
import { calculateNatalCore, type NatalChartCore, type PlanetId } from '../lib/natal-core';
import type { BirthInput } from '../lib/manselyeok-core';

type Sample = BirthInput & {
  index: number;
  bucket: string;
};

type FieldStats = {
  matches: number;
  mismatches: number;
};

const SAMPLE_COUNT = Number(process.env.NATAL_RANDOM_COUNT ?? 1000);
const SEED = Number(process.env.NATAL_RANDOM_SEED ?? 20260528);
const START_YEAR = 1926;
const END_YEAR = 2026;
const START_MONTH = 5;
const START_DAY = 29;
const END_MONTH = 5;
const END_DAY = 29;
const LONGITUDE_TOLERANCE_DEG = Number(process.env.NATAL_LONGITUDE_TOLERANCE_DEG ?? 0.25);
const ANGLE_TOLERANCE_DEG = Number(process.env.NATAL_ANGLE_TOLERANCE_DEG ?? 0.25);
const MIN_CRITICAL_MATCH_RATE = Number(process.env.NATAL_MIN_CRITICAL_MATCH_RATE ?? 1);
const MIN_MODEL_COMPLETION_RATE = Number(process.env.NATAL_MIN_MODEL_COMPLETION_RATE ?? 1);
const INCLUDE_NONCRITICAL_DIFFS = process.env.NATAL_INCLUDE_NONCRITICAL_DIFFS === '1';
const ASPECT_BOUNDARY_TOLERANCE_DEG = Number(process.env.NATAL_ASPECT_BOUNDARY_TOLERANCE_DEG ?? 0.02);
const RETROGRADE_STATION_TOLERANCE_DEG_PER_DAY = Number(process.env.NATAL_RETROGRADE_STATION_TOLERANCE_DEG_PER_DAY ?? 0.01);

const P0_PLANETS: PlanetId[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
const FULL_PLANETS: PlanetId[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron', 'NorthNode', 'SouthNode'];

const FIELD_NAMES = [
  'p0Longitude',
  'p0Sign',
  'p0Retrograde',
  'p0Aspects',
  'angles',
  'houses',
  'fullPlanetCoverage',
] as const;

const CRITICAL_FIELDS = ['p0Longitude', 'p0Sign', 'p0Retrograde', 'p0Aspects', 'angles', 'houses'] as const;
const ASPECT_POLICY: Record<string, { angle: number; orb: number }> = {
  conjunction: { angle: 0, orb: 8 },
  sextile: { angle: 60, orb: 6 },
  square: { angle: 90, orb: 8 },
  trine: { angle: 120, orb: 8 },
  opposition: { angle: 180, orb: 8 },
};

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function buildMonthBuckets(): Array<{ year: number; month: number; minDay: number; maxDay: number }> {
  const buckets: Array<{ year: number; month: number; minDay: number; maxDay: number }> = [];
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year === START_YEAR && month < START_MONTH) continue;
      if (year === END_YEAR && month > END_MONTH) continue;
      buckets.push({
        year,
        month,
        minDay: year === START_YEAR && month === START_MONTH ? START_DAY : 1,
        maxDay: year === END_YEAR && month === END_MONTH ? END_DAY : daysInMonth(year, month),
      });
    }
  }
  return buckets;
}

function distributedBucketIndex(index: number, bucketCount: number): number {
  if (SAMPLE_COUNT <= 1) return 0;
  return Math.min(bucketCount - 1, Math.floor(index * (bucketCount - 1) / (SAMPLE_COUNT - 1)));
}

const MONTH_BUCKETS = buildMonthBuckets();

function sampleForBucket(index: number, random: () => number): Sample {
  const bucket = MONTH_BUCKETS[distributedBucketIndex(index, MONTH_BUCKETS.length)];
  const { year, month, minDay, maxDay } = bucket;
  const day = minDay + Math.floor(random() * (maxDay - minDay + 1));
  return {
    index,
    bucket: `${year}-${String(month).padStart(2, '0')}`,
    year,
    month,
    day,
    hour: Math.floor(random() * 24),
    minute: Math.floor(random() * 60),
    gender: random() < 0.5 ? 'M' : 'F',
  };
}

function statsRecord(): Record<typeof FIELD_NAMES[number], FieldStats> {
  return Object.fromEntries(FIELD_NAMES.map(name => [name, { matches: 0, mismatches: 0 }])) as Record<typeof FIELD_NAMES[number], FieldStats>;
}

function record(stats: FieldStats, matched: boolean): void {
  if (matched) stats.matches += 1;
  else stats.mismatches += 1;
}

function angleDiff(a: number, b: number): number {
  const raw = Math.abs((((a - b) % 360) + 360) % 360);
  return raw > 180 ? 360 - raw : raw;
}

function distanceToSignBoundary(lon: number): number {
  const degree = (((lon % 30) + 30) % 30);
  return Math.min(degree, 30 - degree);
}

function planetMap(chart: NatalChartCore): Map<string, NatalChartCore['planets'][number]> {
  return new Map(chart.planets.map(planet => [planet.id, planet]));
}

function longitudesWithinTolerance(own: NatalChartCore, oracle: NatalChartCore, planetIds: PlanetId[]): boolean {
  const ownPlanets = planetMap(own);
  const oraclePlanets = planetMap(oracle);
  return planetIds.every(id => {
    const ownPlanet = ownPlanets.get(id);
    const oraclePlanet = oraclePlanets.get(id);
    return Boolean(ownPlanet && oraclePlanet && angleDiff(ownPlanet.longitude, oraclePlanet.longitude) <= LONGITUDE_TOLERANCE_DEG);
  });
}

function sameSigns(own: NatalChartCore, oracle: NatalChartCore, planetIds: PlanetId[]): boolean {
  const ownPlanets = planetMap(own);
  const oraclePlanets = planetMap(oracle);
  return planetIds.every(id => {
    const ownPlanet = ownPlanets.get(id);
    const oraclePlanet = oraclePlanets.get(id);
    if (!ownPlanet || !oraclePlanet) return false;
    if (ownPlanet.sign === oraclePlanet.sign) return true;
    return angleDiff(ownPlanet.longitude, oraclePlanet.longitude) <= LONGITUDE_TOLERANCE_DEG &&
      (distanceToSignBoundary(ownPlanet.longitude) <= LONGITUDE_TOLERANCE_DEG ||
        distanceToSignBoundary(oraclePlanet.longitude) <= LONGITUDE_TOLERANCE_DEG);
  });
}

function sameRetrograde(own: NatalChartCore, oracle: NatalChartCore, planetIds: PlanetId[]): boolean {
  const ownPlanets = planetMap(own);
  const oraclePlanets = planetMap(oracle);
  return planetIds.every(id => {
    const ownPlanet = ownPlanets.get(id);
    const oraclePlanet = oraclePlanets.get(id);
    if (!ownPlanet || !oraclePlanet) return false;
    if (ownPlanet.isRetrograde === oraclePlanet.isRetrograde) return true;
    return Math.abs(ownPlanet.speed) <= RETROGRADE_STATION_TOLERANCE_DEG_PER_DAY ||
      Math.abs(oraclePlanet.speed) <= RETROGRADE_STATION_TOLERANCE_DEG_PER_DAY;
  });
}

function aspectSignature(chart: NatalChartCore, planetIds: PlanetId[]): string[] {
  const allowed = new Set(planetIds);
  return chart.aspects
    .filter(aspect => allowed.has(aspect.planet1) && allowed.has(aspect.planet2))
    .map(aspect => `${aspect.planet1}-${aspect.planet2}:${aspect.type}`)
    .sort();
}

function aspectOrb(chart: NatalChartCore, signature: string): number {
  const [pair, type] = signature.split(':') as [string, keyof typeof ASPECT_POLICY];
  const [planet1, planet2] = pair.split('-') as [PlanetId, PlanetId];
  const planets = planetMap(chart);
  const first = planets.get(planet1);
  const second = planets.get(planet2);
  const policy = ASPECT_POLICY[type];
  if (!first || !second || !policy) return Number.POSITIVE_INFINITY;
  return Math.abs(angleDiff(first.longitude, second.longitude) - policy.angle);
}

function isBoundaryAspectDifference(own: NatalChartCore, oracle: NatalChartCore, signature: string): boolean {
  const type = signature.split(':')[1] as keyof typeof ASPECT_POLICY;
  const policy = ASPECT_POLICY[type];
  if (!policy) return false;
  return Math.abs(aspectOrb(own, signature) - policy.orb) <= ASPECT_BOUNDARY_TOLERANCE_DEG ||
    Math.abs(aspectOrb(oracle, signature) - policy.orb) <= ASPECT_BOUNDARY_TOLERANCE_DEG;
}

function aspectSignaturesEquivalent(own: NatalChartCore, oracle: NatalChartCore, planetIds: PlanetId[]): boolean {
  const ownSignatures = new Set(aspectSignature(own, planetIds));
  const oracleSignatures = new Set(aspectSignature(oracle, planetIds));
  const diff = [
    ...Array.from(ownSignatures).filter(signature => !oracleSignatures.has(signature)),
    ...Array.from(oracleSignatures).filter(signature => !ownSignatures.has(signature)),
  ];
  return diff.every(signature => isBoundaryAspectDifference(own, oracle, signature));
}

function anglesWithinTolerance(own: NatalChartCore, oracle: NatalChartCore): boolean {
  return angleDiff(own.angles.asc.longitude, oracle.angles.asc.longitude) <= ANGLE_TOLERANCE_DEG &&
    angleDiff(own.angles.mc.longitude, oracle.angles.mc.longitude) <= ANGLE_TOLERANCE_DEG &&
    angleDiff(own.angles.desc.longitude, oracle.angles.desc.longitude) <= ANGLE_TOLERANCE_DEG &&
    angleDiff(own.angles.ic.longitude, oracle.angles.ic.longitude) <= ANGLE_TOLERANCE_DEG;
}

function housesWithinTolerance(own: NatalChartCore, oracle: NatalChartCore): boolean {
  if (own.houses.length !== oracle.houses.length) return false;
  return own.houses.every((house, index) => (
    house.number === oracle.houses[index].number &&
    angleDiff(house.cuspLongitude, oracle.houses[index].cuspLongitude) <= ANGLE_TOLERANCE_DEG
  ));
}

function fullPlanetCoverage(own: NatalChartCore): boolean {
  const planets = new Set(own.planets.map(planet => planet.id));
  return FULL_PLANETS.every(id => planets.has(id));
}

function compactPlanets(chart: NatalChartCore, planetIds: PlanetId[]): Record<string, string> {
  const planets = planetMap(chart);
  return Object.fromEntries(
    planetIds.map(id => {
      const planet = planets.get(id);
      return [id, planet ? `${planet.longitude.toFixed(3)} ${planet.sign} ${planet.isRetrograde ? 'R' : 'D'}` : 'missing'];
    }),
  );
}

const random = createRandom(SEED);
const fieldStats = statsRecord();
const bucketStats = new Map<string, { samples: number; criticalMatches: number }>();
const firstMismatches: Array<{
  field: string;
  sample: Sample;
  own: unknown;
  oracle: unknown;
}> = [];

let maxP0LongitudeDelta = 0;

for (let index = 0; index < SAMPLE_COUNT; index++) {
  const sample = sampleForBucket(index, random);
  const own = calculateNatalCore(sample);
  const oracle = await calculateNatal(sample) as NatalChartCore;
  const ownPlanets = planetMap(own);
  const oraclePlanets = planetMap(oracle);

  for (const id of P0_PLANETS) {
    const ownPlanet = ownPlanets.get(id);
    const oraclePlanet = oraclePlanets.get(id);
    if (ownPlanet && oraclePlanet) {
      maxP0LongitudeDelta = Math.max(maxP0LongitudeDelta, angleDiff(ownPlanet.longitude, oraclePlanet.longitude));
    }
  }

  const checks: Record<typeof FIELD_NAMES[number], { matched: boolean; own: unknown; oracle: unknown }> = {
    p0Longitude: {
      matched: longitudesWithinTolerance(own, oracle, P0_PLANETS),
      own: compactPlanets(own, P0_PLANETS),
      oracle: compactPlanets(oracle, P0_PLANETS),
    },
    p0Sign: {
      matched: sameSigns(own, oracle, P0_PLANETS),
      own: compactPlanets(own, P0_PLANETS),
      oracle: compactPlanets(oracle, P0_PLANETS),
    },
    p0Retrograde: {
      matched: sameRetrograde(own, oracle, P0_PLANETS),
      own: compactPlanets(own, P0_PLANETS),
      oracle: compactPlanets(oracle, P0_PLANETS),
    },
    p0Aspects: {
      matched: aspectSignaturesEquivalent(own, oracle, P0_PLANETS),
      own: aspectSignature(own, P0_PLANETS),
      oracle: aspectSignature(oracle, P0_PLANETS),
    },
    angles: {
      matched: anglesWithinTolerance(own, oracle),
      own: own.angles,
      oracle: oracle.angles,
    },
    houses: {
      matched: housesWithinTolerance(own, oracle),
      own: own.houses.slice(0, 4),
      oracle: oracle.houses.slice(0, 4),
    },
    fullPlanetCoverage: {
      matched: fullPlanetCoverage(own),
      own: own.planets.map(planet => planet.id),
      oracle: oracle.planets.map(planet => planet.id),
    },
  };

  let criticalMatched = true;
  for (const fieldName of FIELD_NAMES) {
    const check = checks[fieldName];
    record(fieldStats[fieldName], check.matched);
    if (
      !check.matched &&
      firstMismatches.length < 30 &&
      ((CRITICAL_FIELDS as readonly string[]).includes(fieldName) || INCLUDE_NONCRITICAL_DIFFS)
    ) {
      firstMismatches.push({ field: fieldName, sample, own: check.own, oracle: check.oracle });
    }
    if ((CRITICAL_FIELDS as readonly string[]).includes(fieldName) && !check.matched) {
      criticalMatched = false;
    }
  }

  const bucket = bucketStats.get(sample.bucket) ?? { samples: 0, criticalMatches: 0 };
  bucket.samples += 1;
  if (criticalMatched) bucket.criticalMatches += 1;
  bucketStats.set(sample.bucket, bucket);
}

const criticalMatches = CRITICAL_FIELDS.reduce((sum, fieldName) => sum + fieldStats[fieldName].matches, 0);
const criticalTotal = CRITICAL_FIELDS.length * SAMPLE_COUNT;
const totalMatches = FIELD_NAMES.reduce((sum, fieldName) => sum + fieldStats[fieldName].matches, 0);
const totalChecks = FIELD_NAMES.length * SAMPLE_COUNT;
const criticalMatchRate = criticalMatches / criticalTotal;
const modelCompletionRate = totalMatches / totalChecks;

const monthlyBuckets = Array.from(bucketStats.entries()).map(([bucket, stats]) => ({
  bucket,
  samples: stats.samples,
  criticalMatchRate: stats.criticalMatches / stats.samples,
}));

const summary = {
  sampleCount: SAMPLE_COUNT,
  seed: SEED,
  range: {
    startYear: START_YEAR,
    endYear: END_YEAR,
    start: '1926-05-29T00:00:00Z',
    end: '2026-05-29T23:59:59Z',
  },
  oracle: '@orrery/core calculateNatal',
  permissiveCore: 'astronomy-engine@2.1.19 MIT',
  segmentation: 'samples are distributed by year-month bucket before random day/time/gender selection',
  longitudeToleranceDeg: LONGITUDE_TOLERANCE_DEG,
  angleToleranceDeg: ANGLE_TOLERANCE_DEG,
  aspectBoundaryToleranceDeg: ASPECT_BOUNDARY_TOLERANCE_DEG,
  retrogradeStationToleranceDegPerDay: RETROGRADE_STATION_TOLERANCE_DEG_PER_DAY,
  criticalFields: CRITICAL_FIELDS,
  note: 'P0 planets, retrograde flags, major aspects, angles, and Placidus houses are part of the current v1 oracle gate. Chiron and lunar nodes remain coverage-only until a separate longitude parity gate is added.',
  fieldStats: Object.fromEntries(
    FIELD_NAMES.map(fieldName => [
      fieldName,
      {
        ...fieldStats[fieldName],
        matchRate: fieldStats[fieldName].matches / SAMPLE_COUNT,
      },
    ]),
  ),
  maxP0LongitudeDelta,
  criticalMatchRate,
  modelCompletionRate,
  lowestMonthlyBuckets: monthlyBuckets
    .sort((a, b) => a.criticalMatchRate - b.criticalMatchRate || a.bucket.localeCompare(b.bucket))
    .slice(0, 20),
  firstMismatches,
};

console.log(JSON.stringify(summary, null, 2));

if (criticalMatchRate < MIN_CRITICAL_MATCH_RATE) {
  console.error(`Natal critical match rate ${criticalMatchRate.toFixed(4)} is below threshold ${MIN_CRITICAL_MATCH_RATE}.`);
  process.exit(1);
}

if (modelCompletionRate < MIN_MODEL_COMPLETION_RATE) {
  console.error(`Natal model completion rate ${modelCompletionRate.toFixed(4)} is below threshold ${MIN_MODEL_COMPLETION_RATE}.`);
  process.exit(1);
}
