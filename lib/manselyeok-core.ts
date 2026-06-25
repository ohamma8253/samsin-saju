import { Solar } from 'lunar-javascript';

export type Element = 'tree' | 'fire' | 'earth' | 'metal' | 'water';
export type YinYang = '+' | '-';
export type Gender = 'M' | 'F';

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: Gender;
  unknownTime?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface Pillar {
  ganzi: string;
  stem: string;
  branch: string;
}

export interface PillarDetail {
  pillar: Pillar;
  stemSipsin: string;
  branchSipsin: string;
  unseong: string;
  sinsal: string;
  jigang: string;
}

export interface DaewoonItem {
  index: number;
  ganzi: string;
  startDate: Date;
  age: number;
  stemSipsin: string;
  branchSipsin: string;
  unseong: string;
  sinsal: string;
}

export interface RelationResult {
  type: string;
  detail: string | null;
}

export interface PairRelation {
  stem: RelationResult[];
  branch: RelationResult[];
}

export interface AllRelations {
  pairs: Map<string, PairRelation>;
  triple: RelationResult[];
  directional: RelationResult[];
}

export interface SpecialSals {
  yangin: number[];
  baekho: boolean;
  goegang: boolean;
}

export interface SajuResult {
  input: BirthInput;
  pillars: PillarDetail[];
  daewoon: DaewoonItem[];
  relations: AllRelations;
  specialSals: SpecialSals;
}

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export const STEM_INFO: Record<string, { yinyang: YinYang; element: Element }> = {
  甲: { yinyang: '+', element: 'tree' },
  乙: { yinyang: '-', element: 'tree' },
  丙: { yinyang: '+', element: 'fire' },
  丁: { yinyang: '-', element: 'fire' },
  戊: { yinyang: '+', element: 'earth' },
  己: { yinyang: '-', element: 'earth' },
  庚: { yinyang: '+', element: 'metal' },
  辛: { yinyang: '-', element: 'metal' },
  壬: { yinyang: '+', element: 'water' },
  癸: { yinyang: '-', element: 'water' },
};

export const BRANCH_ELEMENT: Record<string, Element> = {
  子: 'water',
  丑: 'earth',
  寅: 'tree',
  卯: 'tree',
  辰: 'earth',
  巳: 'fire',
  午: 'fire',
  未: 'earth',
  申: 'metal',
  酉: 'metal',
  戌: 'earth',
  亥: 'water',
};

const HIDDEN_STEMS: Record<string, string> = {
  子: '癸',
  丑: '癸辛己',
  寅: '戊丙甲',
  卯: '乙',
  辰: '乙癸戊',
  巳: '戊庚丙',
  午: '己丁',
  未: '丁乙己',
  申: '戊壬庚',
  酉: '辛',
  戌: '辛丁戊',
  亥: '戊甲壬',
};

const ELEMENT_GENERATES: Record<Element, Element> = {
  tree: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'tree',
};

const ELEMENT_CONTROLS: Record<Element, Element> = {
  tree: 'earth',
  fire: 'metal',
  earth: 'water',
  metal: 'tree',
  water: 'fire',
};

const GANZI_60 = Array.from({ length: 60 }, (_, index) => (
  `${STEMS[index % STEMS.length]}${BRANCHES[index % BRANCHES.length]}`
));

const UNSEONG_STAGES = ['長生', '沐浴', '冠帶', '乾祿', '帝旺', '衰', '病', '死', '墓', '絶', '胎', '養'];
const UNSEONG_START: Record<string, string> = {
  甲: '亥',
  乙: '午',
  丙: '寅',
  丁: '酉',
  戊: '寅',
  己: '酉',
  庚: '巳',
  辛: '子',
  壬: '申',
  癸: '卯',
};

