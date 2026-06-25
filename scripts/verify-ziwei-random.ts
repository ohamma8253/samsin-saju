import { createChart, getDaxianList, calculateLiunian } from '@orrery/core';
import {
  calculateLiunianCore,
  calculateZiweiCore,
  getDaxianListCore,
  type ZiweiChartCore,
  type ZiweiInput,
} from '../lib/ziwei-core';

type Sample = ZiweiInput & {
  index: number;
  bucket: string;
  analysisYear: number;
};

type FieldStats = {
  matches: number;
  mismatches: number;
};

const SAMPLE_COUNT = Number(process.env.ZIWEI_RANDOM_COUNT ?? 1000);
const SEED = Number(process.env.ZIWEI_RANDOM_SEED ?? 20260528);
const MIN_CRITICAL_MATCH_RATE = Number(process.env.ZIWEI_MIN_CRITICAL_MATCH_RATE ?? 1);
const MIN_MODEL_COMPLETION_RATE = Number(process.env.ZIWEI_MIN_MODEL_COMPLETION_RATE ?? 1);
const INCLUDE_STAR_DIFFS = process.env.ZIWEI_INCLUDE_STAR_DIFFS === '1';
const START_YEAR = 1926;
const END_YEAR = 2026;
const START_MONTH = 5;
const START_DAY = 29;
const END_MONTH = 5;
const END_DAY = 29;

const FIELD_NAMES = [
  'lunar',
  'yearGanZhi',
  'mingShenGong',
  'wuXingJu',
  'palaceSkeleton',
  'daxianSkeleton',
  'liunianSkeleton',
  'mainStarPlacement',
  'starPlacement',
] as const;

const CRITICAL_FIELDS = FIELD_NAMES;
const MAIN_STAR_NAMES = new Set([
  '紫微', '天機', '太陽', '武曲', '天同', '廉貞',
  '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
]);

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
  const hour = Math.floor(random() * 24);
  const minute = Math.floor(random() * 60);
  const gender = random() < 0.5 ? 'M' : 'F';
  const analysisYear = Math.min(END_YEAR, Math.max(START_YEAR, year + 20 + Math.floor(random() * 40)));

  return {
    index,
    bucket: `${year}-${String(month).padStart(2, '0')}`,
    year,
    month,
    day,
    hour,
    minute,
    gender,
    analysisYear,
  };
}

function statsRecord(): Record<typeof FIELD_NAMES[number], FieldStats> {
  return Object.fromEntries(FIELD_NAMES.map(name => [name, { matches: 0, mismatches: 0 }])) as Record<typeof FIELD_NAMES[number], FieldStats>;
}

function record(stats: FieldStats, matched: boolean): void {
  if (matched) stats.matches += 1;
  else stats.mismatches += 1;
}

function stablePalaceSkeleton(chart: ZiweiChartCore): string[] {
  return Object.values(chart.palaces)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(palace => `${palace.name}:${palace.zhi}:${palace.gan}:${palace.ganZhi}:${palace.isShenGong ? 'S' : '-'}`);
}

function stableStars(chart: ZiweiChartCore): string[] {
  return Object.values(chart.palaces)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(palace => `${palace.name}:${palace.stars.map(star => `${star.name}/${star.brightness}/${star.siHua}`).sort().join(',')}`);
}

function stableMainStars(chart: ZiweiChartCore): string[] {
  return Object.values(chart.palaces)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(palace => `${palace.name}:${palace.stars
      .filter(star => MAIN_STAR_NAMES.has(star.name))
      .map(star => `${star.name}/${star.siHua}`)
      .sort()
      .join(',')}`);
}

function stableDaxian(items: Array<{ ageStart: number; ageEnd: number; palaceName: string; ganZhi: string }>): string[] {
  return items.map(item => `${item.ageStart}-${item.ageEnd}:${item.palaceName}:${item.ganZhi}`);
}

function stableLiunian(item: {
  year: number;
  gan: string;
  zhi: string;
  mingGongZhi: string;
  natalPalaceAtMing: string;
  daxianPalaceName: string;
  daxianAgeStart: number;
  daxianAgeEnd: number;
}): string[] {
  return [
    `${item.year}:${item.gan}${item.zhi}`,
    `ming:${item.mingGongZhi}:${item.natalPalaceAtMing}`,
    `daxian:${item.daxianPalaceName}:${item.daxianAgeStart}-${item.daxianAgeEnd}`,
  ];
}

