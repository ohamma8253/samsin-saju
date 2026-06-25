import type { SamsinData, WuxingCount } from './saju';
import type { ComputedScores } from './scoring';
import type {
  ChatMessage,
  ChatRequestOptions,
  ChatResponse,
  DeepReport,
  FinalSynthesis,
  ReportContext,
  TotalReport,
} from './claude';
import type { ConsensusMetrics, DominantVoice } from './consensus';
import type { Prescription } from './prescription';
import { generateRuleBasedTotalReport } from './samsin-model';

export type SamsinCharacter = 'cheongwoon' | 'taeeul' | 'luna';

export interface SamsinAgent {
  generateTotalReport(data: SamsinData, scores: ComputedScores): TotalReport;
  generateDeepReport(character: SamsinCharacter, data: SamsinData): DeepReport;
  chat(
    data: SamsinData,
    history: ChatMessage[],
    userMessage: string,
    reportContext?: ReportContext,
    options?: ChatRequestOptions,
  ): ChatResponse;
  generateFinalSynthesis(
    data: SamsinData,
    consensusMetrics?: ConsensusMetrics,
    basePrescription?: Prescription,
  ): FinalSynthesis;
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

const WUXING_KO: Record<keyof WuxingCount, string> = {
  tree: '나무',
  fire: '불',
  earth: '흙',
  metal: '쇠',
  water: '물',
};

const PALACE_KO: Record<string, string> = {
  '命宮': '명궁',
  '命': '명궁',
  '兄弟宮': '형제 궁',
  '兄弟': '형제 궁',
  '夫妻宮': '배우자 궁',
  '夫妻': '배우자 궁',
  '子女宮': '자녀 궁',
  '子女': '자녀 궁',
  '財帛宮': '재물 궁',
  '財帛': '재물 궁',
  '疾厄宮': '몸의 궁',
  '疾厄': '몸의 궁',
  '遷移宮': '이동 궁',
  '遷移': '이동 궁',
  '僕役宮': '동료 궁',
  '僕役': '동료 궁',
  '官祿宮': '일의 궁',
  '官祿': '일의 궁',
  '福德宮': '복덕 궁',
  '福德': '복덕 궁',
  '田宅宮': '터전 궁',
  '田宅': '터전 궁',
  '父母宮': '부모 궁',
  '父母': '부모 궁',
};

const STAR_KO: Record<string, string> = {
  '紫微': '자미', '天機': '천기', '太陽': '태양', '武曲': '무곡',
  '天同': '천동', '廉貞': '염정', '天府': '천부', '太陰': '태음',
  '貪狼': '탐랑', '巨門': '거문', '天相': '천상', '天梁': '천량',
  '七殺': '칠살', '破軍': '파군', '文昌': '문창', '文曲': '문곡',
  '左輔': '좌보', '右弼': '우필', '祿存': '록존',
};

const VOICE_LABEL: Record<DominantVoice, string> = {
  cheongwoon: '청운',
  taeeul: '태을',
  luna: '루나',
  balanced: '세 신',
};

const UNSEONG_KO: Record<string, string> = {
  '長生': '새 힘이 돋는 운성',
  '장생': '새 힘이 돋는 운성',
  '沐浴': '감각이 예민해지는 운성',
  '목욕': '감각이 예민해지는 운성',
  '冠帶': '역할이 갖춰지는 운성',
  '관대': '역할이 갖춰지는 운성',
  '乾祿': '자립해 힘이 붙는 운성',
  '건록': '자립해 힘이 붙는 운성',
  '帝旺': '기운이 가장 강한 운성',
  '제왕': '기운이 가장 강한 운성',
  '衰': '속도를 낮추는 운성',
  '쇠': '속도를 낮추는 운성',
  '病': '무리하지 말아야 하는 운성',
  '병': '무리하지 말아야 하는 운성',
  '死': '낡은 것을 끝내는 운성',
  '사': '낡은 것을 끝내는 운성',
  '墓': '안으로 정리하는 운성',
  '묘': '안으로 정리하는 운성',
  '絶': '기존 흐름을 끊는 운성',
  '절': '기존 흐름을 끊는 운성',
  '胎': '새 가능성이 생기는 운성',
  '태': '새 가능성이 생기는 운성',
  '養': '천천히 기르는 운성',
  '양': '천천히 기르는 운성',
};

const SIPSIN_KO: Record<string, string> = {
  '正財': '안정적인 재물 신호',
  '정재': '안정적인 재물 신호',
  '偏財': '넓게 기회를 찾는 재물 신호',
  '편재': '넓게 기회를 찾는 재물 신호',
  '食神': '꾸준히 생산하는 신호',
  '식신': '꾸준히 생산하는 신호',
  '傷官': '표현과 돌파의 신호',
  '상관': '표현과 돌파의 신호',
  '劫財': '경쟁과 지출을 조심할 신호',
  '겁재': '경쟁과 지출을 조심할 신호',
  '比肩': '자기주장이 강해지는 신호',
  '비견': '자기주장이 강해지는 신호',
  '正官': '책임과 직함의 신호',
  '정관': '책임과 직함의 신호',
  '偏官': '압박 속 돌파의 신호',
  '편관': '압박 속 돌파의 신호',
  '正印': '배움과 보호의 신호',
  '정인': '배움과 보호의 신호',
  '偏印': '독특한 관점과 연구의 신호',
  '편인': '독특한 관점과 연구의 신호',
};

function currentAge(data: SamsinData): number {
  return new Date().getFullYear() - data.input.year;
}

function koStem(stem?: string): string {
  return stem ? STEM_KO[stem] ?? '중심 기운' : '중심 기운';
}

function koBranch(branch?: string): string {
  return branch ? BRANCH_KO[branch] ?? '삶의 바탕' : '삶의 바탕';
}

function koSign(sign?: string): string {
  return sign ? SIGN_KO[sign] ?? sign : '별자리 정보 없음';
}

function koPalace(palace?: string): string {
  if (!palace) return '명반의 한 궁';
  return PALACE_KO[palace] ?? PALACE_KO[`${palace}宮`] ?? '명반의 한 궁';
}

function koStar(star?: string): string {
  return star ? STAR_KO[star] ?? '주요 별' : '주요 별';
}

function dayEnergy(data: SamsinData): string {
  const day = data.saju.pillars[1]?.pillar;
  return `${withAndParticle(koStem(day?.stem))} ${koBranch(day?.branch)}`;
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
  return `${text}${hasFinalConsonant(text) ? '은' : '는'}`;
}

function withAndParticle(text: string): string {
  return `${text}${hasFinalConsonant(text) ? '과' : '와'}`;
}

function withAsParticle(text: string): string {
  return `${text}${hasFinalConsonant(text) ? '으로' : '로'}`;
}

function withSubjectIga(text: string): string {
  return `${text}${hasFinalConsonant(text) ? '이' : '가'}`;
}

function wuxingProfile(wuxing: WuxingCount): {
  strongest: string;
  weakest: string;
  spread: number;
} {
  const sorted = (Object.entries(wuxing) as Array<[keyof WuxingCount, number]>)
    .sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0] ?? ['tree', 0];
  const weakest = sorted[sorted.length - 1] ?? ['water', 0];
  return {
    strongest: WUXING_KO[strongest[0]],
    weakest: WUXING_KO[weakest[0]],
    spread: strongest[1] - weakest[1],
  };
}