const SPIRIT_NAMES = ['劫殺', '災殺', '天殺', '地殺', '年殺', '月殺', '亡神', '將星', '攀鞍', '驛馬', '六害', '華蓋'];
const SPIRIT_START_BY_YEAR_GROUP: Record<string, string> = {
  亥: '申',
  卯: '申',
  未: '申',
  寅: '亥',
  午: '亥',
  戌: '亥',
  巳: '寅',
  酉: '寅',
  丑: '寅',
  申: '巳',
  子: '巳',
  辰: '巳',
};

const STEM_COMBINES: Record<string, string> = {
  甲己: '合土',
  乙庚: '合金',
  丙辛: '合水',
  丁壬: '合木',
  戊癸: '合火',
};

const STEM_CLASHES: Record<string, string> = {
  甲庚: '沖',
  乙辛: '沖',
  丙壬: '沖',
  丁癸: '沖',
};

const BRANCH_COMBINES: Record<string, string> = {
  子丑: '六合土',
  寅亥: '六合木',
  卯戌: '六合火',
  辰酉: '六合金',
  巳申: '六合水',
  午未: '六合土',
};

const BRANCH_CLASHES: Record<string, string> = {
  子午: '沖',
  丑未: '沖',
  寅申: '沖',
  卯酉: '沖',
  辰戌: '沖',
  巳亥: '沖',
};

const BRANCH_HARMS: Record<string, string> = {
  子未: '害',
  丑午: '害',
  寅巳: '害',
  卯辰: '害',
  申亥: '害',
  酉戌: '害',
};

const BRANCH_BREAKS: Record<string, string> = {
  子酉: '破',
  丑辰: '破',
  寅亥: '破',
  卯午: '破',
  巳申: '破',
  未戌: '破',
};

const BRANCH_PUNISHMENTS: Record<string, string> = {
  寅巳: '刑',
  巳申: '刑',
  丑戌: '刑',
  戌未: '刑',
  子卯: '刑',
};

const SELF_PUNISHMENTS = new Set(['辰', '午', '酉', '亥']);

const TRIPLE_COMPOSES: Array<{ branches: string[]; detail: string }> = [
  { branches: ['申', '子', '辰'], detail: '三合水' },
  { branches: ['亥', '卯', '未'], detail: '三合木' },
  { branches: ['寅', '午', '戌'], detail: '三合火' },
  { branches: ['巳', '酉', '丑'], detail: '三合金' },
];

const DIRECTIONAL_COMPOSES: Array<{ branches: string[]; detail: string }> = [
  { branches: ['寅', '卯', '辰'], detail: '方合木' },
  { branches: ['巳', '午', '未'], detail: '方合火' },
  { branches: ['申', '酉', '戌'], detail: '方合金' },
  { branches: ['亥', '子', '丑'], detail: '方合水' },
];

const YANGIN_BRANCH: Record<string, string> = {
  甲: '卯',
  乙: '寅',
  丙: '午',
  丁: '巳',
  戊: '午',
  己: '巳',
  庚: '酉',
  辛: '申',
  壬: '子',
  癸: '亥',
};

const BAEKHO_PILLARS = new Set(['甲辰', '乙未', '丙戌', '丁丑', '戊辰', '壬戌', '癸丑']);
const GOEGANG_PILLARS = new Set(['庚辰', '庚戌', '壬辰', '戊戌']);

function makePillar(ganzi: string): Pillar {
  return {
    ganzi,
    stem: ganzi[0] ?? '',
    branch: ganzi[1] ?? '',
  };
}

function assertValidBirthInput(input: BirthInput): void {
  const date = new Date(Date.UTC(input.year, input.month - 1, input.day, 12));
  const validDate =
    date.getUTCFullYear() === input.year &&
    date.getUTCMonth() === input.month - 1 &&
    date.getUTCDate() === input.day;

  if (!validDate) throw new RangeError('Invalid birth date');
  if (input.hour < 0 || input.hour > 23) throw new RangeError('Invalid birth hour');
  if (input.minute < 0 || input.minute > 59) throw new RangeError('Invalid birth minute');
}

