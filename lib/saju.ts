import type { BirthInput, SajuResult, ZiweiChart, NatalChart, Element, LiuNianInfo } from '@orrery/core';

export interface SamsinInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: 'M' | 'F';
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
  ziwei: ZiweiChart;
  natal: NatalChart;
  input: SamsinInput;
  wuxing: WuxingCount;
  daxianList: DaxianItem[];
  currentLiunian?: LiuNianInfo;
}

export async function calculateSamsin(input: SamsinInput): Promise<SamsinData> {
  const { calculateSaju, createChart, calculateNatal, getDaxianList, calculateLiunian } = await import('@orrery/core');
  const { STEM_INFO, BRANCH_ELEMENT } = await import('@orrery/core/constants');
  const { getCityCoords } = await import('./cities');

  const { lat, lng } = getCityCoords(input.city ?? 'seoul');
  const birthInput: BirthInput = {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    gender: input.gender,
    latitude: lat,
    longitude: lng,
  };

  const saju = calculateSaju(birthInput);
  const ziwei = createChart(
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    input.gender === 'M',
  );
  const natal = await calculateNatal(birthInput);

  // 오행 분포 직접 계산 (pillars 순서: [시주, 일주, 월주, 년주])
  const wuxing: WuxingCount = { tree: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const pd of saju.pillars) {
    const stemEl = STEM_INFO[pd.pillar.stem]?.element as Element | undefined;
    const branchEl = BRANCH_ELEMENT[pd.pillar.branch] as Element | undefined;
    if (stemEl && stemEl in wuxing) wuxing[stemEl as keyof WuxingCount]++;
    if (branchEl && branchEl in wuxing) wuxing[branchEl as keyof WuxingCount]++;
  }

  // 자미두수 대한(大限) 리스트 + 유년(流年)
  const daxianList: DaxianItem[] = getDaxianList(ziwei);
  let currentLiunian: LiuNianInfo | undefined;
  try {
    currentLiunian = calculateLiunian(ziwei, new Date().getFullYear());
  } catch { /* 유년 계산 실패 시 무시 */ }

  return { saju, ziwei, natal, input, wuxing, daxianList, currentLiunian };
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
  const yearP = pillars[3]?.pillar.ganzi ?? '?';
  const monthP = pillars[2]?.pillar.ganzi ?? '?';
  const dayP = pillars[1]?.pillar.ganzi ?? '?';
  const hourP = pillars[0]?.pillar.ganzi ?? '시주 미상';

  const dayStem = pillars[1]?.pillar.stem ?? '';
  const dayBranch = pillars[1]?.pillar.branch ?? '';

  const w = data.wuxing;
  const elements = `木 ${w.tree} / 火 ${w.fire} / 土 ${w.earth} / 金 ${w.metal} / 水 ${w.water}`;

  let result = `사주 원국:
- 연주(年柱): ${yearP}
- 월주(月柱): ${monthP}
- 일주(日柱): ${dayP} [일간: ${dayStem}, 일지: ${dayBranch}]
- 시주(時柱): ${hourP}
오행 분포: ${elements}`;

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

  // 전체 행성 (13개)
  for (const p of data.natal.planets) {
    const name = PLANET_KO_MAP[p.id] ?? p.id;
    const retro = p.isRetrograde ? ' (R)' : '';
    lines.push(`${name}: ${p.sign} ${Math.floor(p.degreeInSign)}도 (${p.house}하우스)${retro}`);
  }

  // 앵글 (ASC, MC)
  const angles = data.natal.angles;
  if (angles) {
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
  const palaces = data.ziwei.palaces ?? {};
  const mingPalace = palaces['命宮'];
  if (!mingPalace && Object.keys(palaces).length === 0) return '자미두수 정보 없음';

  const lines: string[] = [];

  // 명궁 + 오행국
  const mingStars = mingPalace ? mingPalace.stars.map(s => s.name).join(', ') : '없음';
  lines.push(`명궁(命宮) 별: ${mingStars} / 오행국: ${data.ziwei.wuXingJu.name}(${data.ziwei.wuXingJu.number}국)`);

  // 화록/화기 위치 — harvestScore/seedingScore 산출에 필수
  const huaLu: string[] = [];
  const huaJi: string[] = [];
  for (const [palaceName, palace] of Object.entries(palaces)) {
    for (const star of palace.stars) {
      if (star.siHua === '化祿') huaLu.push(`${palaceName} — ${star.name}化祿`);
      if (star.siHua === '化忌') huaJi.push(`${palaceName} — ${star.name}化忌`);
    }
  }
  if (huaLu.length) lines.push(`화록(化祿) 위치: ${huaLu.join(', ')}`);
  if (huaJi.length) lines.push(`화기(化忌) 위치: ${huaJi.join(', ')}`);

  // 주요 궁 (재백·관록·천이·부처·복덕)
  const KEY_PALACES = ['財帛宮', '官祿宮', '遷移宮', '夫妻宮', '福德宮'];
  const palaceLines: string[] = [];
  for (const pName of KEY_PALACES) {
    const p = palaces[pName];
    if (!p || p.stars.length === 0) continue;
    const starStr = p.stars.map(s => s.siHua ? `${s.name}[${s.siHua}]` : s.name).join(', ');
    palaceLines.push(`  - ${pName}: ${starStr}`);
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