function isUnknownTime(data: SamsinData): boolean {
  return data.birthContext?.unknownTime || data.birthContext?.birthTimePrecision === 'unknown';
}

function natalSnapshot(data: SamsinData): {
  sun: string;
  moon: string;
  asc: string;
  venus: string;
  mars: string;
  jupiterHouse: number | undefined;
  saturnHouse: number | undefined;
} {
  const find = (id: string) => data.natal.planets.find(planet => planet.id === id);
  return {
    sun: koSign(find('Sun')?.sign),
    moon: koSign(find('Moon')?.sign),
    asc: isUnknownTime(data) ? '출생시간 미상으로 보류' : koSign(data.natal.angles?.asc?.sign),
    venus: koSign(find('Venus')?.sign),
    mars: koSign(find('Mars')?.sign),
    jupiterHouse: isUnknownTime(data) ? undefined : find('Jupiter')?.house,
    saturnHouse: isUnknownTime(data) ? undefined : find('Saturn')?.house,
  };
}

function palaceStars(data: SamsinData, palaceName: string): string {
  const stars = data.ziwei.palaces?.[palaceName]?.stars ?? [];
  if (stars.length === 0) return '뚜렷한 주성이 적은 조용한 흐름';
  return stars.slice(0, 3).map(star => koStar(star.name)).join(', ');
}

function currentDaewoon(data: SamsinData): string {
  const age = currentAge(data);
  const daewoon = data.saju.daewoon?.find(item => age >= item.age && age <= item.age + 9);
  if (!daewoon) return `${age}세 전후의 큰 흐름은 기본 리듬을 유지합니다`;
  const unseong = UNSEONG_KO[daewoon.unseong] ?? '중간 운성';
  const sipsin = SIPSIN_KO[daewoon.stemSipsin] ?? SIPSIN_KO[daewoon.branchSipsin] ?? '중심 신호';
  return `${daewoon.age}~${daewoon.age + 9}세 흐름에서는 ${unseong}과 ${withSubjectIga(sipsin)} 함께 보입니다`;
}

function currentDaxian(data: SamsinData): string {
  if (isUnknownTime(data)) return '출생시간이 없어 자미두수의 시기 궁 위치는 보류합니다';
  const age = currentAge(data);
  const daxian = data.daxianList.find(item => age >= item.ageStart && age <= item.ageEnd);
  if (!daxian) return `${age}세 전후의 대한은 자료상 뚜렷하게 잡히지 않습니다`;
  const stars = daxian.mainStars.slice(0, 2).map(koStar).join(', ') || '주요 별';
  return `${daxian.ageStart}~${daxian.ageEnd}세 대한이 ${koPalace(daxian.palaceName)}에서 ${stars} 흐름을 엽니다`;
}