function addDays(year: number, month: number, day: number, days: number): { year: number; month: number; day: number } {
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

const SOLAR_TERM_BOUNDARY_GRACE_MINUTES = 60;
const SOLAR_YEAR_AVERAGE_MINUTES = 525949;
const DAEWOON_SECONDS_PER_TERM_SECOND = 365.242196 / 3;
const SOLAR_TERM_EPOCH = {
  year: 1996,
  month: 2,
  day: 4,
  hour: 22,
  minute: 8,
};
const SOLAR_TERM_MINUTE_OFFSETS = [
  0, 21355, 42843, 64498, 86335, 108366, 130578, 152958, 175471, 198077, 220728, 243370, 265955,
  288432, 310767, 332928, 354903, 376685, 398290, 419736, 441060, 462295, 483493, 504693, 525949,
];

function addMinutes(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  minutes: number,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute + minutes, 0));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

function dayOfSolarYear(year: number, month: number, day: number): number {
  let total = 0;
  for (let currentMonth = 1; currentMonth < month; currentMonth++) {
    total += 31;
    if ([2, 4, 6, 9, 11].includes(currentMonth)) total -= 1;
    if (currentMonth === 2) {
      total -= 2;
      if (year % 4 === 0) total += 1;
      if (year % 100 === 0) total -= 1;
      if (year % 400 === 0) total += 1;
      if (year % 4000 === 0) total -= 1;
    }
  }
  return total + day;
}

function daysBetweenSolarDates(
  fromYear: number,
  fromMonth: number,
  fromDay: number,
  toYear: number,
  toMonth: number,
  toDay: number,
): number {
  const sign = toYear > fromYear ? -1 : 1;
  const startYear = toYear > fromYear ? fromYear : toYear;
  const endYear = toYear > fromYear ? toYear : fromYear;
  const startDay = toYear > fromYear
    ? dayOfSolarYear(fromYear, fromMonth, fromDay)
    : dayOfSolarYear(toYear, toMonth, toDay);
  const endDay = toYear > fromYear
    ? dayOfSolarYear(toYear, toMonth, toDay)
    : dayOfSolarYear(fromYear, fromMonth, fromDay);

  if (fromYear === toYear) return endDay - startDay;

  let days = dayOfSolarYear(startYear, 12, 31) - startDay;
  for (let year = startYear + 1; year <= endYear - 1; year++) {
    days += dayOfSolarYear(year, 12, 31);
  }
  days += endDay;
  return days * sign;
}

function minutesFromSolarTermEpoch(year: number, month: number, day: number, hour: number, minute: number): number {
  const days = daysBetweenSolarDates(
    SOLAR_TERM_EPOCH.year,
    SOLAR_TERM_EPOCH.month,
    SOLAR_TERM_EPOCH.day,
    year,
    month,
    day,
  );
  return days * 24 * 60 + (SOLAR_TERM_EPOCH.hour - hour) * 60 + (SOLAR_TERM_EPOCH.minute - minute);
}

