import type { BirthTimePrecision } from './interpretation/evidence';
import { normalizeBirthInput, type CalculationSex, type CalendarInputType, type NormalizedBirthInput } from './interpretation/input';
import type { BirthInput, Element, SajuResult } from './manselyeok-core';
import { BRANCH_ELEMENT, calculateSajuCore, STEM_INFO } from './manselyeok-core';
import { calculateNatalCore, type NatalChartCore } from './natal-core';
import {
  calculateLiunianCore,
  calculateZiweiCore,
  getDaxianListCore,
  type LiuNianInfoCore,
  type ZiweiChartCore,
} from './ziwei-core';

export interface SamsinInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: 'M' | 'F';
  calculationSex?: CalculationSex;
  displayGender?: string;
  unknownTime?: boolean;
  birthTimePrecision?: BirthTimePrecision;
  calendarInputType?: CalendarInputType;
  lunarLeapMonth?: boolean;
  analysisYear?: number;
  timezone?: string;
  name: string;
  city?: string;
}

export interface WuxingCount {
  tree: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

export interface DaxianItem {
  ageStart: number;
  ageEnd: number;
  palaceName: string;
  ganZhi: string;
  mainStars: string[];
}

export interface SamsinData {
  saju: SajuResult;
  ziwei: ZiweiChartCore;
  natal: NatalChartCore;
  input: SamsinInput;
  wuxing: WuxingCount;
  daxianList: DaxianItem[];
  currentLiunian?: LiuNianInfoCore;
  birthContext: NormalizedBirthInput;
}

export async function calculateSamsin(input: SamsinInput): Promise<SamsinData> {
  const { getCityCoords } = await import('./cities');
  const birthContext = normalizeBirthInput(input);

  const { lat, lng } = getCityCoords(birthContext.city);
  const birthInput: BirthInput = {
    year: birthContext.year,
    month: birthContext.month,
    day: birthContext.day,
    hour: birthContext.hour,
    minute: birthContext.minute,
    gender: birthContext.legacyGender,
    unknownTime: birthContext.unknownTime,
    latitude: lat,
    longitude: lng,
  };

  const saju = calculateSajuCore(birthInput);
  const ziwei = calculateZiweiCore(birthInput);
  const natal = calculateNatalCore(birthInput);

  // 오행 분포 직접 계산 (pillars 순서: [시주, 일주, 월주, 년주])
  const wuxing: WuxingCount = { tree: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const pd of saju.pillars) {
    const stemEl = STEM_INFO[pd.pillar.stem]?.element as Element | undefined;
    const branchEl = BRANCH_ELEMENT[pd.pillar.branch] as Element | undefined;
    if (stemEl && stemEl in wuxing) wuxing[stemEl as keyof WuxingCount]++;
    if (branchEl && branchEl in wuxing) wuxing[branchEl as keyof WuxingCount]++;
  }

  // 자미두수 대한(大限) 리스트 + 유년(流年)
  const daxianList: DaxianItem[] = getDaxianListCore(ziwei);
  let currentLiunian: LiuNianInfoCore | undefined;
  try {
    currentLiunian = calculateLiunianCore(ziwei, birthContext.analysisYear);
  } catch { /* 유년 계산 실패 시 무시 */ }

  return {
    saju,
    ziwei,
    natal,
    input: {
      ...input,
      year: birthContext.year,
      month: birthContext.month,
      day: birthContext.day,
      hour: birthContext.hour,
      minute: birthContext.minute,
      gender: birthContext.legacyGender,
      city: birthContext.city,
      calculationSex: birthContext.calculationSex,
      displayGender: birthContext.displayGender,
      unknownTime: birthContext.unknownTime,
      birthTimePrecision: birthContext.birthTimePrecision,
      calendarInputType: birthContext.calendarInputType,
      lunarLeapMonth: birthContext.lunarLeapMonth,
      analysisYear: birthContext.analysisYear,
      timezone: birthContext.timezone,
    },
    wuxing,
    daxianList,
    currentLiunian,
    birthContext,
  };
}

// pillars 순서: [0]=시주, [1]=일주, [2]=월주, [3]=년주
export function getDayPillar(data: SamsinData): string {
  return data.saju.pillars[1]?.pillar.ganzi ?? '';
}

export function getYearPillar(data: SamsinData): string {
  return data.saju.pillars[3]?.pillar.ganzi ?? '';
}

export function formatSajuSummary(data: SamsinData): string {
  const pillars = data.saju.pillars;
  // [시주, 일주, 월주, 년주] → 표시는 년월일시 순

  // 각 기둥의 간지 + 십신/운성/신살 상세
  const formatPillar = (pd: typeof pillars[number] | undefined, fallback: string) => {
    if (!pd) return fallback;
    const ganzi = pd.pillar.ganzi ?? fallback;
    const details: string[] = [];
    if (pd.stemSipsin) details.push(`천간십신: ${pd.stemSipsin}`);
    if (pd.branchSipsin) details.push(`지지십신: ${pd.branchSipsin}`);
    if (pd.unseong) details.push(`운성: ${pd.unseong}`);
    if (pd.sinsal) details.push(`신살: ${pd.sinsal}`);
    return details.length > 0 ? `${ganzi} [${details.join(', ')}]` : ganzi;
  };

  const dayStem = pillars[1]?.pillar.stem ?? '';
  const dayBranch = pillars[1]?.pillar.branch ?? '';

  const w = data.wuxing;
  const elements = `木 ${w.tree} / 火 ${w.fire} / 土 ${w.earth} / 金 ${w.metal} / 水 ${w.water}`;

  let result = `사주 원국:
- 연주(年柱): ${formatPillar(pillars[3], '?')}
- 월주(月柱): ${formatPillar(pillars[2], '?')}
- 일주(日柱): ${formatPillar(pillars[1], '?')} [일간: ${dayStem}, 일지: ${dayBranch}]
- 시주(時柱): ${formatPillar(pillars[0], '시주 미상')}
오행 분포: ${elements}`;

  // 합충형파(合沖刑破) — Map 방어 체크
  const relations = data.saju.relations;
  if (relations?.pairs && relations.pairs instanceof Map && relations.pairs.size > 0) {
    const relLines: string[] = [];
    relations.pairs.forEach((rel, key) => {
      const parts: string[] = [];
      for (const sr of rel.stem) parts.push(`천간 ${sr.type}${sr.detail ? `(${sr.detail})` : ''}`);
      for (const br of rel.branch) parts.push(`지지 ${br.type}${br.detail ? `(${br.detail})` : ''}`);
      if (parts.length) relLines.push(`  ${key}: ${parts.join(', ')}`);
    });
    if (relLines.length) result += '\n합충형파(合沖刑破):\n' + relLines.join('\n');
  }
  // 삼합/방합
  if (relations?.triple?.length) {
    const triLines = relations.triple.map(r => `  ${r.type}${r.detail ? ` (${r.detail})` : ''}`);
    result += '\n삼합/방합:\n' + triLines.join('\n');
  }

  // 특수 신살 (양인/백호/괴강)
  const sp = data.saju.specialSals;
  if (sp) {
    const spParts: string[] = [];
    if (sp.yangin?.length) spParts.push(`양인(羊刃): ${sp.yangin.join(', ')}주`);
    if (sp.baekho) spParts.push('백호(白虎): 있음');
    if (sp.goegang) spParts.push('괴강(魁罡): 있음');
    if (spParts.length) result += '\n특수 신살: ' + spParts.join(' / ');
  }

  // 대운 배열 — seedingScore/harvestScore 산출에 필수
  const daewoon = data.saju.daewoon ?? [];
  if (daewoon.length > 0) {
    const dwLines = daewoon.map(dw => {
      const endAge = dw.age + 9;
      const unseong = dw.unseong ? ` [십이운성: ${dw.unseong}]` : '';
      const sinsal = dw.sinsal ? ` [신살: ${dw.sinsal}]` : '';
      const sipsin = (dw.stemSipsin || dw.branchSipsin)
        ? ` [십신: ${dw.stemSipsin ?? ''}/${dw.branchSipsin ?? ''}]`
        : '';
      return `- ${dw.age}세~${endAge}세: ${dw.ganzi}${unseong}${sinsal}${sipsin}`;
    });
    result += '\n대운(大運) 흐름:\n' + dwLines.join('\n');
  }

  return result.trim();
}

const PLANET_KO_MAP: Record<string, string> = {
  Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성',
  Jupiter: '목성', Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성',
  Pluto: '명왕성', Chiron: '카이론', NorthNode: '북교점', SouthNode: '남교점',
};

export function formatNatalSummary(data: SamsinData): string {
  const lines: string[] = [];
  const hideHouseClaims = data.birthContext?.unknownTime;

  if (hideHouseClaims) {
    lines.push('출생 시각 미상: 어센던트, 하우스, 각궁 기반 해석은 제외하거나 낮은 확신으로만 참고');
  }

  // 전체 행성 (13개)
  for (const p of data.natal.planets) {
    const name = PLANET_KO_MAP[p.id] ?? p.id;
    const retro = p.isRetrograde ? ' (R)' : '';
    const house = hideHouseClaims ? '' : ` (${p.house}하우스)`;
    lines.push(`${name}: ${p.sign} ${Math.floor(p.degreeInSign)}도${house}${retro}`);
  }

  // 앵글 (ASC, MC)
  const angles = data.natal.angles;
  if (angles && !hideHouseClaims) {
    lines.push(`어센던트(ASC): ${angles.asc.sign} ${Math.floor(angles.asc.degreeInSign)}도`);
    lines.push(`천정(MC): ${angles.mc.sign} ${Math.floor(angles.mc.degreeInSign)}도`);
  }

  // 주요 aspects (Sun/Moon/Jupiter/Saturn/Venus/Mars 관련, 최대 10개)
  const MAJOR_PLANETS = new Set(['Sun', 'Moon', 'Jupiter', 'Saturn', 'Venus', 'Mars']);
  const ASPECT_KO: Record<string, string> = {
    conjunction: '합', sextile: '섹스타일', square: '스퀘어',
    trine: '트라인', opposition: '대충',
  };
  const majorAspects = (data.natal.aspects ?? [])
    .filter(a => MAJOR_PLANETS.has(a.planet1) || MAJOR_PLANETS.has(a.planet2))
    .slice(0, 10);
  if (majorAspects.length > 0) {
    lines.push('주요 애스펙트:');
    for (const a of majorAspects) {
      const p1 = PLANET_KO_MAP[a.planet1] ?? a.planet1;
      const p2 = PLANET_KO_MAP[a.planet2] ?? a.planet2;
      const type = ASPECT_KO[a.type] ?? a.type;
      lines.push(`  ${p1}-${p2} ${type} (오브 ${a.orb.toFixed(1)}도)`);
    }
  }

  return lines.join('\n') || '출생 시각 미입력';
}

export function formatZiweiSummary(data: SamsinData): string {
  if (data.birthContext?.unknownTime) {
    return '출생 시각 미상: 자미두수 명궁, 궁위, 대한/유년 기반 내용은 조심스럽게만 제공';
  }

  const palaces = data.ziwei.palaces ?? {};
  const mingPalace = palaces['命宮'];
  if (!mingPalace && Object.keys(palaces).length === 0) return '자미두수 정보 없음';

  const lines: string[] = [];

  // 명궁 + 오행국 (밝기 포함)
  const mingStars = mingPalace
    ? mingPalace.stars.map(s => s.brightness ? `${s.name}(${s.brightness})` : s.name).join(', ')
    : '없음';
  lines.push(`명궁(命宮) 별: ${mingStars} / 오행국: ${data.ziwei.wuXingJu.name}(${data.ziwei.wuXingJu.number}국)`);

  // 사화(四化) 4종 전부 추적 — harvestScore/seedingScore 산출에 필수
  const huaLu: string[] = [];
  const huaQuan: string[] = [];
  const huaKe: string[] = [];
  const huaJi: string[] = [];
  for (const [palaceName, palace] of Object.entries(palaces)) {
    for (const star of palace.stars) {
      if (star.siHua === '化祿') huaLu.push(`${palaceName} — ${star.name}化祿`);
      if (star.siHua === '化權') huaQuan.push(`${palaceName} — ${star.name}化權`);
      if (star.siHua === '化科') huaKe.push(`${palaceName} — ${star.name}化科`);
      if (star.siHua === '化忌') huaJi.push(`${palaceName} — ${star.name}化忌`);
    }
  }
  if (huaLu.length) lines.push(`화록(化祿) 위치: ${huaLu.join(', ')}`);
  if (huaQuan.length) lines.push(`화권(化權) 위치: ${huaQuan.join(', ')}`);
  if (huaKe.length) lines.push(`화과(化科) 위치: ${huaKe.join(', ')}`);
  if (huaJi.length) lines.push(`화기(化忌) 위치: ${huaJi.join(', ')}`);

  // 주요 궁 (재백·관록·천이·부처·복덕) — 밝기 포함
  const KEY_PALACES = ['財帛', '官祿', '遷移', '夫妻', '福德'];
  const palaceLines: string[] = [];
  for (const pName of KEY_PALACES) {
    const p = palaces[pName];
    if (!p || p.stars.length === 0) continue;
    const starStr = p.stars.map(s => {
      let display = s.name;
      if (s.brightness) display += `(${s.brightness})`;
      if (s.siHua) display += `[${s.siHua}]`;
      return display;
    }).join(', ');
    palaceLines.push(`  - ${pName}宮: ${starStr}`);
  }
  if (palaceLines.length) lines.push('주요 궁:\n' + palaceLines.join('\n'));

  // 대한(大限) 흐름
  if (data.daxianList.length > 0) {
    const dxLines = data.daxianList.map(dx => {
      const stars = dx.mainStars.length > 0 ? dx.mainStars.join(', ') : '없음';
      return `  - ${dx.ageStart}~${dx.ageEnd}세: ${dx.palaceName} (${dx.ganZhi}) — ${stars}`;
    });
    lines.push('대한(大限) 흐름:\n' + dxLines.join('\n'));
  }

  // 유년(流年) 정보
  if (data.currentLiunian) {
    const ln = data.currentLiunian;
    const siHuaStr = Object.entries(ln.siHua)
      .map(([star, hua]) => `${star}${hua}`)
      .join(', ');
    lines.push(`유년(流年) ${ln.year}년: 명궁→${ln.natalPalaceAtMing}, 대한궁→${ln.daxianPalaceName}`);
    if (siHuaStr) lines.push(`  유년 사화: ${siHuaStr}`);
  }

  return lines.join('\n');
}