function scoreTone(metrics?: ConsensusMetrics): string {
  if (!metrics) return '세 신은 아직 중간 정도의 합의로 이 흐름을 봅니다';
  if (metrics.level === 'unanimous') return `세 신이 ${metrics.alignmentScore}점 합의로 같은 방향을 봅니다`;
  if (metrics.level === 'conflict') return `세 신의 합의가 ${metrics.alignmentScore}점이라 관점 차이를 함께 봐야 합니다`;
  return `세 신은 ${metrics.alignmentScore}점 합의로 큰 방향에는 동의합니다`;
}

function decisionBoundary(message?: string): string {
  if (message && /투자|주식|코인|부동산|건강|질병|병원|수술|법률|소송|계약/.test(message)) {
    return '실제 의료, 투자, 법률 판단은 이 내용이 아니라 전문가와 현실 정보를 기준으로 확인해야 합니다.';
  }
  return '이 답은 결과를 보장하는 정답이 아니라 자기성찰용 경향으로 참고해 주세요.';
}

function buildQuestionFocus(message: string): 'money' | 'career' | 'love' | 'timing' | 'general' {
  if (/돈|금전|재물|투자|사업|수입|연봉|매출|프리랜서/.test(message)) return 'money';
  if (/일|업무|직업|커리어|이직|퇴사|회사|진로|책임|프로젝트/.test(message)) return 'career';
  if (/연애|결혼|궁합|관계|사랑|배우자/.test(message)) return 'love';
  if (/언제|시기|올해|내년|타이밍|나이/.test(message)) return 'timing';
  return 'general';
}

type QuestionFocus = ReturnType<typeof buildQuestionFocus>;

function contextHint(reportContext?: ReportContext): string {
  const decision = reportContext?.decisionContext;
  if (decision) {
    const now = decision.nowActions[0] ? ` 지금 할 일은 "${decision.nowActions[0]}"입니다.` : '';
    const avoid = decision.avoidActions[0] ? ` 피할 일은 "${decision.avoidActions[0]}"입니다.` : '';
    const grounding = decision.claimGrounding?.slice(0, 2).map(claim => claim.summary).join(' / ') ?? '';
    const claimLine = grounding ? ` 근거 claim은 "${grounding}"입니다.` : '';
    return `의사결정 리포트에서는 "${decision.headline}" 흐름을 먼저 보고, "${decision.mainStrategy}"를 기준으로 잡았습니다.${claimLine}${now}${avoid} `;
  }
  const total = reportContext?.totalReport;
  if (!total) return '';
  return `총운에서는 "${total.coreInsightHeadline}" 흐름과 "${total.samsinMessage}" 메시지가 먼저 잡혔습니다. `;
}

function decisionContextSupportsQuestion(
  decisionContext: NonNullable<ReportContext['decisionContext']>,
  focus: QuestionFocus,
): boolean {
  if (focus === 'general') return true;
  const contextText = [
    decisionContext.headline,
    decisionContext.diagnosis,
    decisionContext.mainStrategy,
    decisionContext.caution,
    ...decisionContext.convergence,
    ...decisionContext.divergence,
    ...decisionContext.nowActions,
    ...decisionContext.avoidActions,
    ...decisionContext.claimRefs,
  ].join(' ').toLowerCase();
  const source = contextText;
  const keywordMap: Record<QuestionFocus, RegExp> = {
    money: /돈|금전|재물|투자|사업|수입|연봉|매출|프리랜서|cashflow|income|asset|money/,
    career: /일|업무|직업|커리어|이직|퇴사|회사|진로|책임|프로젝트|job|career|role|public_authority/,
    love: /연애|결혼|궁합|관계|사랑|배우자|relationship/,
    timing: /언제|시기|올해|내년|타이밍|나이|timing|3_months|6_12_months/,
    general: /./,
  };
  return keywordMap[focus].test(source);
}

function decisionGroundingLine(
  decisionContext: NonNullable<ReportContext['decisionContext']> | undefined,
): string {
  if (!decisionContext) return '';
  const claimGrounding = decisionContext.claimGrounding?.slice(0, 2).map(claim => claim.summary) ?? [];
  const firstClaim = claimGrounding[0] ?? decisionContext.convergence[0] ?? decisionContext.diagnosis;
  const secondClaim = claimGrounding[1] ?? decisionContext.divergence[0] ?? '';
  const action = decisionContext.nowActions[0] ?? decisionContext.mainStrategy;
  const avoid = decisionContext.avoidActions[0] ?? decisionContext.caution;
  const second = secondClaim ? ` 여기에 "${secondClaim}"도 함께 봅니다.` : '';
  return `리포트 근거부터 보면 "${firstClaim}"입니다.${second} 그래서 지금 기준은 "${action}"이고, 피할 기준은 "${avoid}"입니다. `;
}

