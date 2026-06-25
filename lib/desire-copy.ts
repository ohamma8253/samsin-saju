import { getConcernCopy, normalizeConcern, type ConcernKey } from './concerns';
import type { SamsinDeityKey } from './pricing';

type DeityPromptMap = Record<SamsinDeityKey, { cta: string; line: string }>;

export interface ConcernDesireCopy {
  homeSignal: string;
  selectedPromise: string;
  homeCta: string;
  startBody: string;
  birthReward: string;
  birthCta: string;
  freeTeaser: string;
  firstReadingCta: string;
  firstReadingSubcopy: string;
  paidAskCta: string;
  paidDeepCta: string;
  askHeadline: string;
  askSubcopy: string;
  askPlaceholder: string;
  askSendCta: string;
  askSuggestions: string[];
  deityPrompts: DeityPromptMap;
}

function defaultDeityPrompts(shortLabel: string): DeityPromptMap {
  return {
    cheongwoon: {
      cta: '청운에게 기준 묻기',
      line: `청운은 ${shortLabel}에서 기준이 흐려지는 자리를 먼저 봅니다.`,
    },
    taeeul: {
      cta: '태을에게 자리 묻기',
      line: `태을은 ${shortLabel}이 지금 맡은 역할과 자리에 어떻게 걸리는지 봅니다.`,
    },
    luna: {
      cta: '루나에게 리듬 묻기',
      line: `루나는 ${shortLabel}이 마음의 압박과 선택 리듬으로 번지는지를 봅니다.`,
    },
  };
}

function baseCopy(concern: ConcernKey): ConcernDesireCopy {
  const concernCopy = getConcernCopy(concern);
  return {
    homeSignal:
      '돈이 안 남거나, 일이 너무 무겁거나, 움직여야 할지 헷갈릴 때 먼저 신호만 나눠볼게요.',
    selectedPromise:
      `${concernCopy.label}이 지금 어떤 운세 신호와 닿아 있는지 청운·태을·루나가 각자 다른 기준으로 확인합니다.`,
    homeCta: '내 신호인지 확인하기',
    startBody:
      `아직 개인 흐름을 계산하기 전이라 결과를 말하지는 않아요. 대신 삼신이 ${concernCopy.label}을 어떤 순서로 확인할지 먼저 맞춥니다.`,
    birthReward: '입력하면 공통 신호, 관점 차이, 오늘의 기준을 먼저 보여드려요.',
    birthCta: '무료로 내 운세 보기',
    freeTeaser:
      '이 신호가 어디서 왔는지, 세 관점이 같은 부분과 갈리는 부분을 이어서 열어볼 수 있어요.',
    firstReadingCta: '왜 이런 신호가 나왔는지 열기',
    firstReadingSubcopy: '3쿠키(990원) · 세 관점 보기',
    paidAskCta: '남은 질문 이어 묻기',
    paidDeepCta: '다음 30일 기준 보기',
    askHeadline: '아직 남은 질문을 하나만 더 볼게요',
    askSubcopy: '방금 본 리포트의 신호와 근거를 기준으로 이어서 답합니다.',
    askPlaceholder: '지금 제일 걸리는 한 가지를 적어주세요',
    askSendCta: '삼신에게 묻기',
    askSuggestions: concernCopy.chatSuggestions,
    deityPrompts: defaultDeityPrompts(concernCopy.shortLabel),
  };
}

