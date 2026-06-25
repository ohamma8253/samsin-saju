import { Solar } from 'lunar-javascript';
import { BRANCHES, STEMS, type Gender } from './manselyeok-core';

export interface ZiweiInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: Gender;
}

export interface WuXingJu {
  name: string;
  number: number;
}

export interface ZiweiStar {
  name: string;
  brightness: string;
  siHua: string;
}

export interface ZiweiPalace {
  name: string;
  zhi: string;
  gan: string;
  ganZhi: string;
  stars: ZiweiStar[];
  isShenGong: boolean;
}

export interface ZiweiChartCore {
  solarYear: number;
  solarMonth: number;
  solarDay: number;
  hour: number;
  minute: number;
  isMale: boolean;
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  isLeapMonth: boolean;
  yearGan: string;
  yearZhi: string;
  mingGongZhi: string;
  shenGongZhi: string;
  wuXingJu: WuXingJu;
  palaces: Record<string, ZiweiPalace>;
  daXianStartAge: number;
}

export interface DaxianItemCore {
  ageStart: number;
  ageEnd: number;
  palaceName: string;
  ganZhi: string;
  mainStars: string[];
}

export interface LiuYueInfoCore {
  month: number;
  mingGongZhi: string;
  natalPalaceName: string;
}

export interface LiuNianInfoCore {
  year: number;
  gan: string;
  zhi: string;
  mingGongZhi: string;
  natalPalaceAtMing: string;
  siHua: Record<string, string>;
  siHuaPalaces: Record<string, string>;
  palaces: Record<string, string>;
  liuyue: LiuYueInfoCore[];
  daxianPalaceName: string;
  daxianAgeStart: number;
  daxianAgeEnd: number;
}