function buildDeepCheongwoon(data: SamsinData): DeepReport {
  const wuxing = wuxingProfile(data.wuxing);
  return {
    character: 'cheongwoon',
    sections: [
      {
        title: '타고난 기질의 핵심',
        content: `${data.input.name}님의 일간 중심은 ${dayEnergy(data)}입니다. 겉으로는 단단한 기준을 세우려 하고, 안쪽에서는 현실의 토대를 확인한 뒤 움직이려는 성향이 강합니다. 이 조합은 빠른 반응보다 오래 남는 선택에 힘이 실리는 구조입니다.`,
      },
      {
        title: '이 사주의 힘과 약점',
        content: `${wuxing.strongest} 기운이 가장 앞에 있고 ${wuxing.weakest} 기운이 보완점입니다. 차이가 ${wuxing.spread}칸 벌어져 있어, 강한 기운을 더 밀기보다 부족한 결을 의식적으로 보충할 때 균형이 좋아집니다. 한쪽으로 몰릴수록 판단이 단단해지는 대신 유연성이 줄어들 수 있습니다.`,
      },
      {
        title: '지금 이 시기의 큰 흐름',
        content: `${currentDaewoon(data)}. 지금은 결과를 억지로 확정하기보다 반복되는 패턴을 확인하고, 남길 것과 정리할 것을 나누는 쪽이 실속 있습니다. 이 해석은 자기성찰용 경향이지 실제 결정을 대신하지 않습니다.`,
      },
      {
        title: '타고난 재능과 직업의 방향',
        content: `${wuxing.strongest} 기운이 강한 사람은 자신만의 기준과 처리 방식을 만들 때 힘이 살아납니다. 분석, 운영, 기획, 구조화처럼 흐트러진 것을 정돈하는 일에 강점이 생깁니다. 다만 혼자 끌어안는 방식이 길어지면 속도가 둔해지니 협업의 리듬을 의식해야 합니다.`,
      },
      {
        title: '청운의 당부',
        content: `크게 얻으려면 먼저 기준을 세워야 합니다. ${wuxing.weakest} 기운을 보충한다는 마음으로, 부족한 영역을 피하지 말고 작게라도 반복하십시오. 운은 한 번의 사건보다 오래 유지되는 태도에서 열립니다.`,
      },
    ],
  };
}

function buildDeepTaeeul(data: SamsinData): DeepReport {
  if (isUnknownTime(data)) {
    return {
      character: 'taeeul',
      sections: [
        {
          title: '출생시간 미상에서 보는 방식',
          content: '자미두수는 출생시간에 따라 세부 자리가 크게 달라집니다. 그래서 이번 리포트에서는 특정 궁 위치나 시기 흐름을 확정하지 않고, 확인 가능한 자료와 해석의 한계를 먼저 분리해 봅니다.',
        },
        {
          title: '보류해야 할 세부 해석',
          content: '명반의 자리 배치, 큰 시기 흐름, 특정 생활 영역의 별 배치는 지금 정보만으로 단정하지 않습니다. 이 부분은 맞고 틀림의 문제가 아니라 입력 정보의 정밀도 문제입니다.',
        },
        {
          title: '그래도 참고할 수 있는 방향',
          content: '태을의 관점에서는 빠른 결론보다 조심해야 할 해석 범위를 아는 것이 먼저입니다. 지금은 사건을 예언하기보다, 사주와 시간 영향이 적은 별자리 신호에서 반복되는 태도와 선택 습관을 함께 보는 편이 안정적입니다.',
        },
        {
          title: '관계와 일의 읽는 범위',
          content: '관계나 일의 결론을 자미두수만으로 지시하지 않습니다. 대신 어떤 상황에서 조급해지고, 어떤 기준을 확인해야 마음이 안정되는지처럼 현실에서 점검 가능한 질문으로 바꿔 보는 것이 좋습니다.',
        },
        {
          title: '태을의 당부',
          content: '하늘의 표가 비어 있을 때는 비어 있음을 인정하는 것이 지혜입니다. 모르는 자리를 억지로 채우지 말고, 확인된 근거 안에서 천천히 판단하셔야 합니다.',
        },
      ],
    };
  }

  const moneyStars = palaceStars(data, '財帛');
  const careerStars = palaceStars(data, '官祿');
  const spouseStars = palaceStars(data, '夫妻');

  return {
    character: 'taeeul',
    sections: [
      {
        title: '나를 드러내는 방식',
        content: `자미두수의 중심 자리에는 ${palaceStars(data, '命宮')} 흐름이 먼저 보입니다. 이는 첫인상과 자기표현이 한 가지 모습으로만 고정되기보다, 필요할 때 방식을 바꾸며 드러난다는 뜻입니다. 안정과 변화를 함께 다루는 연습이 중요합니다.`,
      },
      {
        title: '돈과 일의 흐름',
        content: `돈의 흐름에서는 ${moneyStars}, 일의 흐름에서는 ${careerStars} 신호가 먼저 보입니다. 돈은 한 번에 움켜쥐는 방식보다 흐름을 읽고 배치하는 쪽에서 힘을 얻고, 일은 이름보다 실제 맡는 역할이 분명할 때 안정됩니다.`,
      },
      {
        title: '관계에서 반복되는 패턴',
        content: `관계의 흐름에서는 ${spouseStars} 신호가 먼저 보입니다. 인연은 감정의 속도보다 서로의 생활 리듬을 맞출 때 오래 갑니다. 관계를 점술로 단정하기보다 반복되는 소통 패턴을 비추는 거울로 보는 편이 좋습니다.`,
      },
      {
        title: '큰 운의 흐름과 지금 이 시기',
        content: `${currentDaxian(data)}. 이 시기에는 내가 어느 자리에서 힘을 쓰는지 확인하는 것이 중요합니다. 빠른 결론보다 역할과 책임의 변화를 차분히 보는 편이 좋습니다.`,
      },
      {
        title: '태을의 당부',
        content: '자미두수는 결과를 약속하기보다 지금 어떤 역할을 조심해서 봐야 하는지 알려주는 참고 지도에 가깝습니다. 잘 맞는 자리에서는 움직이고, 소모가 큰 자리에서는 힘을 아끼는 식으로 리듬을 조정해 보세요.',
      },
    ],
  };
}