function solarDateFromEpochMinutes(minutes: number): { year: number; month: number; day: number; hour: number; minute: number } {
  let year = SOLAR_TERM_EPOCH.year - Math.trunc(minutes / SOLAR_YEAR_AVERAGE_MINUTES);
  let month: number;
  let day: number;
  let hour: number;
  let minute: number;

  if (minutes > 0) {
    year += 2;
    do {
      year -= 1;
    } while (minutesFromSolarTermEpoch(year, 1, 1, 0, 0) < minutes);

    month = 13;
    do {
      month -= 1;
    } while (minutesFromSolarTermEpoch(year, month, 1, 0, 0) < minutes);

    day = 32;
    do {
      day -= 1;
    } while (minutesFromSolarTermEpoch(year, month, day, 0, 0) < minutes);

    hour = 24;
    do {
      hour -= 1;
    } while (minutesFromSolarTermEpoch(year, month, day, hour, 0) < minutes);

    minute = minutesFromSolarTermEpoch(year, month, day, hour, 0) - minutes;
  } else {
    year -= 2;
    do {
      year += 1;
    } while (minutesFromSolarTermEpoch(year, 1, 1, 0, 0) >= minutes);
    year -= 1;

    month = 0;
    do {
      month += 1;
    } while (minutesFromSolarTermEpoch(year, month, 1, 0, 0) >= minutes);
    month -= 1;

    day = 0;
    do {
      day += 1;
    } while (minutesFromSolarTermEpoch(year, month, day, 0, 0) >= minutes);
    day -= 1;

    hour = -1;
    do {
      hour += 1;
    } while (minutesFromSolarTermEpoch(year, month, day, hour, 0) >= minutes);
    hour -= 1;

    minute = minutesFromSolarTermEpoch(year, month, day, hour, 0) - minutes;
  }

  return { year, month, day, hour, minute };
}

function normalizeSolarTermMinutes(minutes: number): number {
  let normalized = minutes % SOLAR_YEAR_AVERAGE_MINUTES;
  if (normalized < 0) normalized += SOLAR_YEAR_AVERAGE_MINUTES;
  if (normalized >= SOLAR_YEAR_AVERAGE_MINUTES) normalized -= SOLAR_YEAR_AVERAGE_MINUTES;
  return normalized;
}

function getDaewoonTermDates(input: BirthInput, monthGanzi: string): { incoming: Date; outgoing: Date } {
  const currentMinutes = minutesFromSolarTermEpoch(input.year, input.month, input.day, input.hour, input.minute);
  const monthRemainder = normalizeSolarTermMinutes(currentMinutes * -1);
  let monthTermIndex = (ganziIndex(monthGanzi) % 12) - 2;
  if (monthTermIndex === -2) monthTermIndex = 10;
  if (monthTermIndex === -1) monthTermIndex = 11;

  const toDate = (termIndex: number): Date => {
    const termMinutes = currentMinutes + (monthRemainder - SOLAR_TERM_MINUTE_OFFSETS[termIndex]);
    const termDate = solarDateFromEpochMinutes(termMinutes);
    return new Date(termDate.year, termDate.month - 1, termDate.day, termDate.hour, termDate.minute);
  };

  return {
    incoming: toDate(monthTermIndex * 2),
    outgoing: toDate(monthTermIndex * 2 + 2),
  };
}

export function isKoreanDaylightTime(year: number, month: number, day: number): boolean {
  if (year === 1987) {
    return (month > 5 && month < 10) || (month === 5 && day >= 10) || (month === 10 && day <= 11);
  }
  if (year === 1988) {
    return (month > 5 && month < 10) || (month === 5 && day >= 8) || (month === 10 && day <= 9);
  }
  return false;
}

function adjustKoreanDaylightTimeToKst(input: BirthInput): BirthInput {
  if (!isKoreanDaylightTime(input.year, input.month, input.day)) return input;

  if (input.hour > 0) {
    return { ...input, hour: input.hour - 1 };
  }

  const previous = addDays(input.year, input.month, input.day, -1);
  return { ...input, ...previous, hour: 23 };
}

function lunarFor(year: number, month: number, day: number, hour: number, minute: number) {
  return Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
}

function getYearMonthLunar(input: BirthInput) {
  const current = lunarFor(input.year, input.month, input.day, input.hour, input.minute);
  const previousTime = addMinutes(
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    -SOLAR_TERM_BOUNDARY_GRACE_MINUTES,
  );
  const previous = lunarFor(
    previousTime.year,
    previousTime.month,
    previousTime.day,
    previousTime.hour,
    previousTime.minute,
  );

  const crossedSolarTerm =
    current.getYearInGanZhiExact() !== previous.getYearInGanZhiExact() ||
    current.getMonthInGanZhiExact() !== previous.getMonthInGanZhiExact();

  return crossedSolarTerm ? previous : current;
}

