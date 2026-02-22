import type { SamsinData, DaxianItem } from './saju';
import type { DaewoonItem, NatalHouse, NatalAspect } from '@orrery/core';
import type { PhaseType } from './claude';

// ─── 타입 ──────────────────────────────────────────────────────────────
export interface ScoredPeriod {
  label: string;       // "23~32세"
  startAge: number;
  endAge: number;
  sajuScore: number;
  ziweiScore: number;
  natalScore: number;
  score: number;       // 3점수 평균
  phaseType: PhaseType;
}

export interface ComputedScores {
  moneyPeriods: ScoredPeriod[];
  careerPeriods: ScoredPeriod[];
}

// ─── 유틸 ──────────────────────────────────────────────────────────────
function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

// ─── 한자/한글 양방향 룩업 ──────────────────────────────────────────────
// @orrery/core에서 hanja로 올 수 있으므로 양방향 맵 구축
const UNSEONG_BASE: Record<string, number> = {};
const UNSEONG_ENTRIES: [string, string, number][] = [
  ['長生', '장생', 78], ['沐浴', '목욕', 70], ['冠帶', '관대', 78],
  ['乾祿', '건록', 83], ['帝旺', '제왕', 90],
  ['衰', '쇠', 33], ['病', '병', 28], ['死', '사', 23],
  ['墓', '묘', 30], ['絶', '절', 48], ['胎', '태', 53], ['養', '양', 58],
];
for (const [hanja, hangul, score] of UNSEONG_ENTRIES) {
  UNSEONG_BASE[hanja] = score;
  UNSEONG_BASE[hangul] = score;
}

function buildBidirectionalMap(entries: [string, string, number][]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const [hanja, hangul, value] of entries) {
    map[hanja] = value;
    map[hangul] = value;
  }
  return map;
}

const SIPSIN_MONEY = buildBidirectionalMap([
  ['正財', '정재', 8],  ['偏財', '편재', 6],  ['食神', '식신', 4],
  ['傷官', '상관', 3],  ['劫財', '겁재', -5], ['比肩', '비견', -3],
  ['正官', '정관', 2],  ['偏官', '편관', 1],  ['正印', '정인', 0],
  ['偏印', '편인', -1],
]);

const SIPSIN_CAREER = buildBidirectionalMap([
  ['正官', '정관', 8],  ['偏官', '편관', 6],  ['正印', '정인', 5],
  ['偏印', '편인', 4],  ['傷官', '상관', -3], ['食神', '식신', 2],
  ['正財', '정재', 3],  ['偏財', '편재', 2],  ['劫財', '겁재', -2],
  ['比肩', '비견', -1],
]);

const SINSAL_MOD: Record<string, number> = {};
const SINSAL_ENTRIES: [string, string, number][] = [
  ['驛馬', '역마', 3],  ['華蓋', '화개', 2],
  ['桃花', '도화', -2], ['劫殺', '겁살', -3],
  ['攀鞍', '반안', 1],  ['六害', '육해', -2],
  ['亡神', '망신', -2], ['將星', '장성', 3],
  ['天乙', '천을', 2],  ['金輿', '금여', 2],
];
for (const [hanja, hangul, value] of SINSAL_ENTRIES) {
  SINSAL_MOD[hanja] = value;
  SINSAL_MOD[hangul] = value;
}

// ─── (A) 시기 구간 생성 ────────────────────────────────────────────────
interface Period {
  startAge: number;
  endAge: number;
  label: string;
  daewoon: DaewoonItem;
  daxian?: DaxianItem;
  midAge: number;
}