const EARTH_BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'] as const;
const PALACE_NAMES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '交友', '官祿', '田宅', '福德', '父母'] as const;
const MAIN_STAR_NAMES = new Set([
  '紫微', '天機', '太陽', '武曲', '天同', '廉貞',
  '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
]);
const ZIWEI_STAR_OFFSETS: Array<[string, number]> = [
  ['紫微', 0],
  ['天機', -1],
  ['太陽', -3],
  ['武曲', -4],
  ['天同', -5],
  ['廉貞', -8],
];
const TIANFU_STAR_OFFSETS: Array<[string, number]> = [
  ['天府', 0],
  ['太陰', 1],
  ['貪狼', 2],
  ['巨門', 3],
  ['天相', 4],
  ['天梁', 5],
  ['七殺', 6],
  ['破軍', 10],
];
const MAIN_STAR_BRIGHTNESS_BY_BRANCH: Record<string, Partial<Record<string, string>>> = {
  紫微: { 子: '旺', 丑: '廟', 寅: '得', 卯: '利', 辰: '旺', 巳: '得', 午: '旺', 未: '廟', 申: '得', 酉: '利', 戌: '旺', 亥: '得' },
  天機: { 子: '廟', 丑: '陷', 寅: '旺', 卯: '廟', 辰: '得', 巳: '陷', 午: '陷', 未: '陷', 申: '旺', 酉: '廟', 戌: '得', 亥: '陷' },
  太陽: { 子: '陷', 丑: '陷', 寅: '旺', 卯: '廟', 辰: '旺', 巳: '廟', 午: '旺', 未: '得', 申: '得', 酉: '陷', 戌: '陷', 亥: '陷' },
  武曲: { 子: '旺', 丑: '廟', 寅: '利', 卯: '陷', 辰: '廟', 巳: '利', 午: '旺', 未: '廟', 申: '得', 酉: '陷', 戌: '廟', 亥: '得' },
  天同: { 子: '旺', 丑: '陷', 寅: '得', 卯: '陷', 辰: '陷', 巳: '旺', 午: '陷', 未: '陷', 申: '得', 酉: '陷', 戌: '陷', 亥: '旺' },
  廉貞: { 子: '平', 丑: '廟', 寅: '廟', 卯: '平', 辰: '平', 巳: '陷', 午: '平', 未: '廟', 申: '廟', 酉: '平', 戌: '平', 亥: '陷' },
  天府: { 子: '廟', 丑: '旺', 寅: '得', 卯: '廟', 辰: '旺', 巳: '廟', 午: '廟', 未: '旺', 申: '得', 酉: '廟', 戌: '旺', 亥: '廟' },
  太陰: { 子: '廟', 丑: '旺', 寅: '陷', 卯: '陷', 辰: '陷', 巳: '陷', 午: '陷', 未: '陷', 申: '得', 酉: '旺', 戌: '廟', 亥: '廟' },
  貪狼: { 子: '旺', 丑: '廟', 寅: '廟', 卯: '陷', 辰: '旺', 巳: '陷', 午: '旺', 未: '廟', 申: '廟', 酉: '陷', 戌: '旺', 亥: '陷' },
  巨門: { 子: '旺', 丑: '陷', 寅: '廟', 卯: '旺', 辰: '陷', 巳: '陷', 午: '旺', 未: '陷', 申: '廟', 酉: '旺', 戌: '陷', 亥: '陷' },
  天相: { 子: '廟', 丑: '廟', 寅: '旺', 卯: '利', 辰: '得', 巳: '廟', 午: '廟', 未: '廟', 申: '旺', 酉: '利', 戌: '得', 亥: '廟' },
  天梁: { 子: '廟', 丑: '旺', 寅: '廟', 卯: '旺', 辰: '陷', 巳: '廟', 午: '廟', 未: '旺', 申: '廟', 酉: '旺', 戌: '陷', 亥: '廟' },
  七殺: { 子: '旺', 丑: '廟', 寅: '廟', 卯: '旺', 辰: '得', 巳: '廟', 午: '旺', 未: '廟', 申: '廟', 酉: '旺', 戌: '得', 亥: '廟' },
  破軍: { 子: '旺', 丑: '廟', 寅: '陷', 卯: '旺', 辰: '陷', 巳: '廟', 午: '旺', 未: '廟', 申: '陷', 酉: '旺', 戌: '陷', 亥: '廟' },
};
const LUCUN_BRANCH_BY_YEAR_GAN: Record<string, string> = {
  甲: '寅',
  乙: '卯',
  丙: '巳',
  丁: '午',
  戊: '巳',
  己: '午',
  庚: '申',
  辛: '酉',
  壬: '亥',
  癸: '子',
};
const KUI_YUE_BRANCH_BY_YEAR_GAN: Record<string, { kui: string; yue: string }> = {
  甲: { kui: '丑', yue: '未' },
  戊: { kui: '丑', yue: '未' },
  庚: { kui: '丑', yue: '未' },
  乙: { kui: '子', yue: '申' },
  己: { kui: '子', yue: '申' },
  丙: { kui: '亥', yue: '酉' },
  丁: { kui: '亥', yue: '酉' },
  辛: { kui: '午', yue: '寅' },
  壬: { kui: '卯', yue: '巳' },
  癸: { kui: '卯', yue: '巳' },
};
const TIANMA_BRANCH_BY_YEAR_ZHI: Record<string, string> = {
  寅: '申',
  午: '申',
  戌: '申',
  申: '寅',
  子: '寅',
  辰: '寅',
  巳: '亥',
  酉: '亥',
  丑: '亥',
  亥: '巳',
  卯: '巳',
  未: '巳',
};
const HUO_START_BRANCH_BY_YEAR_ZHI: Record<string, string> = {
  寅: '丑',
  午: '丑',
  戌: '丑',
  申: '寅',
  子: '寅',
  辰: '寅',
  巳: '卯',
  酉: '卯',
  丑: '卯',
  亥: '酉',
  卯: '酉',
  未: '酉',
};
const LING_START_BRANCH_BY_YEAR_ZHI: Record<string, string> = {
  寅: '卯',
  午: '卯',
  戌: '卯',
  申: '戌',
  子: '戌',
  辰: '戌',
  巳: '戌',
  酉: '戌',
  丑: '戌',
  亥: '戌',
  卯: '戌',
  未: '戌',
};
const WUXING_JU_BY_ELEMENT: Record<string, WuXingJu> = {
  水: { name: '水二局', number: 2 },
  木: { name: '木三局', number: 3 },
  金: { name: '金四局', number: 4 },
  土: { name: '土五局', number: 5 },
  火: { name: '火六局', number: 6 },
};

