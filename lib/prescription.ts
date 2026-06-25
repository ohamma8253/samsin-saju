// ─── 오행 기반 생활 제안 규칙 ───────────────────────────────────────
export type WuxingElement = 'tree' | 'fire' | 'earth' | 'metal' | 'water';

interface WuxingRule {
  color: { name: string; hex: string };
  direction: string;
  numbers: number[];
  talisman: string;
  avoidance: string;
}

const WUXING_PRESCRIPTION: Record<WuxingElement, WuxingRule> = {
  tree: {
    color: { name: '초록/청록', hex: '#4ca87d' },
    direction: '동쪽',
    numbers: [3, 8],
    talisman: '새싹이 돋듯, 멈춘 일도 작은 반복에서 다시 자라기 시작합니다.',
    avoidance: '서쪽 자리나 흰색/은색이 과하게 느껴지는 환경은 오늘만 조금 덜어보세요.',
  },
  fire: {
    color: { name: '빨강/분홍', hex: '#e05252' },
    direction: '남쪽',
    numbers: [2, 7],
    talisman: '꺼진 열정은 큰 결심보다 오늘의 작은 시작에서 다시 살아납니다.',
    avoidance: '북쪽 자리나 검정/파랑이 과하게 느껴지는 환경은 오늘만 조금 덜어보세요.',
  },
  earth: {
    color: { name: '노랑/갈색', hex: '#c9a84c' },
    direction: '중앙',
    numbers: [5, 10],
    talisman: '흔들리는 일도 기준을 하나 세우면 조금씩 뿌리내립니다.',
    avoidance: '동쪽 자리나 초록색이 과하게 느껴지는 환경은 오늘만 조금 덜어보세요.',
  },
  metal: {
    color: { name: '흰색/은색', hex: '#a8b4c8' },
    direction: '서쪽',
    numbers: [4, 9],
    talisman: '흐릿한 일은 기준을 세우는 순간 조금씩 선명해집니다.',
    avoidance: '남쪽 자리나 빨강이 과하게 느껴지는 환경은 오늘만 조금 덜어보세요.',
  },
  water: {
    color: { name: '검정/파랑', hex: '#5b8ee6' },
    direction: '북쪽',
    numbers: [1, 6],
    talisman: '막힌 일은 억지로 밀기보다 흐를 길을 만들 때 풀리기 시작합니다.',
    avoidance: '중앙 자리나 노랑/갈색이 과하게 느껴지는 환경은 오늘만 조금 덜어보세요.',
  },
};

// 상생 순서: 목→화→토→금→수→목
const WUXING_ORDER: WuxingElement[] = ['tree', 'fire', 'earth', 'metal', 'water'];

const WUXING_LABEL: Record<WuxingElement, string> = {
  tree: '나무(木)', fire: '불(火)', earth: '흙(土)', metal: '쇠(金)', water: '물(水)',
};

export interface Prescription {
  luckyColor:     { name: string; hex: string; reason: string };
  luckyDirection: { name: string; reason: string };
  luckyNumber:    { value: number; reason: string };
  talisman: string;
  avoidance: string;
}

// ─── 부족한 오행 찾기 + 생활 제안 산출 ─────────────────────────────
export function calculateBasePrescription(
  wuxing: { tree: number; fire: number; earth: number; metal: number; water: number },
): Prescription {
  // 가장 부족한 오행 찾기
  let weakest: WuxingElement = 'tree';
  let minVal = Infinity;
  for (const el of WUXING_ORDER) {
    const val = wuxing[el] ?? 0;
    if (val < minVal) {
      minVal = val;
      weakest = el;
    }
  }

  const rule = WUXING_PRESCRIPTION[weakest];
  const label = WUXING_LABEL[weakest];

  return {
    luckyColor: {
      name: rule.color.name,
      hex: rule.color.hex,
      reason: `${label} 기운이 가장 부족해서, 오늘 가볍게 보충해 볼 색이에요.`,
    },
    luckyDirection: {
      name: rule.direction,
      reason: `${label} 기운을 떠올리기 쉬운 방향이에요. 자리나 동선을 정할 때 가볍게 참고해보세요.`,
    },
    luckyNumber: {
      value: rule.numbers[0],
      reason: `${label}에 연결해 볼 수 있는 숫자예요. 선택 전에 한 번 쉬어가는 표시로 써보세요.`,
    },
    talisman: rule.talisman,
    avoidance: rule.avoidance,
  };
}