function buildDeepLuna(data: SamsinData): DeepReport {
  const natal = natalSnapshot(data);
  if (isUnknownTime(data)) {
    return {
      character: 'luna',
      sections: [
        {
          title: '태양과 달이 만드는 기본 리듬',
          content: `${data.input.name}님의 태양은 ${natal.sun}, 달은 ${withAsParticle(natal.moon)} 봅니다. 출생시간을 몰라 바깥에 드러나는 모습과 생활 영역 배치는 보류하고, 시간 영향이 비교적 적은 심리 리듬만 조심스럽게 참고해요.`,
        },
        {
          title: '금성과 화성: 욕망과 에너지',
          content: `금성은 ${natal.venus}, 화성은 ${natal.mars} 신호로 읽힙니다. 좋아하는 것과 밀고 나가는 방식이 서로 다른 속도를 가질 수 있어요. 다만 세부 생활 영역보다 마음이 끌리는 방향과 행동 속도의 차이를 중심으로 봅니다.`,
        },
        {
          title: '성장과 책임의 축',
          content: '출생시간이 필요한 자리 해석은 보류합니다. 대신 성장과 책임은 행운을 맞히는 말보다, 반복되는 약속을 어떻게 지키고 회복하는지에 가까운 주제로 읽는 편이 안전해요.',
        },
        {
          title: `${new Date().getFullYear()}년 행성이 보내는 신호`,
          content: '올해는 이미 가진 패턴을 다시 확인하는 해로 읽을 수 있어요. 마음이 급할수록 큰 결론보다 작은 습관을 먼저 바꾸는 편이 좋아요. 별은 결과를 대신 정해 주지 않지만, 지금 어디에 에너지가 새는지 보여 줄 수 있어요.',
        },
        {
          title: '루나의 당부',
          content: '모르는 시간은 상상으로 채우지 않을게요. 지금은 정확히 말할 수 있는 것만 남기고, 나머지는 현실의 경험과 기록으로 천천히 확인하는 쪽이 더 나아요.',
        },
      ],
    };
  }

  return {
    character: 'luna',
    sections: [
      {
        title: '태양·달·상승 별자리가 만드는 자아',
        content: `${data.input.name}님의 태양은 ${natal.sun}, 달은 ${natal.moon}, 상승 별자리는 ${natal.asc}예요. 겉으로 보이는 모습과 안쪽 욕구가 완전히 같지는 않아서, 안정감을 원하면서도 성장의 자극을 계속 찾는 사람이에요. 이 긴장을 잘 다루면 자기만의 리듬이 분명해져요.`,
      },
      {
        title: '금성과 화성: 욕망과 에너지',
        content: `금성은 ${natal.venus}, 화성은 ${natal.mars} 신호로 읽힙니다. 좋아하는 것과 밀고 나가는 방식이 서로 다른 속도를 가질 수 있어요. 마음이 끌리는 방향과 실제 행동의 속도를 맞추는 연습이 관계와 일 모두에서 중요해요.`,
      },
      {
        title: '목성과 토성: 성장과 시련의 축',
        content: `목성은 ${natal.jupiterHouse ?? '?'}하우스, 토성은 ${natal.saturnHouse ?? '?'}하우스 흐름으로 잡힙니다. 목성은 넓어지는 자리, 토성은 책임을 배우는 자리예요. 성장은 행운만으로 오기보다 반복되는 책임을 견디며 더 단단해지는 쪽에 가까워요.`,
      },
      {
        title: `${new Date().getFullYear()}년 행성이 보내는 신호`,
        content: `올해는 이미 가진 패턴을 다시 확인하는 해로 읽을 수 있어요. 마음이 급할수록 큰 결론보다 작은 습관을 먼저 바꾸는 편이 좋아요. 별은 결과를 대신 정해 주지 않지만, 지금 어디에 에너지가 새는지 보여 줄 수 있어요.`,
      },
      {
        title: '루나의 당부',
        content: `당신은 스스로를 몰아붙일 때보다 내면의 속도를 존중할 때 더 오래 갑니다. 불안한 마음을 정해진 결과로 단정하지 말고, 지금 필요한 욕구가 무엇인지 묻는 신호로 봐 주세요. 선택은 언제나 현실의 정보와 당신의 책임 안에서 해야 해요.`,
      },
    ],
  };
}