const TIGER_ESCAPE_START_STEM_BY_YEAR_STEM: Record<string, string> = {
  甲: '丙',
  己: '丙',
  乙: '戊',
  庚: '戊',
  丙: '庚',
  辛: '庚',
  丁: '壬',
  壬: '壬',
  戊: '甲',
  癸: '甲',
};

const NAYIN_ELEMENT_BY_GANZHI: Record<string, string> = {
  甲子: '金', 乙丑: '金', 丙寅: '火', 丁卯: '火', 戊辰: '木', 己巳: '木',
  庚午: '土', 辛未: '土', 壬申: '金', 癸酉: '金', 甲戌: '火', 乙亥: '火',
  丙子: '水', 丁丑: '水', 戊寅: '土', 己卯: '土', 庚辰: '金', 辛巳: '金',
  壬午: '木', 癸未: '木', 甲申: '水', 乙酉: '水', 丙戌: '土', 丁亥: '土',
  戊子: '火', 己丑: '火', 庚寅: '木', 辛卯: '木', 壬辰: '水', 癸巳: '水',
  甲午: '金', 乙未: '金', 丙申: '火', 丁酉: '火', 戊戌: '木', 己亥: '木',
  庚子: '土', 辛丑: '土', 壬寅: '金', 癸卯: '金', 甲辰: '火', 乙巳: '火',
  丙午: '水', 丁未: '水', 戊申: '土', 己酉: '土', 庚戌: '金', 辛亥: '金',
  壬子: '木', 癸丑: '木', 甲寅: '水', 乙卯: '水', 丙辰: '土', 丁巳: '土',
  戊午: '火', 己未: '火', 庚申: '木', 辛酉: '木', 壬戌: '水', 癸亥: '水',
};

const SIHUA_BY_YEAR_GAN: Record<string, Record<string, string>> = {
  甲: { 廉貞: '化祿', 破軍: '化權', 武曲: '化科', 太陽: '化忌' },
  乙: { 天機: '化祿', 天梁: '化權', 紫微: '化科', 太陰: '化忌' },
  丙: { 天同: '化祿', 天機: '化權', 文昌: '化科', 廉貞: '化忌' },
  丁: { 太陰: '化祿', 天同: '化權', 天機: '化科', 巨門: '化忌' },
  戊: { 貪狼: '化祿', 太陰: '化權', 右弼: '化科', 天機: '化忌' },
  己: { 武曲: '化祿', 貪狼: '化權', 天梁: '化科', 文曲: '化忌' },
  庚: { 太陽: '化祿', 武曲: '化權', 太陰: '化科', 天同: '化忌' },
  辛: { 巨門: '化祿', 太陽: '化權', 文曲: '化科', 文昌: '化忌' },
  壬: { 天梁: '化祿', 紫微: '化權', 左輔: '化科', 武曲: '化忌' },
  癸: { 破軍: '化祿', 巨門: '化權', 太陰: '化科', 貪狼: '化忌' },
};

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function branchIndex(branch: string, branches: readonly string[] = EARTH_BRANCHES): number {
  const index = branches.indexOf(branch as typeof EARTH_BRANCHES[number]);
  if (index < 0) throw new Error(`Unknown branch: ${branch}`);
  return index;
}

function hourBranch(hour: number): string {
  if (hour === 23) return '子';
  const index = Math.floor((hour + 1) / 2) % 12;
  return BRANCHES[index] ?? '子';
}

function isKoreanDaylightTime(year: number, month: number, day: number): boolean {
  if (year === 1987) {
    return (month > 5 || (month === 5 && day >= 10)) && (month < 10 || (month === 10 && day <= 11));
  }
  if (year === 1988) {
    return (month > 5 || (month === 5 && day >= 8)) && (month < 10 || (month === 10 && day <= 9));
  }
  return false;
}

function ziweiCalculationHour(input: ZiweiInput): number {
  if (!isKoreanDaylightTime(input.year, input.month, input.day)) return input.hour;
  return mod(input.hour - 1, 24);
}

