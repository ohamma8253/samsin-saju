import type { SamsinData, WuxingCount } from './saju';
import type { ComputedScores, ScoredPeriod } from './scoring';
import type { GraphPeriod, LifeMoment, PhaseType, TotalReport } from './claude';

type Domain = 'money' | 'career';
type Voice = 'cheongwoon' | 'taeeul' | 'luna';

interface SystemAverages {
  saju: number;
  ziwei: number;
  natal: number;
  total: number;
  stdDev: number;
  dominantVoice: Voice | 'balanced';
}

interface CombinedPeriod {
  label: string;
  startAge: number;
  endAge: number;
  moneyScore?: number;
  careerScore?: number;
  score: number;
  sajuScore: number;
  ziweiScore: number;
  natalScore: number;
  dominantDomain: Domain;
}

const STEM_KO: Record<string, string> = {
  '甲': '봄 나무', '乙': '덩굴 나무',
  '丙': '큰 불', '丁': '등불',
  '戊': '큰 산', '己': '기름진 흙',
  '庚': '단단한 쇠', '辛': '보석 같은 쇠',
  '壬': '큰 물', '癸': '이슬 같은 물',
};

const BRANCH_KO: Record<string, string> = {
  '子': '겨울 물', '丑': '차가운 흙', '寅': '새벽 나무', '卯': '봄 나무',
  '辰': '젖은 흙', '巳': '초여름 불', '午': '한낮의 불', '未': '마른 흙',
  '申': '가을 쇠', '酉': '맑은 쇠', '戌': '늦가을 흙', '亥': '깊은 물',
};

const WUXING_KO: Record<keyof WuxingCount, string> = {
  tree: '나무',
  fire: '불',
  earth: '흙',
  metal: '쇠',
  water: '물',
};

const SIGN_KO: Record<string, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
};

const PALACE_KO: Record<string, string> = {
  '命宮': '명궁',
  '兄弟': '형제 궁',
  '兄弟宮': '형제 궁',
  '夫妻': '배우자 궁',
  '夫妻宮': '배우자 궁',
  '子女': '자녀 궁',
  '子女宮': '자녀 궁',
  '財帛': '재물 궁',
  '財帛宮': '재물 궁',
  '疾厄': '건강 궁',
  '疾厄宮': '건강 궁',
  '遷移': '이동 궁',
  '遷移宮': '이동 궁',
  '交友': '동료 궁',
  '僕役宮': '동료 궁',
  '官祿': '일의 궁',
  '官祿宮': '일의 궁',
  '田宅': '터전 궁',
  '田宅宮': '터전 궁',
  '福德': '복덕 궁',
  '福德宮': '복덕 궁',
  '父母': '부모 궁',
  '父母宮': '부모 궁',
};

const STAR_KO: Record<string, string> = {
  '紫微': '자미', '天機': '천기', '太陽': '태양', '武曲': '무곡',
  '天同': '천동', '廉貞': '염정', '天府': '천부', '太陰': '태음',
  '貪狼': '탐랑', '巨門': '거문', '天相': '천상', '天梁': '천량',
  '七殺': '칠살', '破軍': '파군', '文昌': '문창', '文曲': '문곡',
  '左輔': '좌보', '右弼': '우필', '火星': '화성', '鈴星': '령성',
  '擎羊': '경양', '陀羅': '타라', '地空': '지공', '地劫': '지겁',
  '祿存': '록존', '天魁': '천괴', '天鉞': '천월',
};

const DOMAIN_KO: Record<Domain, string> = {
  money: '금전 흐름',
  career: '일의 흐름',
};

const VOICE_KO: Record<Voice, string> = {
  cheongwoon: '청운',
  taeeul: '태을',
  luna: '루나',
};

const PHASE_NOTE: Record<PhaseType, string> = {
  seeding: '씨앗을 고르고 바탕을 다지는 구간',
  rising: '흐름이 조금씩 위로 움직이는 구간',
  peak: '쌓아 둔 것이 가장 잘 보이는 구간',
  plateau: '속도를 고르고 안정감을 확인하는 구간',
  declining: '불필요한 것을 덜어내며 다음 장면을 준비하는 구간',
};