function buildChatResponse(
  data: SamsinData,
  history: ChatMessage[],
  userMessage: string,
  reportContext?: ReportContext,
  options?: ChatRequestOptions,
): ChatResponse {
  const focus = buildQuestionFocus(userMessage);
  const wuxing = wuxingProfile(data.wuxing);
  const natal = natalSnapshot(data);
  const hint = contextHint(reportContext);
  const historyHint = history.length > 0 ? '앞선 대화의 흐름도 함께 이어서 보겠습니다. ' : '';
  const questionMode = options?.questionMode ?? 'trinity';
  const selectedDeity = options?.selectedDeity ?? 'cheongwoon';
  const unknownTime = isUnknownTime(data);
  const decisionContext = reportContext?.decisionContext;
  const groundingLine = decisionGroundingLine(decisionContext);
  const holdSentence = decisionContext && !decisionContextSupportsQuestion(decisionContext, focus)
    ? ' 현재 리포트 근거로는 보류하겠습니다. 이 질문은 새 조언으로 확장하기보다 저장된 claim과 actionPlan 범위 안에서만 다시 확인해 주세요.'
    : '';

  const focusLine: Record<typeof focus, string> = {
    money: `금전 질문은 수익을 맞히는 문제보다 ${wuxing.strongest} 기운을 현실적인 지출, 축적, 선택 기준으로 바꾸는지가 핵심입니다. `,
    career: `일의 문제는 역할과 기준을 어떻게 세우는지가 핵심입니다. `,
    love: `관계의 문제는 감정의 속도보다 반복되는 소통 리듬을 보는 것이 핵심입니다. `,
    timing: `${currentDaewoon(data)}. `,
    general: `질문의 중심은 지금 삶의 균형을 어디서 다시 잡을지에 있습니다. `,
  };

  const base: Required<ChatResponse> = {
    cheongwoon: `청운은 먼저 기준을 세웁니다. ${groundingLine}사주에서 ${data.input.name}님의 바탕은 ${dayEnergy(data)}으로 보입니다. ${historyHint}${hint}${focusLine[focus]}지금은 한 번에 결론을 내리기보다, 강한 ${wuxing.strongest} 기운을 기준으로 삼고 부족한 ${wuxing.weakest} 기운을 보완해야 합니다. ${decisionBoundary(userMessage)}${holdSentence}`,
    taeeul: unknownTime
      ? `태을은 삶의 자리를 봅니다. ${groundingLine}출생시간이 필요한 자미두수 세부 자리는 보류합니다. ${historyHint}${hint}${focus === 'money' ? '돈의 문제는 얻는 법보다 재물의 자리와 맡은 역할이 어디서 섞이는지 볼 때 선명해집니다.' : focus === 'career' ? '일의 문제는 이름보다 맡는 자리의 무게와 지속 가능성을 보라고 말합니다.' : focus === 'love' ? '관계의 문제는 감정보다 서로에게 기대하는 자리와 역할이 어긋나는지를 보는 편이 맞습니다.' : '이 질문은 조급히 단정하기보다 확인 가능한 국면으로 보는 편이 맞습니다.'} 지금 필요한 것은 확답보다 어디에 힘을 쓰고 어디서 쉬어야 하는지 나누는 일입니다.${holdSentence}`
      : `태을은 ${currentDaxian(data)}. ${groundingLine}${historyHint}${hint}${focus === 'money' ? '재물 궁의 흐름은 얻는 법보다 새는 곳과 맡은 역할이 어디서 겹치는지 확인할 때 선명해집니다.' : focus === 'career' ? '일의 궁은 이름보다 맡는 자리의 무게를 보라고 말합니다.' : focus === 'love' ? '관계의 궁은 감정 결론보다 서로의 자리와 기대가 어긋나는 국면을 먼저 보라고 말합니다.' : '이 질문은 조급히 단정하기보다 흐름의 변화와 삶의 자리로 보는 편이 맞습니다.'} 지금 필요한 것은 확답보다 어디에 힘을 쓰고 어디서 쉬어야 하는지 나누는 일입니다.${holdSentence}`,
    luna: unknownTime
      ? `루나는 마음의 속도를 봐요. ${groundingLine}태양 ${natal.sun}, 달 ${natal.moon}의 조합이 이 질문을 안정감과 성장 욕구 사이에서 보게 해요. ${historyHint}${hint}출생시간이 필요한 바깥 모습과 생활 영역은 보류하고, 시간 영향이 적은 심리 리듬만 참고할게요. ${focus === 'love' ? '관계에서는 상대가 맞는지보다 내가 어떤 방식으로 안심하고 가까워지는지를 먼저 봐야 해요.' : focus === 'career' ? '커리어에서는 성과보다 내가 오래 버틸 수 있는 환경인지가 중요해요.' : '지금 떠오른 불안은 나쁜 신호라기보다 조정이 필요하다는 알림일 수 있어요.'} 현실 결정은 충분한 정보와 책임 안에서 천천히 확인해 주세요.${holdSentence}`
      : `루나는 마음의 속도를 봐요. ${groundingLine}태양 ${natal.sun}, 달 ${natal.moon}, 상승 별자리 ${natal.asc}의 조합이 이 질문을 안정감과 성장 욕구 사이에서 보게 해요. ${historyHint}${hint}${focus === 'love' ? '관계에서는 상대가 맞는지보다 내가 어떤 방식으로 안심하고 가까워지는지를 먼저 봐야 해요.' : focus === 'career' ? '커리어에서는 성과보다 내가 오래 버틸 수 있는 환경인지가 중요해요.' : '지금 떠오른 불안은 나쁜 신호라기보다 조정이 필요하다는 알림일 수 있어요.'} 현실 결정은 충분한 정보와 책임 안에서 천천히 확인해 주세요.${holdSentence}`,
  };

  if (questionMode === 'single_deity') {
    return { [selectedDeity]: base[selectedDeity] };
  }

  if (questionMode === 'deep_session') {
    return {
      cheongwoon: `${base.cheongwoon} 한 단계 더 이어 보면, 지금 질문은 단일 사건보다 반복되는 선택 패턴을 고치는 문제입니다. 오늘은 한 가지 기준만 정하고 그 기준을 어기는 선택은 미루는 편이 안전합니다.`,
      taeeul: `${base.taeeul} 조금 더 깊게 볼수록 결론보다 순서를 먼저 봐야 합니다. 먼저 지켜야 할 자리, 다음에 움직일 자리, 마지막에 내려놓을 자리를 나누면 부담이 줄어듭니다.`,
      luna: `${base.luna} 조금 더 들여다보면 이 질문은 불안을 없애는 문제가 아니라 불안 속에서도 내가 지킬 리듬을 만드는 문제예요. 답을 급히 확정하기보다 몸과 일정에서 바로 바꿀 수 있는 작은 약속부터 잡아 주세요.`,
    };
  }

  return base;
}