function palaceForLunarMonth(month: number): string {
  return EARTH_BRANCHES[mod(month - 1, 12)] ?? '寅';
}

function calculateMingGongZhi(lunarMonth: number, hour: number): string {
  const monthBranch = palaceForLunarMonth(lunarMonth);
  const monthIndex = branchIndex(monthBranch);
  const hourIndexFromZi = branchIndex(hourBranch(hour), BRANCHES);
  return EARTH_BRANCHES[mod(monthIndex - hourIndexFromZi, 12)] ?? '寅';
}

function calculateShenGongZhi(lunarMonth: number, hour: number): string {
  const monthBranch = palaceForLunarMonth(lunarMonth);
  const monthIndex = branchIndex(monthBranch);
  const hourIndexFromZi = branchIndex(hourBranch(hour), BRANCHES);
  return EARTH_BRANCHES[mod(monthIndex + hourIndexFromZi, 12)] ?? '寅';
}

function palaceStemForBranch(yearGan: string, branch: string): string {
  const startStem = TIGER_ESCAPE_START_STEM_BY_YEAR_STEM[yearGan] ?? '丙';
  const startStemIndex = STEMS.indexOf(startStem as typeof STEMS[number]);
  const offset = branchIndex(branch);
  return STEMS[mod(startStemIndex + offset, 10)] ?? '甲';
}

function calculateWuXingJu(mingGongGanZhi: string): WuXingJu {
  const element = NAYIN_ELEMENT_BY_GANZHI[mingGongGanZhi] ?? '水';
  return WUXING_JU_BY_ELEMENT[element] ?? WUXING_JU_BY_ELEMENT.水;
}

function branchOffset(branch: string, offset: number): string {
  const index = branchIndex(branch, BRANCHES);
  return BRANCHES[mod(index + offset, 12)] ?? '子';
}

function starBrightness(starName: string, zhi: string): string {
  return MAIN_STAR_BRIGHTNESS_BY_BRANCH[starName]?.[zhi] ?? '';
}

function mainStars(stars: ZiweiStar[]): string[] {
  return stars
    .filter(star => MAIN_STAR_NAMES.has(star.name))
    .map(star => star.name);
}

function findPalaceByZhi(chart: ZiweiChartCore, zhi: string): ZiweiPalace | undefined {
  return Object.values(chart.palaces).find(palace => palace.zhi === zhi);
}

function findPalaceByStar(chart: ZiweiChartCore, starName: string): string {
  const palace = Object.values(chart.palaces).find(item => item.stars.some(star => star.name === starName));
  return palace?.name ?? '';
}

function buildPalaces(yearGan: string, mingGongZhi: string, shenGongZhi: string): Record<string, ZiweiPalace> {
  const palaces: Record<string, ZiweiPalace> = {};
  const mingIndex = branchIndex(mingGongZhi);

  for (let index = 0; index < PALACE_NAMES.length; index++) {
    const palaceName = PALACE_NAMES[index];
    const zhi = EARTH_BRANCHES[mod(mingIndex - index, 12)] ?? '寅';
    const gan = palaceStemForBranch(yearGan, zhi);
    palaces[palaceName] = {
      name: palaceName,
      zhi,
      gan,
      ganZhi: `${gan}${zhi}`,
      stars: [],
      isShenGong: zhi === shenGongZhi,
    };
  }

  return palaces;
}

function findPalaceByBranchMap(palaces: Record<string, ZiweiPalace>): Map<string, ZiweiPalace> {
  return new Map(Object.values(palaces).map(palace => [palace.zhi, palace]));
}

function calculateZiweiStarZhi(lunarDay: number, juNumber: number): string {
  let adjustedDay = lunarDay;
  let adjustment = 0;
  while (adjustedDay % juNumber !== 0) {
    adjustedDay += 1;
    adjustment += 1;
  }

  const baseIndex = Math.floor(adjustedDay / juNumber) - 1;
  const direction = adjustment % 2 === 0 ? 1 : -1;
  return EARTH_BRANCHES[mod(baseIndex + direction * adjustment, 12)] ?? '寅';
}