function generatePeriods(
  daewoon: DaewoonItem[],
  daxianList: DaxianItem[],
): Period[] {
  const MIN_AGE = 20;
  const MAX_AGE = 59;
  const periods: Period[] = [];

  // 守(Y1): 대운 정렬 보장 — phaseType prev/curr 비교 정확성 확보
  const sorted = [...daewoon].sort((a, b) => a.age - b.age);

  for (const dw of sorted) {
    const dwStart = dw.age;
    const dwEnd = dw.age + 9;

    // 범위 밖이면 스킵
    if (dwEnd < MIN_AGE || dwStart > MAX_AGE) continue;

    // 20~59로 클리핑
    const clippedStart = Math.max(dwStart, MIN_AGE);
    const clippedEnd = Math.min(dwEnd, MAX_AGE);
    const span = clippedEnd - clippedStart + 1;

    if (span >= 8) {
      // 5년 단위로 분할
      const mid = clippedStart + Math.floor(span / 2);
      const halves = [
        [clippedStart, mid - 1],
        [mid, clippedEnd],
      ] as const;
      for (const [s, e] of halves) {
        const dx = daxianList.find(d => {
          const m = Math.floor((s + e) / 2);
          return m >= d.ageStart && m <= d.ageEnd;
        });
        periods.push({
          startAge: s, endAge: e,
          label: `${s}~${e}세`,
          daewoon: dw,
          daxian: dx,
          midAge: Math.floor((s + e) / 2),
        });
      }
    } else {
      const dx = daxianList.find(d => {
        const m = Math.floor((clippedStart + clippedEnd) / 2);
        return m >= d.ageStart && m <= d.ageEnd;
      });
      periods.push({
        startAge: clippedStart, endAge: clippedEnd,
        label: `${clippedStart}~${clippedEnd}세`,
        daewoon: dw,
        daxian: dx,
        midAge: Math.floor((clippedStart + clippedEnd) / 2),
      });
    }
  }

  return periods;
}

// ─── (B) sajuScore — 대운 십이운성 + 십신 + 신살 ────────────────────────
function computeSajuScore(
  dw: DaewoonItem,
  domain: 'money' | 'career',
): number {
  const base = UNSEONG_BASE[dw.unseong] ?? 55;
  const sipsinMap = domain === 'money' ? SIPSIN_MONEY : SIPSIN_CAREER;
  const stemMod = sipsinMap[dw.stemSipsin] ?? 0;
  const branchMod = sipsinMap[dw.branchSipsin] ?? 0;
  const sinsalMod = SINSAL_MOD[dw.sinsal] ?? 0;
  return clamp(0, 100, base + stemMod + branchMod + sinsalMod);
}

// ─── (C) ziweiScore — 대한 궁위 + 별 광도 + 사화 ────────────────────────
const BRIGHTNESS_SCORE: Record<string, number> = {
  '廟': 12, '旺': 8, '得': 4, '利': 4, '平': 0, '不得': -4, '陷': -8,
};

const PALACE_MONEY_RELEVANCE: Record<string, number> = {
  '財帛宮': 15, '田宅宮': 8, '命宮': 5, '福德宮': 5,
};

const PALACE_CAREER_RELEVANCE: Record<string, number> = {
  '官祿宮': 15, '遷移宮': 8, '命宮': 5, '福德宮': 5,
};

const SIHUA_MOD: Record<string, number> = {
  '化祿': 15, '化權': 10, '化科': 5, '化忌': -15,
};

function computeZiweiScore(
  period: Period,
  palaces: Record<string, { stars: Array<{ name: string; brightness: string; siHua: string }> }>,
  domain: 'money' | 'career',
): number {
  const dx = period.daxian;
  if (!dx) return 50; // fallback

  // 이 대한의 궁위에 해당하는 natal palace 찾기
  const palace = palaces[dx.palaceName];
  if (!palace) return 50;

  // 별 광도 평균
  let brightnessSum = 0;
  let starCount = 0;
  for (const star of palace.stars) {
    const bScore = BRIGHTNESS_SCORE[star.brightness];
    if (bScore !== undefined) {
      brightnessSum += bScore;
      starCount++;
    }
  }
  const brightnessOffset = starCount > 0 ? brightnessSum / starCount : 0;

  // 궁-도메인 관련도
  const relevanceMap = domain === 'money' ? PALACE_MONEY_RELEVANCE : PALACE_CAREER_RELEVANCE;
  const palaceRelevance = relevanceMap[dx.palaceName] ?? 0;

  // 사화 수정자
  let siHuaMod = 0;
  for (const star of palace.stars) {
    if (star.siHua) {
      siHuaMod += SIHUA_MOD[star.siHua] ?? 0;
    }
  }

  return clamp(0, 100, 50 + palaceRelevance + brightnessOffset + siHuaMod);
}