function getHourBranchIndex(hour: number, minute: number): number {
  const minutes = hour * 60 + minute;
  return Math.floor(((minutes + 30) % 1440) / 120);
}

function getDayPillarDate(input: BirthInput): { year: number; month: number; day: number } {
  const minutes = input.hour * 60 + input.minute;
  return minutes >= 23 * 60 + 30 ? addDays(input.year, input.month, input.day, 1) : input;
}

function getHourPillar(dayStem: string, hour: number, minute: number): string {
  const branchIndex = getHourBranchIndex(hour, minute);
  const dayStemIndex = STEMS.indexOf(dayStem as typeof STEMS[number]);
  const stemIndex = ((dayStemIndex % 5) * 2 + branchIndex) % 10;
  return `${STEMS[stemIndex]}${BRANCHES[branchIndex]}`;
}

export function getFourPillars(input: BirthInput): [string, string, string, string] {
  const normalized = adjustKoreanDaylightTimeToKst(input);
  const yearMonthLunar = getYearMonthLunar(normalized);
  const dayDate = getDayPillarDate(normalized);
  const dayLunar = lunarFor(dayDate.year, dayDate.month, dayDate.day, 12, 0);
  const year = yearMonthLunar.getYearInGanZhiExact();
  const month = yearMonthLunar.getMonthInGanZhiExact();
  const day = dayLunar.getDayInGanZhiExact();
  const hour = input.unknownTime ? '' : getHourPillar(day[0] ?? '', normalized.hour, normalized.minute);
  return [year, month, day, hour];
}

export function getHiddenStems(branch: string): string {
  return HIDDEN_STEMS[branch] ?? '';
}

export function getJeonggi(branch: string): string {
  const hidden = getHiddenStems(branch);
  return hidden[hidden.length - 1] ?? '';
}

export function getRelation(dayStem: string, targetStem: string): { hanja: string; hangul: string } | null {
  const day = STEM_INFO[dayStem];
  const target = STEM_INFO[targetStem];
  if (!day || !target) return null;

  const samePolarity = day.yinyang === target.yinyang;
  let hanja: string;
  let hangul: string;

  if (day.element === target.element) {
    [hanja, hangul] = samePolarity ? ['比肩', '비견'] : ['劫財', '겁재'];
  } else if (ELEMENT_GENERATES[day.element] === target.element) {
    [hanja, hangul] = samePolarity ? ['食神', '식신'] : ['傷官', '상관'];
  } else if (ELEMENT_GENERATES[target.element] === day.element) {
    [hanja, hangul] = samePolarity ? ['偏印', '편인'] : ['正印', '정인'];
  } else if (ELEMENT_CONTROLS[day.element] === target.element) {
    [hanja, hangul] = samePolarity ? ['偏財', '편재'] : ['正財', '정재'];
  } else {
    [hanja, hangul] = samePolarity ? ['偏官', '편관'] : ['正官', '정관'];
  }

  return { hanja, hangul };
}

export function getTwelveMeteor(stem: string, branch: string): string {
  const start = UNSEONG_START[stem];
  const startIndex = BRANCHES.indexOf(start as typeof BRANCHES[number]);
  const branchIndex = BRANCHES.indexOf(branch as typeof BRANCHES[number]);
  const stemIndex = STEMS.indexOf(stem as typeof STEMS[number]);
  if (startIndex < 0 || branchIndex < 0 || stemIndex < 0) return '';

  const forward = stemIndex % 2 === 0;
  const offset = forward
    ? (branchIndex - startIndex + 12) % 12
    : (startIndex - branchIndex + 12) % 12;
  return UNSEONG_STAGES[offset] ?? '';
}