function addStar(
  palaceByZhi: Map<string, ZiweiPalace>,
  zhi: string,
  starName: string,
  yearGan: string,
): void {
  const palace = palaceByZhi.get(zhi);
  if (!palace) return;

  palace.stars.push({
    name: starName,
    brightness: starBrightness(starName, zhi),
    siHua: SIHUA_BY_YEAR_GAN[yearGan]?.[starName] ?? '',
  });
}

function placeMainStars(
  palaces: Record<string, ZiweiPalace>,
  lunarDay: number,
  juNumber: number,
  yearGan: string,
): void {
  const palaceByZhi = findPalaceByBranchMap(palaces);
  const ziweiZhi = calculateZiweiStarZhi(lunarDay, juNumber);
  const ziweiIndex = branchIndex(ziweiZhi);
  const tianfuIndex = mod(-ziweiIndex, 12);

  for (const [starName, offset] of ZIWEI_STAR_OFFSETS) {
    addStar(palaceByZhi, EARTH_BRANCHES[mod(ziweiIndex + offset, 12)] ?? ziweiZhi, starName, yearGan);
  }

  for (const [starName, offset] of TIANFU_STAR_OFFSETS) {
    addStar(palaceByZhi, EARTH_BRANCHES[mod(tianfuIndex + offset, 12)] ?? ziweiZhi, starName, yearGan);
  }
}

function placeAuxiliaryStars(
  palaces: Record<string, ZiweiPalace>,
  lunarMonth: number,
  hour: number,
  yearGan: string,
  yearZhi: string,
): void {
  const palaceByZhi = findPalaceByBranchMap(palaces);
  const hourIndex = branchIndex(hourBranch(hour), BRANCHES);
  const lucunBranch = LUCUN_BRANCH_BY_YEAR_GAN[yearGan];
  const kuiYue = KUI_YUE_BRANCH_BY_YEAR_GAN[yearGan];
  const tianmaBranch = TIANMA_BRANCH_BY_YEAR_ZHI[yearZhi];
  const huoStart = HUO_START_BRANCH_BY_YEAR_ZHI[yearZhi];
  const lingStart = LING_START_BRANCH_BY_YEAR_ZHI[yearZhi];

  if (lucunBranch) {
    addStar(palaceByZhi, lucunBranch, '祿存', yearGan);
    addStar(palaceByZhi, branchOffset(lucunBranch, 1), '擎羊', yearGan);
    addStar(palaceByZhi, branchOffset(lucunBranch, -1), '陀羅', yearGan);
  }

  if (kuiYue) {
    addStar(palaceByZhi, kuiYue.kui, '天魁', yearGan);
    addStar(palaceByZhi, kuiYue.yue, '天鉞', yearGan);
  }

  if (tianmaBranch) {
    addStar(palaceByZhi, tianmaBranch, '天馬', yearGan);
  }

  if (huoStart) {
    addStar(palaceByZhi, branchOffset(huoStart, hourIndex), '火星', yearGan);
  }

  if (lingStart) {
    addStar(palaceByZhi, branchOffset(lingStart, hourIndex), '鈴星', yearGan);
  }

  addStar(palaceByZhi, branchOffset('辰', lunarMonth - 1), '左輔', yearGan);
  addStar(palaceByZhi, branchOffset('戌', -(lunarMonth - 1)), '右弼', yearGan);
  addStar(palaceByZhi, branchOffset('戌', -hourIndex), '文昌', yearGan);
  addStar(palaceByZhi, branchOffset('辰', hourIndex), '文曲', yearGan);
  addStar(palaceByZhi, branchOffset('亥', -hourIndex), '地空', yearGan);
  addStar(palaceByZhi, branchOffset('亥', hourIndex), '地劫', yearGan);
}