const OVERRIDES: Partial<Record<ConcernKey, Partial<ConcernDesireCopy>>> = {
  money_leak: {
    homeSignal: '돈이 안 남는 느낌이 들 때, 새는 통로가 운세 신호인지 먼저 나눠볼게요.',
    selectedPromise: '사람 부탁, 즉흥 결제, 책임 지출 중 어디서 돈의 기준이 흐려지는지 세 관점으로 확인합니다.',
    startBody:
      '아직 개인 흐름을 계산하기 전이라 결론은 말하지 않아요. 청운은 돈의 기준, 태을은 맡은 자리의 지출, 루나는 소비 압박의 리듬을 차례로 봅니다.',
    birthReward: '입력하면 돈이 안 남는 신호, 관점 차이, 오늘의 지출 기준을 먼저 보여드려요.',
    freeTeaser: '이 신호가 사람 부탁, 즉흥 결제, 책임 지출 중 어디와 닿는지 이어서 열어볼 수 있어요.',
    firstReadingCta: '왜 돈이 안 남는 신호인지 열기',
    paidAskCta: '돈 새는 통로 더 묻기',
    paidDeepCta: '다음 30일 돈 기준 보기',
    askHeadline: '돈이 새는 통로를 하나만 더 볼게요',
    askSubcopy: '리포트에서 본 금전 신호를 기준으로 사람 부탁, 즉흥 결제, 책임 지출을 나눠봅니다.',
    askSuggestions: [
      '돈이 새는 통로를 더 봐줘',
      '이번 달 소비 기준을 잡아줘',
      '사람 부탁과 내 지출을 어떻게 나눌지 봐줘',
    ],
  },
  career_timing: {
    homeSignal: '그만둬야 할지 버텨야 할지 헷갈릴 때, 결론보다 조건을 먼저 나눠볼게요.',
    selectedPromise: '움직일 신호인지, 버티며 조건을 정리할 신호인지 세 관점으로 확인합니다.',
    startBody:
      '아직 개인 흐름을 계산하기 전이라 이직 결론은 말하지 않아요. 청운은 역할 압력, 태을은 맡은 자리, 루나는 성장과 피로 리듬을 차례로 봅니다.',
    birthReward: '입력하면 이직 신호, 관점 차이, 오늘 정리할 조건을 먼저 보여드려요.',
    freeTeaser: '움직이고 싶은 마음이 역할 부담인지, 자리 변화인지, 피로 누적인지 이어서 열어볼 수 있어요.',
    firstReadingCta: '왜 움직이고 싶은 신호인지 열기',
    paidAskCta: '움직일지 버틸지 묻기',
    paidDeepCta: '다음 30일 일 기준 보기',
    askHeadline: '움직일지 버틸지 기준을 하나만 더 볼게요',
    askSubcopy: '리포트에서 본 일의 신호를 기준으로 퇴사 결론보다 조건을 먼저 나눕니다.',
    askSuggestions: [
      '움직일 때인지 버틸 때인지 봐줘',
      '다음 환경에서 반복되면 안 되는 조건을 봐줘',
      '지금 회사가 싫은 건지 역할이 무거운 건지 봐줘',
    ],
  },
  income_anxiety: {
    selectedPromise: '수입이 끊긴다는 결론보다, 들어오는 길과 나가는 길의 리듬을 세 관점으로 확인합니다.',
    birthReward: '입력하면 수입 리듬, 관점 차이, 이번 달 기준을 먼저 보여드려요.',
    firstReadingCta: '왜 수입 리듬이 흔들리는지 열기',
    paidAskCta: '이번 달 수입 기준 묻기',
    paidDeepCta: '다음 30일 계약 기준 보기',
    askHeadline: '이번 달 수입 기준을 하나만 더 볼게요',
    askSuggestions: [
      '이번 달 수입 기준을 잡아줘',
      '새 제안을 받을 기준을 봐줘',
      '입금일과 마감일이 버틸 수 있는 흐름인지 봐줘',
    ],
  },
  work_overload: {
    selectedPromise: '내 책임인지, 남의 책임까지 넘어온 것인지 세 관점으로 확인합니다.',
    birthReward: '입력하면 책임이 늘어나는 신호, 관점 차이, 오늘 협의할 기준을 먼저 보여드려요.',
    firstReadingCta: '왜 책임이 무거운 신호인지 열기',
    paidAskCta: '맡을 일과 거절할 일 묻기',
    paidDeepCta: '다음 30일 업무 기준 보기',
    askHeadline: '이 책임을 내가 맡아야 하는지 하나만 더 볼게요',
    askSuggestions: [
      '책임이 늘어나는 흐름인지 봐줘',
      '내가 맡을 일과 거절할 일을 나눠줘',
      '이번 주 업무 기준을 잡아줘',
    ],
  },
  work_drift: {
    selectedPromise: '일이 무너진다는 결론보다, 결정권과 책임이 엇갈리는 신호인지 확인합니다.',
    birthReward: '입력하면 통제감이 낮아지는 신호, 관점 차이, 다시 협의할 기준을 먼저 보여드려요.',
    firstReadingCta: '왜 일이 손을 떠나는 느낌인지 열기',
    paidAskCta: '통제할 일과 기다릴 일 묻기',
    paidDeepCta: '다음 30일 협의 기준 보기',
    askHeadline: '통제할 일과 기다릴 일을 하나만 더 나눠볼게요',
    askSuggestions: [
      '일이 내 손을 떠나는 신호인지 봐줘',
      '내가 통제할 일과 기다릴 일을 나눠줘',
      '다시 협의해야 할 기준을 봐줘',
    ],
  },
  next_3_months: {
    selectedPromise: '앞으로 3개월에 무엇을 늘릴지보다, 먼저 줄일 것과 남길 것을 세 관점으로 확인합니다.',
    birthReward: '입력하면 앞으로 3개월 신호, 관점 차이, 오늘 정할 우선순위를 먼저 보여드려요.',
    firstReadingCta: '왜 3개월 우선순위가 중요한지 열기',
    paidAskCta: '이번 달 우선순위 묻기',
    paidDeepCta: '다음 30일 기준 보기',
    askHeadline: '앞으로 30일 기준을 하나만 더 볼게요',
    askSuggestions: [
      '앞으로 3개월 우선순위를 봐줘',
      '이번 달에 먼저 줄일 일을 봐줘',
      '다음 30일 기준을 잡아줘',
    ],
  },
};

export function getConcernDesireCopy(value?: string | ConcernKey | null): ConcernDesireCopy {
  const concern = normalizeConcern(value);
  return {
    ...baseCopy(concern),
    ...OVERRIDES[concern],
  };
}