function consensusNote(metrics?: ConsensusMetrics): string {
  if (!metrics) return '세 신은 큰 방향을 함께 보되 세부 해석은 중간 합의로 남깁니다.';
  if (metrics.level === 'unanimous') return '세 신 모두 같은 방향을 가리킵니다.';
  if (metrics.level === 'conflict') return `${VOICE_LABEL[metrics.dominantVoice]}의 관점이 특히 달라, 세 시선을 나란히 봐야 합니다.`;
  if (metrics.dominantVoice === 'balanced') return '세 신은 큰 방향에는 동의하고 세부 속도만 다르게 봅니다.';
  return `${VOICE_LABEL[metrics.dominantVoice]}의 관점이 조금 다르지만, 큰 방향은 함께 잡힙니다.`;
}

function synthesisDissent(metrics?: ConsensusMetrics): FinalSynthesis['dissent'] | undefined {
  if (!metrics || metrics.level === 'unanimous' || metrics.dominantVoice === 'balanced') return undefined;
  return {
    voice: metrics.dominantVoice,
    argument: `${VOICE_LABEL[metrics.dominantVoice]}은 다른 두 신보다 이 흐름을 더 조심스럽게 봅니다. 그래서 확장보다 속도 조절과 현실 확인을 먼저 두자는 다른 의견을 냅니다.`,
  };
}