export function getTwelveSpirit(yearBranch: string, targetBranch: string): string {
  const start = SPIRIT_START_BY_YEAR_GROUP[yearBranch];
  const startIndex = BRANCHES.indexOf(start as typeof BRANCHES[number]);
  const branchIndex = BRANCHES.indexOf(targetBranch as typeof BRANCHES[number]);
  if (startIndex < 0 || branchIndex < 0) return '';

  const offset = (branchIndex - startIndex + 12) % 12;
  return SPIRIT_NAMES[offset] ?? '';
}

function relationFromLookup(
  a: string,
  b: string,
  lookup: Record<string, string>,
  type: string,
): RelationResult[] {
  const forward = `${a}${b}`;
  const reverse = `${b}${a}`;
  const detail = lookup[forward] ?? lookup[reverse];
  return detail ? [{ type, detail }] : [];
}

export function getStemRelation(stem1: string, stem2: string): RelationResult[] {
  return [
    ...relationFromLookup(stem1, stem2, STEM_COMBINES, '합'),
    ...relationFromLookup(stem1, stem2, STEM_CLASHES, '충'),
  ];
}

export function getBranchRelation(branch1: string, branch2: string): RelationResult[] {
  const results = [
    ...relationFromLookup(branch1, branch2, BRANCH_COMBINES, '합'),
    ...relationFromLookup(branch1, branch2, BRANCH_CLASHES, '충'),
    ...relationFromLookup(branch1, branch2, BRANCH_HARMS, '해'),
    ...relationFromLookup(branch1, branch2, BRANCH_BREAKS, '파'),
    ...relationFromLookup(branch1, branch2, BRANCH_PUNISHMENTS, '형'),
  ];

  if (branch1 === branch2 && SELF_PUNISHMENTS.has(branch1)) {
    results.push({ type: '형', detail: '自刑' });
  }

  return results;
}

export function analyzePillarRelations(pillar1: string, pillar2: string): PairRelation {
  return {
    stem: getStemRelation(pillar1[0] ?? '', pillar2[0] ?? ''),
    branch: getBranchRelation(pillar1[1] ?? '', pillar2[1] ?? ''),
  };
}

export function checkTripleCompose(branches: string[]): RelationResult[] {
  const set = new Set(branches);
  return TRIPLE_COMPOSES
    .filter(item => item.branches.every(branch => set.has(branch)))
    .map(item => ({ type: '삼합', detail: item.detail }));
}

export function checkDirectionalCompose(branches: string[]): RelationResult[] {
  const set = new Set(branches);
  return DIRECTIONAL_COMPOSES
    .filter(item => item.branches.every(branch => set.has(branch)))
    .map(item => ({ type: '방합', detail: item.detail }));
}

export function analyzeAllRelations(pillars: string[]): AllRelations {
  const pairs = new Map<string, PairRelation>();

  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const relation = analyzePillarRelations(pillars[i] ?? '', pillars[j] ?? '');
      if (relation.stem.length > 0 || relation.branch.length > 0) {
        pairs.set(`${i}-${j}`, relation);
      }
    }
  }

  const branches = pillars.map(pillar => pillar[1] ?? '').filter(Boolean);
  return {
    pairs,
    triple: checkTripleCompose(branches),
    directional: checkDirectionalCompose(branches),
  };
}

export function getSpecialSals(dayStem: string, dayPillar: string, branches: string[]): SpecialSals {
  const yanginBranch = YANGIN_BRANCH[dayStem];
  return {
    yangin: yanginBranch
      ? branches
        .map((branch, index) => (branch === yanginBranch ? index : -1))
        .filter(index => index >= 0)
      : [],
    baekho: BAEKHO_PILLARS.has(dayPillar),
    goegang: GOEGANG_PILLARS.has(dayPillar),
  };
}

function buildPillarDetail(pillar: Pillar, dayStem: string, yearBranch: string): PillarDetail {
  const jeonggi = getJeonggi(pillar.branch);
  return {
    pillar,
    stemSipsin: getRelation(dayStem, pillar.stem)?.hanja ?? '',
    branchSipsin: getRelation(dayStem, jeonggi)?.hanja ?? '',
    unseong: getTwelveMeteor(dayStem, pillar.branch),
    sinsal: getTwelveSpirit(yearBranch, pillar.branch),
    jigang: getHiddenStems(pillar.branch),
  };
}

