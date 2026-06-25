import { calculateSaju as calculateOrrerySaju } from '@orrery/core';
import { calculateSajuCore, type BirthInput, type SajuResult } from '../lib/manselyeok-core';

type ComparablePillars = {
  year: string;
  month: string;
  day: string;
  hour: string;
};

type Sample = BirthInput & {
  index: number;
};

const SAMPLE_COUNT = Number(process.env.MANSELYEOK_RANDOM_COUNT ?? 1000);
const SEED = Number(process.env.MANSELYEOK_RANDOM_SEED ?? 20260527);
const MIN_MATCH_RATE = Number(process.env.MANSELYEOK_MIN_MATCH_RATE ?? 1);
const MIN_DAEWOON_MATCH_RATE = Number(process.env.MANSELYEOK_MIN_DAEWOON_MATCH_RATE ?? 1);
const END_DATE_UTC = Date.UTC(2026, 4, 29, 23, 59, 59);
const START_DATE_UTC = Date.UTC(1926, 4, 29, 0, 0, 0);

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function randomSample(index: number, random: () => number): Sample {
  const timestamp = START_DATE_UTC + Math.floor(random() * (END_DATE_UTC - START_DATE_UTC));
  const date = new Date(timestamp);
  return {
    index,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    gender: random() < 0.5 ? 'M' : 'F',
  };
}

function comparable(result: SajuResult): ComparablePillars {
  return {
    year: result.pillars[3]?.pillar.ganzi ?? '',
    month: result.pillars[2]?.pillar.ganzi ?? '',
    day: result.pillars[1]?.pillar.ganzi ?? '',
    hour: result.pillars[0]?.pillar.ganzi ?? '',
  };
}

function samePillars(a: ComparablePillars, b: ComparablePillars): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour;
}

function daewoonHead(result: SajuResult): string[] {
  return result.daewoon.slice(0, 10).map(item => `${item.age}:${item.ganzi}`);
}

function sameStringArray(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

const random = createRandom(SEED);
const mismatches: Array<{
  sample: Sample;
  own: ComparablePillars;
  oracle: ComparablePillars;
}> = [];
const daewoonMismatches: Array<{
  sample: Sample;
  own: string[];
  oracle: string[];
}> = [];

let pillarMatches = 0;
let daewoonMatches = 0;

for (let index = 0; index < SAMPLE_COUNT; index++) {
  const sample = randomSample(index, random);
  const own = calculateSajuCore(sample);
  const oracle = calculateOrrerySaju(sample) as SajuResult;
  const ownPillars = comparable(own);
  const oraclePillars = comparable(oracle);

  if (samePillars(ownPillars, oraclePillars)) {
    pillarMatches++;
  } else if (mismatches.length < 20) {
    mismatches.push({ sample, own: ownPillars, oracle: oraclePillars });
  }

  const ownDaewoon = daewoonHead(own);
  const oracleDaewoon = daewoonHead(oracle);
  if (sameStringArray(ownDaewoon, oracleDaewoon)) {
    daewoonMatches++;
  } else if (daewoonMismatches.length < 10) {
    daewoonMismatches.push({ sample, own: ownDaewoon, oracle: oracleDaewoon });
  }
}

const pillarMatchRate = pillarMatches / SAMPLE_COUNT;
const daewoonMatchRate = daewoonMatches / SAMPLE_COUNT;
const summary = {
  sampleCount: SAMPLE_COUNT,
  seed: SEED,
  range: {
    start: '1926-05-29T00:00:00Z',
    end: '2026-05-29T23:59:59Z',
  },
  oracle: '@orrery/core calculateSaju',
  pillarMatches,
  pillarMismatches: SAMPLE_COUNT - pillarMatches,
  pillarMatchRate,
  daewoonMatches,
  daewoonMismatches: SAMPLE_COUNT - daewoonMatches,
  daewoonMatchRate,
  firstPillarMismatches: mismatches,
  firstDaewoonMismatches: daewoonMismatches,
};

console.log(JSON.stringify(summary, null, 2));

if (pillarMatchRate < MIN_MATCH_RATE) {
  console.error(`Pillar match rate ${pillarMatchRate.toFixed(4)} is below threshold ${MIN_MATCH_RATE}.`);
  process.exit(1);
}

if (daewoonMatchRate < MIN_DAEWOON_MATCH_RATE) {
  console.error(`Daewoon match rate ${daewoonMatchRate.toFixed(4)} is below threshold ${MIN_DAEWOON_MATCH_RATE}.`);
  process.exit(1);
}
