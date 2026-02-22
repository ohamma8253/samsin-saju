// ─── 오행 기반 처방전 규칙 ──────────────────────────────────────────
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
    talisman: '나무의 기운을 품은 부적 — 새싹이 돋듯, 멈춘 것들이 다시 자라기 시작합니다.',
    avoidance: '금속 기운이 강한 곳(서쪽, 흰색/은색 과다)은 기운을 꺾을 수 있으니 줄이세요.',
  },
  fire: {
    color: { name: '빨강/분홍', hex: '#e05252' },
    direction: '남쪽',
    numbers: [2, 7],
    talisman: '불의 기운을 품은 부적 — 꺼진 열정에 다시 불을 지핍니다.',
    avoidance: '물 기운이 강한 곳(북쪽, 검정/파랑 과다)은 열기를 식힐 수 있으니 줄이세요.',
  },
  earth: {
    color: { name: '노랑/갈색', hex: '#c9a84c' },
    direction: '중앙',
    numbers: [5, 10],
    talisman: '땅의 기운을 품은 부적 — 흔들리는 것들이 단단하게 뿌리내립니다.',
    avoidance: '나무 기운이 강한 곳(동쪽, 초록 과다)은 흙을 파헤칠 수 있으니 줄이세요.',
  },
  metal: {
    color: { name: '흰색/은색', hex: '#a8b4c8' },
    direction: '서쪽',
    numbers: [4, 9],
    talisman: '금속의 기운을 품은 부적 — 흐릿한 것들이 선명하게 깎여 나갑니다.',
    avoidance: '불 기운이 강한 곳(남쪽, 빨강 과다)은 금속을 녹일 수 있으니 줄이세요.',
  },
  water: {
    color: { name: '검정/파랑', hex: '#5b8ee6' },
    direction: '북쪽',
    numbers: [1, 6],
    talisman: '물의 기운을 품은 부적 — 막힌 것들이 물처럼 흘러가기 시작합니다.',
    avoidance: '흙 기운이 강한 곳(중앙, 노랑/갈색 과다)은 물을 가둘 수 있으니 줄이세요.',
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

// ─── 부족한 오행 찾기 + 처방 산출 ──────────────────────────────────
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
      reason: `${label} 기운이 가장 부족하여, 이를 보충하는 색상입니다.`,
    },
    luckyDirection: {
      name: rule.direction,
      reason: `${label} 기운이 모이는 방향입니다. 중요한 결정이나 이동 시 참고하세요.`,
    },
    luckyNumber: {
      value: rule.numbers[0],
      reason: `${label}에 속하는 숫자입니다. 선택의 순간에 이 숫자를 떠올리세요.`,
    },
    talisman: rule.talisman,
    avoidance: rule.avoidance,
  };
}