function getDaewoon(input: BirthInput, dayStem: string, yearBranch: string): DaewoonItem[] {
  const normalized = adjustKoreanDaylightTimeToKst(input);
  const yearMonthLunar = getYearMonthLunar(normalized);
  const yearGanzi = yearMonthLunar.getYearInGanZhiExact();
  const monthGanzi = yearMonthLunar.getMonthInGanZhiExact();
  const yearStem = yearGanzi[0] ?? '';
  const isYangYear = STEM_INFO[yearStem]?.yinyang === '+';
  const forward = (input.gender === 'M' && isYangYear) || (input.gender === 'F' && !isYangYear);
  const termDates = getDaewoonTermDates(normalized, monthGanzi);
  const targetTerm = forward ? termDates.outgoing : termDates.incoming;
  const birthDate = new Date(normalized.year, normalized.month - 1, normalized.day, normalized.hour, normalized.minute);
  const firstStartDate = new Date(
    birthDate.getTime() + Math.abs((birthDate.getTime() - targetTerm.getTime()) / 1000 * DAEWOON_SECONDS_PER_TERM_SECOND) * 1000,
  );
  firstStartDate.setMilliseconds(0);

  const items: DaewoonItem[] = [];
  let monthIndex = ganziIndex(monthGanzi);
  for (let index = 0; index < 10; index++) {
    monthIndex += forward ? 1 : -1;
    if (monthIndex >= GANZI_60.length) monthIndex = 0;
    if (monthIndex < 0) monthIndex = GANZI_60.length - 1;

    const startDate = new Date(firstStartDate);
    startDate.setFullYear(firstStartDate.getFullYear() + index * 10);
    const ganzi = GANZI_60[monthIndex] ?? '';
    const pillar = makePillar(ganzi);
    items.push({
      index,
      ganzi,
      startDate,
      age: Math.max(0, startDate.getFullYear() - normalized.year),
      stemSipsin: getRelation(dayStem, pillar.stem)?.hanja ?? '',
      branchSipsin: getRelation(dayStem, getJeonggi(pillar.branch))?.hanja ?? '',
      unseong: getTwelveMeteor(dayStem, pillar.branch),
      sinsal: getTwelveSpirit(yearBranch, pillar.branch),
    });
  }

  return items;
}

export function ganziIndex(ganzi: string): number {
  return GANZI_60.indexOf(ganzi);
}

export function calculateSajuCore(input: BirthInput): SajuResult {
  assertValidBirthInput(input);

  const [yearGanzi, monthGanzi, dayGanzi, hourGanzi] = getFourPillars(input);
  const yearPillar = makePillar(yearGanzi);
  const monthPillar = makePillar(monthGanzi);
  const dayPillar = makePillar(dayGanzi);
  const hourPillar = hourGanzi ? makePillar(hourGanzi) : makePillar('');
  const orderedPillars = [hourPillar, dayPillar, monthPillar, yearPillar];
  const dayStem = dayPillar.stem;
  const yearBranch = yearPillar.branch;
  const pillars = orderedPillars.map(pillar => buildPillarDetail(pillar, dayStem, yearBranch));
  const ganziList = orderedPillars.map(pillar => pillar.ganzi).filter(Boolean);
  const branches = orderedPillars.map(pillar => pillar.branch).filter(Boolean);

  return {
    input,
    pillars,
    daewoon: input.unknownTime ? [] : getDaewoon(input, dayStem, yearBranch),
    relations: analyzeAllRelations(ganziList),
    specialSals: getSpecialSals(dayStem, dayGanzi, branches),
  };
}

export const calculateSaju = calculateSajuCore;