// ─── (D) natalScore — 목성/토성 사이클 + natal aspects ──────────────────
const JUPITER_DEG_PER_YEAR = 30.35;  // ~11.86년 주기
const SATURN_DEG_PER_YEAR = 12.22;   // ~29.46년 주기

const JUPITER_HOUSE_MONEY: Record<number, number> = {
  2: 12, 8: 10, 11: 12, 5: 5, 9: 5, 10: 8,
};
const JUPITER_HOUSE_CAREER: Record<number, number> = {
  10: 12, 6: 8, 2: 5, 11: 5, 1: 3,
};
const SATURN_HOUSE_MONEY: Record<number, number> = {
  2: -8, 8: -8, 12: -5, 1: -3, 10: 3, 11: 3,
};
const SATURN_HOUSE_CAREER: Record<number, number> = {
  10: 5, 6: -5, 1: -5, 8: -8, 12: -8,
};

const ASPECT_BASE: Record<string, number> = {
  trine: 10, sextile: 8, conjunction: 5, square: -8, opposition: -5,
};

function findHouse(lon: number, houses: NatalHouse[]): number {
  if (!houses || houses.length < 12) return 1;
  const normLon = ((lon % 360) + 360) % 360;
  for (let i = 0; i < 12; i++) {
    const start = houses[i].cuspLongitude;
    const end = houses[(i + 1) % 12].cuspLongitude;
    if (start <= end) {
      if (normLon >= start && normLon < end) return houses[i].number;
    } else {
      if (normLon >= start || normLon < end) return houses[i].number;
    }
  }
  return 1;
}

function angleDiff(a: number, b: number): number {
  const raw = ((a - b) % 360 + 360) % 360; // normalize to [0, 360)
  return raw > 180 ? 360 - raw : raw;
}

function computeNatalScore(
  period: Period,
  data: SamsinData,
  domain: 'money' | 'career',
): number {
  const jupiter = data.natal.planets.find(p => p.id === 'Jupiter');
  const saturn = data.natal.planets.find(p => p.id === 'Saturn');
  if (!jupiter || !saturn) return 55;

  const age = period.midAge;
  const houses = data.natal.houses;

  // 추정 트랜짓 경도
  const jupiterTransitLon = (jupiter.longitude + age * JUPITER_DEG_PER_YEAR) % 360;
  const saturnTransitLon = (saturn.longitude + age * SATURN_DEG_PER_YEAR) % 360;

  // 하우스 판정
  const jupHouse = findHouse(jupiterTransitLon, houses);
  const satHouse = findHouse(saturnTransitLon, houses);

  // 하우스 점수
  const jupHouseMap = domain === 'money' ? JUPITER_HOUSE_MONEY : JUPITER_HOUSE_CAREER;
  const satHouseMap = domain === 'money' ? SATURN_HOUSE_MONEY : SATURN_HOUSE_CAREER;
  const jupiterHouseMod = jupHouseMap[jupHouse] ?? 0;
  const saturnHouseMod = satHouseMap[satHouse] ?? 0;

  // natal aspect 기본점 (Jupiter/Saturn 관련)
  let aspectBase = 0;
  const relevantAspects = (data.natal.aspects ?? []).filter(
    (a: NatalAspect) =>
      a.planet1 === 'Jupiter' || a.planet2 === 'Jupiter' ||
      a.planet1 === 'Saturn' || a.planet2 === 'Saturn',
  );
  for (const a of relevantAspects.slice(0, 6)) {
    aspectBase += (ASPECT_BASE[a.type] ?? 0) * 0.5; // 약화된 natal aspect 영향
  }

  // 목성 리턴 보너스: 추정 경도가 출생 경도 ±15도 이내
  let returnBonus = 0;
  if (angleDiff(jupiterTransitLon, jupiter.longitude) <= 15) {
    returnBonus += 10;
  }

  // 토성 리턴: ~29세, ~59세
  if (Math.abs(age - 29) <= 2 || Math.abs(age - 59) <= 2) {
    if (domain === 'career') returnBonus += 3;
    if (domain === 'money') returnBonus -= 5;
  }

  return clamp(0, 100, 55 + jupiterHouseMod + saturnHouseMod + aspectBase + returnBonus);
}