export function calculateZiweiCore(input: ZiweiInput): ZiweiChartCore {
  const lunar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0).getLunar();
  const lunarMonthRaw = lunar.getMonth();
  const lunarMonth = Math.abs(lunarMonthRaw);
  const lunarDay = lunar.getDay();
  const yearGan = lunar.getYearGan();
  const yearZhi = lunar.getYearZhi();
  const calculationHour = ziweiCalculationHour(input);
  const mingGongZhi = calculateMingGongZhi(lunarMonth, calculationHour);
  const shenGongZhi = calculateShenGongZhi(lunarMonth, calculationHour);
  const palaces = buildPalaces(yearGan, mingGongZhi, shenGongZhi);
  const mingGong = palaces.命宮;
  const wuXingJu = calculateWuXingJu(mingGong.ganZhi);
  placeMainStars(palaces, lunarDay, wuXingJu.number, yearGan);
  placeAuxiliaryStars(palaces, lunarMonth, calculationHour, yearGan, yearZhi);

  return {
    solarYear: input.year,
    solarMonth: input.month,
    solarDay: input.day,
    hour: input.hour,
    minute: input.minute,
    isMale: input.gender === 'M',
    lunarYear: lunar.getYear(),
    lunarMonth,
    lunarDay,
    isLeapMonth: lunarMonthRaw < 0,
    yearGan,
    yearZhi,
    mingGongZhi,
    shenGongZhi,
    wuXingJu,
    palaces,
    daXianStartAge: wuXingJu.number,
  };
}

export function getDaxianListCore(chart: ZiweiChartCore): DaxianItemCore[] {
  const yearStemIndex = STEMS.indexOf(chart.yearGan as typeof STEMS[number]);
  const isYangYear = yearStemIndex % 2 === 0;
  const forward = chart.isMale === isYangYear;
  const palaces = Object.values(chart.palaces);
  const byZhi = new Map(palaces.map(palace => [palace.zhi, palace]));
  const mingIndex = branchIndex(chart.mingGongZhi);
  const result: DaxianItemCore[] = [];

  for (let index = 0; index < 12; index++) {
    const zhi = EARTH_BRANCHES[mod(mingIndex + (forward ? index : -index), 12)] ?? chart.mingGongZhi;
    const palace = byZhi.get(zhi);
    if (!palace) continue;

    const ageStart = chart.daXianStartAge + index * 10;
    result.push({
      ageStart,
      ageEnd: ageStart + 9,
      palaceName: palace.name,
      ganZhi: palace.ganZhi,
      mainStars: mainStars(palace.stars),
    });
  }

  return result;
}

export function calculateLiunianCore(chart: ZiweiChartCore, year: number): LiuNianInfoCore {
  const lunar = Solar.fromYmdHms(year, 7, 1, 12, 0, 0).getLunar();
  const gan = lunar.getYearGan();
  const zhi = lunar.getYearZhi();
  const natalPalaceAtMing = findPalaceByZhi(chart, zhi)?.name ?? '';
  const siHua = SIHUA_BY_YEAR_GAN[gan] ?? {};
  const siHuaPalaces = Object.fromEntries(
    Object.entries(siHua).map(([starName, transform]) => [transform, findPalaceByStar(chart, starName)]),
  );

  const currentAge = year - chart.solarYear + 1;
  const daxianList = getDaxianListCore(chart);
  const firstDaxian = daxianList[0];
  const lastDaxian = daxianList[daxianList.length - 1];
  const daxian = daxianList.find(item => currentAge >= item.ageStart && currentAge <= item.ageEnd) ??
    (currentAge < (firstDaxian?.ageStart ?? 0) ? firstDaxian : lastDaxian);
  const palaces = Object.fromEntries(
    Object.values(chart.palaces).map(palace => [palace.name, palace.zhi]),
  );
  const liuyue = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const mingGongZhi = EARTH_BRANCHES[mod(branchIndex(zhi) + index, 12)] ?? zhi;
    return {
      month,
      mingGongZhi,
      natalPalaceName: findPalaceByZhi(chart, mingGongZhi)?.name ?? '',
    };
  });

  return {
    year,
    gan,
    zhi,
    mingGongZhi: zhi,
    natalPalaceAtMing,
    siHua,
    siHuaPalaces,
    palaces,
    liuyue,
    daxianPalaceName: daxian?.palaceName ?? '',
    daxianAgeStart: daxian?.ageStart ?? 0,
    daxianAgeEnd: daxian?.ageEnd ?? 0,
  };
}
