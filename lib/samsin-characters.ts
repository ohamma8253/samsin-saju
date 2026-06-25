export type SamsinCharacterKey = 'cheongwoon' | 'taeeul' | 'luna';

export const SAMSIN_CHARACTER_IMAGE_BY_KEY: Record<SamsinCharacterKey, string> = {
  cheongwoon: '/characters/samsin-cheongwoon.svg',
  taeeul: '/characters/samsin-taeeul.svg',
  luna: '/characters/samsin-luna.svg',
};

export interface SamsinCharacterProfile {
  key: SamsinCharacterKey;
  name: string;
  method: string;
  short: string;
  title: string;
  archetype: string;
  signature: string;
  intro: string;
  lens: string;
  roleLine: string;
  visualCue: string;
  askLabel: string;
  deepLabel: string;
  tone: string;
  color: string;
  chipClass: string;
  mark: string;
  symbol: string;
}

export const SAMSIN_CHARACTERS: Record<SamsinCharacterKey, SamsinCharacterProfile> = {
  cheongwoon: {
    key: 'cheongwoon',
    name: '청운',
    method: '사주팔자',
    short: '사주',
    title: '현실 기준을 잡는 사주 스승',
    archetype: '기준의 신',
    signature: '손익의 기준선을 긋습니다',
    intro: '태어난 날의 기질, 십성, 오행과 대운으로 지금 선택의 기준선을 잡아요.',
    lens: '무엇이 부딪히고 어디서 새는가',
    roleLine: '돈이 새는 지점과 감당할 책임을 먼저 가릅니다.',
    visualCue: '먹빛 장부와 초록 인장',
    askLabel: '청운에게 기준 묻기',
    deepLabel: '청운의 기준',
    tone: '단호하고 명료하게',
    color: 'var(--green)',
    chipClass: 'chip-green',
    mark: '청',
    symbol: '책',
  },
  taeeul: {
    key: 'taeeul',
    name: '태을',
    method: '자미두수',
    short: '자미',
    title: '일의 자리를 정리하는 자미 해석자',
    archetype: '자리의 신',
    signature: '역할과 국면을 봅니다',
    intro: '명궁, 재물 궁, 일의 궁, 관계의 궁처럼 삶의 자리가 어느 국면에 놓였는지 정리해요.',
    lens: '어느 자리에서 사건과 역할이 생기는가',
    roleLine: '지금 맡은 자리, 바뀌는 역할, 일이 몰리는 궁을 정리합니다.',
    visualCue: '푸른 궁과 자리표',
    askLabel: '태을에게 자리 묻기',
    deepLabel: '태을의 국면',
    tone: '정중하고 차분하게',
    color: 'var(--blue)',
    chipClass: 'chip-blue',
    mark: '태',
    symbol: '궁',
  },
  luna: {
    key: 'luna',
    name: '루나',
    method: '서양 점성술',
    short: '점성',
    title: '압박과 리듬을 읽는 점성 안내자',
    archetype: '리듬의 신',
    signature: '마음의 속도를 봐요',
    intro: '별자리와 행성의 심리 리듬으로 욕구와 회복 방향을 부드럽게 풀어요.',
    lens: '이 흐름을 내가 어떻게 느끼는가',
    roleLine: '압박을 크게 느끼는 이유와 회복 리듬을 부드럽게 비춥니다.',
    visualCue: '금빛 달과 궤도',
    askLabel: '루나에게 마음 묻기',
    deepLabel: '루나의 리듬',
    tone: '따뜻하고 현대적으로',
    color: 'var(--gold)',
    chipClass: 'chip-gold',
    mark: '루',
    symbol: '달',
  },
};

export const SAMSIN_CHARACTER_LIST = [
  SAMSIN_CHARACTERS.cheongwoon,
  SAMSIN_CHARACTERS.taeeul,
  SAMSIN_CHARACTERS.luna,
] as const;