function sameArray(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
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

for (let index = 0; index < SAMPLE_COUNT; index++) {
  const sample = sampleForBucket(index, random);
  const own = calculateZiweiCore(sample);
  const ownDaxian = getDaxianListCore(own);
  const ownLiunian = calculateLiunianCore(own, sample.analysisYear);
  const oracle = createChart(sample.year, sample.month, sample.day, sample.hour, sample.minute, sample.gender === 'M');
  const oracleDaxian = getDaxianList(oracle);
  const oracleLiunian = calculateLiunian(oracle, sample.analysisYear);

  const checks: Record<typeof FIELD_NAMES[number], { matched: boolean; own: unknown; oracle: unknown }> = {
    lunar: {
      matched: own.lunarYear === oracle.lunarYear &&
        own.lunarMonth === oracle.lunarMonth &&
        own.lunarDay === oracle.lunarDay &&
        own.isLeapMonth === oracle.isLeapMonth,
      own: [own.lunarYear, own.lunarMonth, own.lunarDay, own.isLeapMonth],
      oracle: [oracle.lunarYear, oracle.lunarMonth, oracle.lunarDay, oracle.isLeapMonth],
    },
    yearGanZhi: {
      matched: own.yearGan === oracle.yearGan && own.yearZhi === oracle.yearZhi,
      own: `${own.yearGan}${own.yearZhi}`,
      oracle: `${oracle.yearGan}${oracle.yearZhi}`,
    },
    mingShenGong: {
      matched: own.mingGongZhi === oracle.mingGongZhi && own.shenGongZhi === oracle.shenGongZhi,
      own: [own.mingGongZhi, own.shenGongZhi],
      oracle: [oracle.mingGongZhi, oracle.shenGongZhi],
    },
    wuXingJu: {
      matched: own.wuXingJu.name === oracle.wuXingJu.name && own.wuXingJu.number === oracle.wuXingJu.number,
      own: own.wuXingJu,
      oracle: oracle.wuXingJu,
    },
    palaceSkeleton: {
      matched: sameArray(stablePalaceSkeleton(own), stablePalaceSkeleton(oracle as ZiweiChartCore)),
      own: stablePalaceSkeleton(own),
      oracle: stablePalaceSkeleton(oracle as ZiweiChartCore),
    },
    daxianSkeleton: {
      matched: sameArray(stableDaxian(ownDaxian), stableDaxian(oracleDaxian)),
      own: stableDaxian(ownDaxian),
      oracle: stableDaxian(oracleDaxian),
    },
    liunianSkeleton: {
      matched: sameArray(stableLiunian(ownLiunian), stableLiunian(oracleLiunian)),
      own: stableLiunian(ownLiunian),
      oracle: stableLiunian(oracleLiunian),
    },
    mainStarPlacement: {
      matched: sameArray(stableMainStars(own), stableMainStars(oracle as ZiweiChartCore)),
      own: stableMainStars(own),
      oracle: stableMainStars(oracle as ZiweiChartCore),
    },
    starPlacement: {
      matched: sameArray(stableStars(own), stableStars(oracle as ZiweiChartCore)),
      own: stableStars(own),
      oracle: stableStars(oracle as ZiweiChartCore),
    },
  };

  let criticalMatched = true;
  for (const fieldName of FIELD_NAMES) {
    const check = checks[fieldName];
    record(fieldStats[fieldName], check.matched);
    if (!check.matched && firstMismatches.length < 30 && (fieldName !== 'starPlacement' || INCLUDE_STAR_DIFFS)) {
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
  oracle: '@orrery/core createChart/getDaxianList/calculateLiunian',
  segmentation: 'samples are distributed by year-month bucket before random day/time/gender selection',
  criticalFields: CRITICAL_FIELDS,
  note: 'starPlacement includes brightness and auxiliary stars and is part of the current v1 oracle gate.',
  fieldStats: Object.fromEntries(
    FIELD_NAMES.map(fieldName => [
      fieldName,
      {
        ...fieldStats[fieldName],
        matchRate: fieldStats[fieldName].matches / SAMPLE_COUNT,
      },
    ]),
  ),
  criticalMatchRate,
  modelCompletionRate,
  lowestMonthlyBuckets: monthlyBuckets
    .sort((a, b) => a.criticalMatchRate - b.criticalMatchRate || a.bucket.localeCompare(b.bucket))
    .slice(0, 20),
  firstMismatches,
};

console.log(JSON.stringify(summary, null, 2));

if (criticalMatchRate < MIN_CRITICAL_MATCH_RATE) {
  console.error(`Ziwei critical match rate ${criticalMatchRate.toFixed(4)} is below threshold ${MIN_CRITICAL_MATCH_RATE}.`);
  process.exit(1);
}

if (modelCompletionRate < MIN_MODEL_COMPLETION_RATE) {
  console.error(`Ziwei model completion rate ${modelCompletionRate.toFixed(4)} is below threshold ${MIN_MODEL_COMPLETION_RATE}.`);
  process.exit(1);
}