const DEFAULT_PERIODS: CombinedPeriod[] = [
  makeFallbackPeriod('20~24세', 20, 24, 50),
  makeFallbackPeriod('25~29세', 25, 29, 50),
  makeFallbackPeriod('30~34세', 30, 34, 50),
  makeFallbackPeriod('35~39세', 35, 39, 50),
  makeFallbackPeriod('40~44세', 40, 44, 50),
];

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function average(values: number[]): number {
  if (values.length === 0) return 50;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = average(values);
  const variance = average(values.map(value => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function makeFallbackPeriod(
  label: string,
  startAge: number,
  endAge: number,
  score: number,
): CombinedPeriod {
  return {
    label,
    startAge,
    endAge,
    moneyScore: score,
    careerScore: score,
    score,
    sajuScore: score,
    ziweiScore: score,
    natalScore: score,
    dominantDomain: 'career',
  };
}

function toKoreanStem(stem?: string): string {
  if (!stem) return '중심 기운';
  return STEM_KO[stem] ?? '중심 기운';
}

function hasFinalConsonant(text: string): boolean {
  const lastHangul = [...text].reverse().find(char => {
    const code = char.charCodeAt(0);
    return code >= 0xac00 && code <= 0xd7a3;
  });
  if (!lastHangul) return false;
  return (lastHangul.charCodeAt(0) - 0xac00) % 28 !== 0;
}

function withSubject(text: string): string {
  return `${text}${hasFinalConsonant(text) ? '이' : '가'}`;
}

function withAndParticle(text: string): string {
  return `${text}${hasFinalConsonant(text) ? '과' : '와'}`;
}

function withAsParticle(text: string): string {
  return `${text}${hasFinalConsonant(text) ? '으로' : '로'}`;
}

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  const last = items[items.length - 1];
  return `${items.slice(0, -1).map((item, index, list) =>
    index === list.length - 1 ? withAndParticle(item) : `${item},`,
  ).join(' ')} ${last}`;
}

function toKoreanBranch(branch?: string): string {
  if (!branch) return '삶의 바탕';
  return BRANCH_KO[branch] ?? '삶의 바탕';
}

function toKoreanSign(sign?: string): string {
  if (!sign) return '별자리 정보 없음';
  return SIGN_KO[sign] ?? sign;
}

function toKoreanPalace(name?: string): string {
  if (!name) return '명반의 중심';
  return PALACE_KO[name] ?? '명반의 한 궁';
}

function toKoreanStar(name?: string): string {
  if (!name) return '주요 별';
  return STAR_KO[name] ?? '보조 별';
}

function isUnknownTime(data: SamsinData): boolean {
  return data.birthContext?.unknownTime || data.birthContext?.birthTimePrecision === 'unknown';
}

function getDayEnergy(data: SamsinData): string {
  const day = data.saju.pillars[1]?.pillar;
  return `${withAndParticle(toKoreanStem(day?.stem))} ${toKoreanBranch(day?.branch)}`;
}

function getWuxingProfile(wuxing: WuxingCount): {
  strongest: string;
  weakest: string;
  spread: number;
} {
  const entries = (Object.entries(wuxing) as Array<[keyof WuxingCount, number]>)
    .sort((a, b) => b[1] - a[1]);
  const strongest = entries[0] ?? ['tree', 0];
  const weakest = entries[entries.length - 1] ?? ['water', 0];
  return {
    strongest: WUXING_KO[strongest[0]],
    weakest: WUXING_KO[weakest[0]],
    spread: strongest[1] - weakest[1],
  };
}

function getMingStars(data: SamsinData): string {
  const mingPalace = data.ziwei.palaces?.['命宮'];
  const stars = mingPalace?.stars ?? [];
  if (stars.length === 0) return '명궁의 주요 별';
  return joinWithAnd(stars.slice(0, 2).map(star => toKoreanStar(star.name)));
}

function getStrongZiweiSignal(data: SamsinData): string {
  const palaces = data.ziwei.palaces ?? {};
  for (const target of ['財帛', '官祿', '命宮', '福德']) {
    const palace = palaces[target];
    const siHuaStar = palace?.stars.find(star => star.siHua);
    if (siHuaStar) {
      return `${toKoreanPalace(target)}의 ${toKoreanStar(siHuaStar.name)} 흐름`;
    }
  }
  return `${toKoreanPalace('命宮')}의 ${getMingStars(data)} 흐름`;
}

function getNatalSnapshot(data: SamsinData): {
  sun: string;
  moon: string;
  asc: string;
} {
  const sun = data.natal.planets.find(planet => planet.id === 'Sun');
  const moon = data.natal.planets.find(planet => planet.id === 'Moon');
  return {
    sun: toKoreanSign(sun?.sign),
    moon: toKoreanSign(moon?.sign),
    asc: isUnknownTime(data) ? '출생시간 미상으로 보류' : toKoreanSign(data.natal.angles?.asc?.sign),
  };
}

function scoredToGraph(
  period: ScoredPeriod,
  domain: Domain,
  index: number,
  periods: ScoredPeriod[],
): GraphPeriod {
  return {
    label: period.label,
    score: period.score,
    note: buildGraphNote(period, domain, index, periods),
    phaseType: period.phaseType,
    sajuScore: period.sajuScore,
    ziweiScore: period.ziweiScore,
    natalScore: period.natalScore,
  };
}

function fallbackGraphNote(domain: Domain): string {
  return `${DOMAIN_KO[domain]}을 볼 구간 자료가 부족해 기본 흐름만 표시합니다. 자기성찰용 경향으로만 참고하세요.`;
}

function buildGraphNote(
  period: ScoredPeriod,
  domain: Domain,
  index: number,
  periods: ScoredPeriod[],
): string {
  const dominant = getDominantScore(period);
  const phaseText = PHASE_NOTE[period.phaseType] ?? '흐름을 점검하는 구간';
  const trend = index === 0 ? 0 : period.score - periods[index - 1].score;
  const trendText = trend > 5
    ? '앞 구간보다 단서가 더 또렷합니다'
    : trend < -5
      ? '앞 구간보다 속도를 낮추고 점검하는 편이 안정적입니다'
      : '앞 구간과 비슷한 리듬입니다';
  const scoreText = period.score >= 70
    ? domain === 'money'
      ? '지출, 축적, 기회 단서가 비교적 잘 보입니다'
      : '역할과 성과의 단서가 비교적 잘 보입니다'
    : period.score <= 40
      ? '확장보다 정리와 점검의 의미가 큽니다'
      : '세 지표가 중간권에서 균형을 찾습니다';

  return `${period.label}의 ${DOMAIN_KO[domain]}은 ${phaseText}입니다. ${scoreText}. ${VOICE_KO[dominant.voice]} 신호가 가장 선명하고, ${trendText}.`;
}

function getDominantScore(period: ScoredPeriod | CombinedPeriod): {
  voice: Voice;
  score: number;
} {
  const scores: Array<{ voice: Voice; score: number }> = [
    { voice: 'cheongwoon', score: period.sajuScore },
    { voice: 'taeeul', score: period.ziweiScore },
    { voice: 'luna', score: period.natalScore },
  ];
  return scores.sort((a, b) => b.score - a.score)[0];
}

function buildGraphs(scores: ComputedScores): {
  moneyGraph: GraphPeriod[];
  careerGraph: GraphPeriod[];
} {
  const moneyGraph = scores.moneyPeriods.length > 0
    ? scores.moneyPeriods.map((period, index, periods) =>
      scoredToGraph(period, 'money', index, periods))
    : [{
      label: '자료 부족',
      score: 50,
      note: fallbackGraphNote('money'),
      phaseType: 'plateau' as PhaseType,
      sajuScore: 50,
      ziweiScore: 50,
      natalScore: 50,
    }];

  const careerGraph = scores.careerPeriods.length > 0
    ? scores.careerPeriods.map((period, index, periods) =>
      scoredToGraph(period, 'career', index, periods))
    : [{
      label: '자료 부족',
      score: 50,
      note: fallbackGraphNote('career'),
      phaseType: 'plateau' as PhaseType,
      sajuScore: 50,
      ziweiScore: 50,
      natalScore: 50,
    }];

  return { moneyGraph, careerGraph };
}

function calculateSystemAverages(scores: ComputedScores): SystemAverages {
  const periods = [...scores.moneyPeriods, ...scores.careerPeriods];
  if (periods.length === 0) {
    return {
      saju: 50,
      ziwei: 50,
      natal: 50,
      total: 50,
      stdDev: 0,
      dominantVoice: 'balanced',
    };
  }

  const saju = average(periods.map(period => period.sajuScore));
  const ziwei = average(periods.map(period => period.ziweiScore));
  const natal = average(periods.map(period => period.natalScore));
  const values = [saju, ziwei, natal];
  const total = average(values);
  const deviation = stdDev(values);
  const diffs = [
    { voice: 'cheongwoon' as const, diff: Math.abs(saju - total) },
    { voice: 'taeeul' as const, diff: Math.abs(ziwei - total) },
    { voice: 'luna' as const, diff: Math.abs(natal - total) },
  ].sort((a, b) => b.diff - a.diff);

  return {
    saju: clamp(0, 100, saju),
    ziwei: clamp(0, 100, ziwei),
    natal: clamp(0, 100, natal),
    total: clamp(0, 100, total),
    stdDev: Math.round(deviation * 10) / 10,
    dominantVoice: diffs[0].diff < 5 ? 'balanced' : diffs[0].voice,
  };
}

function buildCharacterVoices(data: SamsinData, averages: SystemAverages): TotalReport['characterVoices'] {
  const wuxing = getWuxingProfile(data.wuxing);
  const natal = getNatalSnapshot(data);
  const currentAge = new Date().getFullYear() - data.input.year;
  const ziweiSignal = getStrongZiweiSignal(data);
  const unknownTime = isUnknownTime(data);
  const scoreTone = averages.total >= 65
    ? '전체 흐름은 비교적 밝게 열립니다'
    : averages.total <= 45
      ? '전체 흐름은 서두르기보다 정돈을 요구합니다'
      : '전체 흐름은 과한 확장보다 균형을 요구합니다';

  return {
    cheongwoon: `청운은 먼저 기준을 봅니다. ${data.input.name}님의 중심에는 ${withSubject(getDayEnergy(data))} 함께 놓여 있고, ${wuxing.strongest} 기운이 앞에 서며 ${wuxing.weakest} 기운은 보완점으로 남아 ${currentAge}세 전후에는 ${scoreTone}.`,
    taeeul: unknownTime
      ? '태을은 삶의 자리를 봅니다. 출생시간을 몰라 자미두수의 궁 위치와 대한 흐름은 단정하지 않고, 이번 리포트에서는 확인 가능한 국면과 조심해야 할 해석 범위를 먼저 짚습니다.'
      : `태을은 삶의 자리를 봅니다. 자미두수에서는 ${withSubject(getMingStars(data))} 먼저 보이고, ${ziweiSignal}을 함께 보면 한 번에 결론내기보다 어느 자리에서 힘이 나는지 차분히 확인하는 국면입니다.`,
    luna: unknownTime
      ? `루나는 마음의 속도를 봐요. 태양은 ${natal.sun}, 달은 ${withAsParticle(natal.moon)} 보지만 어센던트와 하우스는 출생시간이 필요해 보류하고, 시간 영향이 적은 심리 리듬만 조심스럽게 참고해요.`
      : `루나는 마음의 속도를 봐요. 태양은 ${natal.sun}, 달은 ${natal.moon}, 상승 별자리는 ${natal.asc}라서 바깥에서는 침착해 보여도 안쪽에서는 안정감과 변화 욕구를 함께 다루는 사람이에요.`,
  };
}

function buildCoreInsight(data: SamsinData, averages: SystemAverages): TotalReport['coreInsight'] {
  const wuxing = getWuxingProfile(data.wuxing);
  const natal = getNatalSnapshot(data);
  const ziweiSignal = getStrongZiweiSignal(data);
  const unknownTime = isUnknownTime(data);
  const alignment = averages.stdDev <= 8
    ? '세 신이 거의 같은 방향을 가리킵니다'
    : averages.stdDev >= 16
      ? averages.dominantVoice === 'balanced'
        ? '세 신의 시선이 서로 다른 결을 보입니다'
        : `${VOICE_KO[averages.dominantVoice]}만 조금 다른 각도에서 이 삶을 봅니다`
      : '두 흐름은 맞고 한 흐름은 조심스럽게 속도를 조절합니다';

  const headline = averages.total <= 45
    ? '정리 뒤 새 흐름'
    : averages.total >= 68
      ? '때가 오면 열린다'
      : '균형이 운을 만든다';

  const body = [
    `${alignment}.`,
    unknownTime
      ? `점수 평균은 사주 ${averages.saju}점, 자미는 출생시간 영향이 커서 중립값 ${averages.ziwei}점, 서양점성 ${averages.natal}점으로 조심스럽게 둡니다.`
      : `점수 평균은 사주 ${averages.saju}점, 자미 ${averages.ziwei}점, 서양점성 ${averages.natal}점으로, 전체는 ${averages.total}점 흐름입니다.`,
    unknownTime
      ? `사주는 ${getDayEnergy(data)}의 조합과 ${wuxing.strongest} 기운의 존재감을 보여 주고, 자미두수의 궁과 대한은 이번 리포트에서 확정 근거로 쓰지 않습니다.`
      : `사주는 ${getDayEnergy(data)}의 조합과 ${wuxing.strongest} 기운의 존재감을 보여 주고, 자미두수는 ${ziweiSignal}을 통해 삶의 무대가 어디서 밝아지는지 말합니다.`,
    unknownTime
      ? `서양점성은 ${natal.sun} 태양, ${natal.moon} 달처럼 시간 영향이 비교적 적은 신호만 참고하고, 어센던트와 하우스는 보류합니다.`
      : `서양점성은 ${natal.sun} 태양, ${natal.moon} 달, ${natal.asc} 어센던트가 만드는 심리 리듬을 더해 같은 시기를 안쪽 동기까지 비추어 줍니다.`,
    averages.total <= 45
      ? '그래서 이 리포트는 큰 결정을 밀어붙이라는 뜻이 아니라, 엔터테인먼트와 자기성찰 관점에서 정리할 것과 남길 것을 구분해 보라는 경향으로 읽는 편이 맞습니다.'
      : '그래서 이 리포트는 결과를 보장하는 정답이 아니라, 엔터테인먼트와 자기성찰 관점에서 어느 시기에 힘이 모이는지 살펴보는 지도에 가깝습니다.',
  ].join(' ');

  return { headline, body };
}

function parseAgeRange(label: string): { startAge: number; endAge: number } {
  const match = label.match(/^(\d+)~(\d+)세$/);
  if (!match) return { startAge: 0, endAge: 0 };
  return { startAge: Number(match[1]), endAge: Number(match[2]) };
}

function combinePeriods(scores: ComputedScores): CombinedPeriod[] {
  const byLabel = new Map<string, {
    money?: ScoredPeriod;
    career?: ScoredPeriod;
  }>();

  for (const period of scores.moneyPeriods) {
    const entry = byLabel.get(period.label) ?? {};
    entry.money = period;
    byLabel.set(period.label, entry);
  }
  for (const period of scores.careerPeriods) {
    const entry = byLabel.get(period.label) ?? {};
    entry.career = period;
    byLabel.set(period.label, entry);
  }

  const combined = [...byLabel.entries()].map(([label, entry]) => {
    const source = entry.money ?? entry.career;
    const range = source
      ? { startAge: source.startAge, endAge: source.endAge }
      : parseAgeRange(label);
    const sourcePeriods = [entry.money, entry.career].filter(
      (period): period is ScoredPeriod => Boolean(period),
    );
    const moneyScore = entry.money?.score;
    const careerScore = entry.career?.score;
    const score = average(sourcePeriods.map(period => period.score));
    const sajuScore = average(sourcePeriods.map(period => period.sajuScore));
    const ziweiScore = average(sourcePeriods.map(period => period.ziweiScore));
    const natalScore = average(sourcePeriods.map(period => period.natalScore));

    return {
      label,
      startAge: range.startAge,
      endAge: range.endAge,
      moneyScore,
      careerScore,
      score: clamp(0, 100, score),
      sajuScore: clamp(0, 100, sajuScore),
      ziweiScore: clamp(0, 100, ziweiScore),
      natalScore: clamp(0, 100, natalScore),
      dominantDomain: (moneyScore ?? 0) > (careerScore ?? 0) ? 'money' as const : 'career' as const,
    };
  });

  return combined.sort((a, b) => a.startAge - b.startAge);
}

function buildMoments(scores: ComputedScores, type: 'peak' | 'hard'): LifeMoment[] {
  const combined = combinePeriods(scores);
  const candidates = combined.length > 0 ? combined : DEFAULT_PERIODS;
  const sorted = [...candidates].sort((a, b) =>
    type === 'peak' ? b.score - a.score : a.score - b.score,
  );

  const selected = sorted.slice(0, 5);
  while (selected.length < 5) {
    const fallback = DEFAULT_PERIODS[selected.length] ?? DEFAULT_PERIODS[0];
    selected.push(fallback);
  }

  return selected.map((period, index) => {
    const dominant = getDominantScore(period);
    const domainText = DOMAIN_KO[period.dominantDomain];
    const isPeak = type === 'peak';
    const title = isPeak
      ? period.score >= 65 ? '흐름이 열리는 때' : '작은 결실의 때'
      : period.score <= 40 ? '정리의 압력이 큰 때' : period.score <= 55 ? '속도 조절의 때' : '비교 점검의 때';
    const hardScoreText = period.score <= 40
      ? `평균 ${period.score}점으로 리듬이 낮아집니다`
      : period.score <= 55
        ? `평균 ${period.score}점으로 리듬이 상대적으로 낮아집니다`
        : `평균 ${period.score}점이지만 상위 구간에 비해 힘이 덜 모입니다`;
    const desc = isPeak
      ? `${period.label}에는 ${domainText}에서 평균 ${period.score}점의 힘이 모입니다. ${VOICE_KO[dominant.voice]} 신호가 가장 커서, 성과를 단정하기보다 눈에 띄는 단서를 차분히 확인하는 시기로 읽습니다.`
      : `${period.label}에는 ${domainText}에서 ${hardScoreText}. ${VOICE_KO[dominant.voice]} 관점이 두드러지므로, 실패 예고가 아니라 덜어내고 다시 배열하는 자기성찰 구간으로 읽습니다.`;

    return {
      rank: index + 1,
      timing: period.label,
      title,
      desc,
    };
  });
}

function buildSamsinMessage(averages: SystemAverages): string {
  if (averages.total >= 70 && averages.stdDev <= 10) return '세 길이 함께 열린다';
  if (averages.total >= 60) return '때를 맞추면 빛난다';
  if (averages.total <= 42) return '비운 뒤 다시 채운다';
  if (averages.stdDev >= 16) return '다른 시선이 길을 만든다';
  return '균형이 가장 큰 운이다';
}

export function generateRuleBasedTotalReport(
  data: SamsinData,
  scores: ComputedScores,
): TotalReport {
  const averages = calculateSystemAverages(scores);
  const { moneyGraph, careerGraph } = buildGraphs(scores);

  return {
    characterVoices: buildCharacterVoices(data, averages),
    coreInsight: buildCoreInsight(data, averages),
    moneyGraph,
    careerGraph,
    peakMoments: buildMoments(scores, 'peak'),
    hardMoments: buildMoments(scores, 'hard'),
    samsinMessage: buildSamsinMessage(averages),
  };
}