// ─── (E) phaseType 결정 ─────────────────────────────────────────────────
function determinePhaseTypes(periods: ScoredPeriod[]): void {
  if (periods.length === 0) return;

  const maxScore = Math.max(...periods.map(p => p.score));
  // 전체 추세 방향: 첫 구간 판정에 사용
  const trend = periods.length >= 2 ? periods[1].score - periods[0].score : 0;

  for (let i = 0; i < periods.length; i++) {
    const curr = periods[i].score;
    const prev = i > 0 ? periods[i - 1].score : null;

    if (curr >= maxScore - 5) {
      periods[i].phaseType = 'peak';
    } else if (prev === null) {
      // 첫 구간: 전체 추세 + 절대 점수로 판정
      if (curr < 40) {
        periods[i].phaseType = 'seeding';
      } else if (trend > 5) {
        periods[i].phaseType = 'rising';
      } else if (trend < -5) {
        periods[i].phaseType = 'declining';
      } else if (curr >= 60) {
        periods[i].phaseType = 'plateau';
      } else {
        // 守(Y2): 40~59점은 seeding이 아닌 plateau (중간 점수 ≠ 씨앗기)
        periods[i].phaseType = 'plateau';
      }
    } else if (curr < 40 && curr >= prev) {
      periods[i].phaseType = 'seeding';
    } else if (curr > prev + 5) {
      periods[i].phaseType = 'rising';
    } else if (curr < prev - 5) {
      periods[i].phaseType = 'declining';
    } else if (curr > prev) {
      // 소폭 상승은 rising (plateau보다 우선)
      periods[i].phaseType = 'rising';
    } else if (curr < prev) {
      // 소폭 하락은 declining
      periods[i].phaseType = 'declining';
    } else {
      // 동점은 plateau
      periods[i].phaseType = 'plateau';
    }
  }
}

// ─── 메인 함수 ──────────────────────────────────────────────────────────
export function computeAllScores(data: SamsinData): ComputedScores {
  const periods = generatePeriods(data.saju.daewoon ?? [], data.daxianList);

  // 5~8개 보장: 너무 적으면 그대로 사용, 너무 많으면 앞뒤 자르기
  const trimmedPeriods = periods.slice(0, 8);
  if (trimmedPeriods.length === 0) {
    // fallback — 대운이 없거나 범위 밖
    return { moneyPeriods: [], careerPeriods: [] };
  }

  const palaces = data.ziwei.palaces ?? {};

  function scoreDomain(domain: 'money' | 'career'): ScoredPeriod[] {
    const scored: ScoredPeriod[] = trimmedPeriods.map(p => {
      const sajuScore = computeSajuScore(p.daewoon, domain);
      const ziweiScore = computeZiweiScore(p, palaces, domain);
      const natalScore = computeNatalScore(p, data, domain);
      const score = Math.round((sajuScore + ziweiScore + natalScore) / 3);
      return {
        label: p.label,
        startAge: p.startAge,
        endAge: p.endAge,
        sajuScore,
        ziweiScore,
        natalScore,
        score,
        phaseType: 'plateau' as PhaseType, // placeholder
      };
    });

    determinePhaseTypes(scored);
    return scored;
  }

  return {
    moneyPeriods: scoreDomain('money'),
    careerPeriods: scoreDomain('career'),
  };
}