function removeHanja(text: string): string {
  return text
    .replace(/[一-龯]/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function sanitizePrescription(prescription: Prescription): Prescription {
  return {
    luckyColor: {
      ...prescription.luckyColor,
      reason: removeHanja(prescription.luckyColor.reason),
    },
    luckyDirection: {
      ...prescription.luckyDirection,
      reason: removeHanja(prescription.luckyDirection.reason),
    },
    luckyNumber: {
      ...prescription.luckyNumber,
      reason: removeHanja(prescription.luckyNumber.reason),
    },
    talisman: removeHanja(prescription.talisman),
    avoidance: removeHanja(prescription.avoidance),
  };
}

function buildFinalSynthesis(
  data: SamsinData,
  consensusMetrics?: ConsensusMetrics,
  basePrescription?: Prescription,
): FinalSynthesis {
  const wuxing = wuxingProfile(data.wuxing);
  const natal = natalSnapshot(data);
  const unknownTime = isUnknownTime(data);
  const fallbackPrescription: Prescription = sanitizePrescription(basePrescription ?? {
    luckyColor: {
      name: '금빛',
      hex: '#c9a84c',
      reason: '전체 흐름이 중간권일 때 기준을 세우는 색으로 사용합니다.',
    },
    luckyDirection: {
      name: '중앙',
      reason: '지금은 멀리 뻗기보다 중심을 다시 잡는 방향이 어울립니다.',
    },
    luckyNumber: {
      value: 5,
      reason: '균형을 상징하는 숫자로, 선택 전에 한 번 더 점검하라는 뜻입니다.',
    },
    talisman: '흔들릴수록 다시 기준으로 돌아오면 중심이 잡힙니다.',
    avoidance: '확인하지 않은 확신과 즉흥적인 큰 결정은 잠시 늦춰보세요.',
  });

  return {
    verdict: `${scoreTone(consensusMetrics)}. ${data.input.name}님의 핵심은 ${dayEnergy(data)}의 기준감과 ${wuxing.strongest} 기운의 추진력을 현실 속에서 균형 있게 쓰는 데 있습니다. 이 정리는 결과를 보장하는 정답이 아니라, 사주와 명반과 별자리가 함께 비추는 자기성찰용 지도입니다.`,
    consensusLevel: consensusMetrics?.level ?? 'majority',
    consensusNote: consensusNote(consensusMetrics),
    pillars: [
      {
        icon: '🌿',
        title: '기준을 세우는 힘',
        body: `${withSubject(dayEnergy(data))} 쉽게 흔들리기보다 자기 기준을 만들 때 강해지는 구조입니다. 기준이 선명해질수록 선택의 피로가 줄어듭니다. 다만 기준이 고집으로 굳지 않게 현실 피드백을 함께 봐야 합니다.`,
      },
      {
        icon: '☁️',
        title: unknownTime ? '보류할 것은 보류하는 힘' : '무대가 바뀌는 운',
        body: unknownTime
          ? '출생시간이 필요한 명반의 세부 자리는 이번 정리에서 단정하지 않습니다. 모르는 정보를 억지로 채우기보다, 확인 가능한 패턴만 남길 때 해석의 신뢰가 올라갑니다.'
          : `${currentDaxian(data)}. 자미두수는 힘이 나는 자리가 계속 같지만은 않다고 봅니다. 역할이 바뀔 때 겁내기보다, 어떤 환경에서 내가 더 안정적으로 움직이는지 관찰해야 합니다.`,
      },
      {
        icon: '✦',
        title: '안쪽 리듬의 회복',
        body: unknownTime
          ? `태양 ${natal.sun}, 달 ${natal.moon}의 조합은 내면의 속도와 감정 반응을 조심스럽게 보여줘요. 출생시간이 필요한 바깥 역할 해석은 보류하고, 마음이 급할수록 몸과 생활 리듬을 먼저 회복해야 합니다.`
          : `태양 ${natal.sun}, 달 ${natal.moon}, 상승 별자리 ${natal.asc}의 조합은 내면의 속도와 바깥 역할을 함께 조율하라 말해요. 마음이 급할수록 몸과 생활 리듬을 먼저 회복해야 합니다. 오래 가는 운은 오래 버틸 수 있는 리듬에서 옵니다.`,
      },
    ],
    nowAdvice: `${currentAge(data)}세 전후에는 ${currentDaewoon(data)}. 지금은 큰 선언보다 작은 반복을 고치는 쪽이 더 실속 있습니다. 강한 ${wuxing.strongest} 기운은 살리고 부족한 ${wuxing.weakest} 기운은 생활 속에서 보충하세요. ${decisionBoundary()}`,
    prescription: fallbackPrescription,
    voices: {
      cheongwoon: `강한 기운을 더 키우기보다 부족한 기운을 보완해야 합니다. 기준을 세우고, 그 기준을 매일의 행동으로 증명하십시오.`,
      taeeul: '자미두수 관점에서는 때와 역할을 함께 보는 것이 중요합니다. 힘이 나는 자리에서는 움직이고, 소모가 큰 자리에서는 힘을 아끼세요.',
      luna: `당신의 별은 스스로를 몰아붙이는 방식보다 오래 지속되는 리듬을 원해요. 불안할수록 큰 결론 대신 작은 확인부터 해 주세요.`,
    },
    seal: consensusMetrics?.level === 'conflict'
      ? '세 길을 함께 보라'
      : consensusMetrics?.level === 'unanimous'
        ? '한 길이 밝아진다'
        : '균형이 문을 연다',
    dissent: synthesisDissent(consensusMetrics),
  };
}

export const samsinAgent: SamsinAgent = {
  generateTotalReport: generateRuleBasedTotalReport,
  generateDeepReport(character, data) {
    if (character === 'cheongwoon') return buildDeepCheongwoon(data);
    if (character === 'taeeul') return buildDeepTaeeul(data);
    return buildDeepLuna(data);
  },
  chat: buildChatResponse,
  generateFinalSynthesis: buildFinalSynthesis,
};
