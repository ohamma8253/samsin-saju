export type ConcernKey =
  | 'money_leak'
  | 'career_timing'
  | 'income_anxiety'
  | 'work_overload'
  | 'work_drift'
  | 'next_3_months'
  | 'love_distance'
  | 'repeat_pattern'
  | 'compatibility'
  | 'general';

export interface ConcernOption {
  key: Exclude<ConcernKey, 'general'>;
  label: string;
  shortLabel: string;
  legacyValues: string[];
}

export interface ConcernPreviewCard {
  title: '공통 신호' | '관점 차이' | '오늘의 기준';
  body: string;
}

export interface ConcernCopy {
  key: ConcernKey;
  label: string;
  shortLabel: string;
  freeHeadline: string;
  freeBody: string;
  todayAction: string;
  previewCards: ConcernPreviewCard[];
  paidIntro: {
    headline: string;
    signal: string;
    relief: string;
    reason: string;
    remember: string;
  };
  chatSuggestions: string[];
}

export const CONCERN_OPTIONS: ConcernOption[] = [
  {
    key: 'money_leak',
    label: '돈이 안 남는 느낌',
    shortLabel: '금전',
    legacyValues: ['금전', '돈', '재물', 'money', '돈이 새는 느낌'],
  },
  {
    key: 'career_timing',
    label: '이직/퇴사 타이밍',
    shortLabel: '이직',
    legacyValues: ['이직', '퇴사', '직업', '커리어', '일', 'career', '이직 타이밍 고민'],
  },
  {
    key: 'income_anxiety',
    label: '프리랜서 수입 불안',
    shortLabel: '수입',
    legacyValues: ['프리랜서', '수입', '매출', '계약', 'income', 'freelance'],
  },
  {
    key: 'work_overload',
    label: '책임만 늘어나는 시기',
    shortLabel: '책임',
    legacyValues: ['책임', '업무과중', '업무 부담', 'overload'],
  },
  {
    key: 'work_drift',
    label: '일이 내 손을 떠나는 느낌',
    shortLabel: '통제감',
    legacyValues: ['통제감', '내 손', '일이 내 손을 떠남', 'work drift'],
  },
  {
    key: 'next_3_months',
    label: '앞으로 3개월 흐름',
    shortLabel: '3개월',
    legacyValues: ['3개월', '앞으로 3개월', '분기', 'quarter', '올해 흐름 불안', '올해운', '올해', '신년', 'year', 'year_anxiety'],
  },
  {
    key: 'love_distance',
    label: '그 사람 마음이 헷갈림',
    shortLabel: '관계',
    legacyValues: ['연애', '재회', '관계', 'love'],
  },
  {
    key: 'repeat_pattern',
    label: '같은 문제가 반복됨',
    shortLabel: '반복',
    legacyValues: ['반복', '패턴', 'repeat'],
  },
  {
    key: 'compatibility',
    label: '궁합이 궁금함',
    shortLabel: '궁합',
    legacyValues: ['궁합', '상대', 'compatibility'],
  },
];

const CONCERN_COPY: Record<ConcernKey, ConcernCopy> = {
  money_leak: {
    key: 'money_leak',
    label: '돈이 안 남는 느낌',
    shortLabel: '금전',
    freeHeadline: '돈이 안 남는 느낌이 커질 수 있어요',
    freeBody:
      '사주에서는 비겁이나 겁재 흐름이 재성의 흐름을 건드릴 때, 내 돈과 주변 요구가 섞이는 신호로 읽습니다. 자미는 재물 자리와 역할 부담을, 점성은 지금의 소비 압박과 리듬을 함께 봅니다.',
    todayAction:
      '오늘은 돈을 억지로 끊기보다, 사람 부탁, 즉흥 결제, 책임 지출 중 어디서 기준이 흐려지는지 하나만 표시해 보세요.',
    previewCards: [
      {
        title: '공통 신호',
        body: '큰 손실보다 작은 요구와 선택이 겹치며 남는 돈이 줄어드는 흐름이 먼저 보입니다.',
      },
      {
        title: '관점 차이',
        body: '청운은 재성 흐름, 태을은 재물 자리의 부담, 루나는 소비 압박과 피로를 더 크게 봅니다.',
      },
      {
        title: '오늘의 기준',
        body: '오늘 결제할 일은 필요한 지출, 관계 때문에 하는 지출, 기분 때문에 하는 지출로 나눠보세요.',
      },
    ],
    paidIntro: {
      headline: '돈이 안 남는 느낌을 세 관점으로 봅니다',
      signal:
        '돈이 내 뜻대로 남지 않는 신호가 먼저 보여요. 사주에서는 비겁이나 겁재 흐름이 재성의 흐름을 건드릴 때, 내 돈과 남의 요구가 섞이는 식으로 읽습니다.',
      relief:
        '이 흐름은 손실을 뜻하는 예언이 아닙니다. 새는 통로를 알아차리면 관계 부탁, 충동 결제, 책임 지출을 나눠 볼 수 있어요.',
      reason:
        '청운은 돈의 흐름과 기준을, 태을은 재물 자리와 맡은 역할을, 루나는 현재의 압박과 소비 리듬을 서로 다르게 봅니다.',
      remember: '돈을 끊기보다, 어디서 내 기준이 흐려지는지 먼저 보세요.',
    },
    chatSuggestions: [
      '돈이 새는 통로를 더 봐줘',
      '이번 달 소비 기준을 잡아줘',
      '돈 문제에서 내 기준이 흐려지는 부분을 봐줘',
    ],
  },
  career_timing: {
    key: 'career_timing',
    label: '이직/퇴사 타이밍',
    shortLabel: '이직',
    freeHeadline: '움직이고 싶지만 조건 정리가 먼저예요',
    freeBody:
      '일이 내 손을 떠난다기보다 맡는 몫이 무거워지는 신호가 먼저 보입니다. 사주는 역할의 압력을, 자미는 일의 자리 변화를, 점성은 성장과 책임의 리듬을 함께 봐요.',
    todayAction:
      '오늘은 이직 결론보다, 지금 회사가 싫은 이유와 다음 환경에서 반복되면 안 되는 조건을 각각 하나씩 적어보세요.',
    previewCards: [
      {
        title: '공통 신호',
        body: '변화 욕구는 강하지만 당장 결정보다 조건 정리가 먼저인 흐름입니다.',
      },
      {
        title: '관점 차이',
        body: '청운은 책임 부담, 태을은 역할 변화, 루나는 관계와 환경 피로를 더 크게 봅니다.',
      },
      {
        title: '오늘의 기준',
        body: '"지금 회사가 싫은가?"보다 "다음 환경에서 반복되면 안 되는 조건 3개"를 먼저 적어보세요.',
      },
    ],
    paidIntro: {
      headline: '이직/퇴사 타이밍을 세 관점으로 봅니다',
      signal:
        '움직이고 싶은 신호는 있지만, 바로 떠나라는 결론보다 조건을 정리하라는 흐름이 먼저 보여요.',
      relief:
        '이 신호는 지금 바로 이직하라는 지시가 아닙니다. 버틸 일과 바꿀 일을 나누는 선택 기준에 가깝습니다.',
      reason:
        '청운은 역할 압력과 일의 흐름을, 태을은 맡는 자리의 변화감을, 루나는 성장과 책임의 압박을 함께 봅니다.',
      remember: '이직 결론보다, 다음 환경에서 반복되면 안 되는 조건을 먼저 나누세요.',
    },
    chatSuggestions: [
      '움직일 때인지 버틸 때인지 봐줘',
      '이직 결론보다 먼저 봐야 할 조건을 봐줘',
      '다음 환경에서 반복되면 안 되는 조건을 봐줘',
    ],
  },
  income_anxiety: {
    key: 'income_anxiety',
    label: '프리랜서 수입 불안',
    shortLabel: '수입',
    freeHeadline: '수입 리듬이 흔들려 보일 수 있어요',
    freeBody:
      '프리랜서나 프로젝트 수입은 돈이 없는 운보다 들어오는 길과 나가는 길이 엇갈리는 신호로 읽는 편이 맞습니다. 사주는 재성의 흐름을, 자미는 일과 재물의 자리를, 점성은 계약과 일정 압박을 함께 봅니다.',
    todayAction:
      '오늘은 불안을 키우기보다 고정 수입, 예상 수입, 미뤄진 수입을 세 줄로 나눠보세요.',
    previewCards: [
      {
        title: '공통 신호',
        body: '수입 자체보다 수입 시점과 지출 시점이 어긋나 마음이 먼저 조급해지는 흐름입니다.',
      },
      {
        title: '관점 차이',
        body: '청운은 재성 흐름, 태을은 일과 재물 자리, 루나는 계약 일정과 피로 누적을 봅니다.',
      },
      {
        title: '오늘의 기준',
        body: '이번 달은 새 일을 더 받기 전에 입금일, 마감일, 회복일을 같이 놓고 보세요.',
      },
    ],
    paidIntro: {
      headline: '프리랜서 수입 불안을 세 관점으로 봅니다',
      signal:
        '수입이 끊긴다는 예언보다, 들어오는 길과 나가는 길의 리듬이 어긋나는 신호가 먼저 보여요.',
      relief:
        '이 흐름은 실패 예언이 아닙니다. 고정 수입과 예상 수입을 나누면 이번 달 기준이 훨씬 선명해집니다.',
      reason:
        '청운은 재성 흐름을, 태을은 일과 재물의 자리를, 루나는 계약 일정과 몸의 피로 리듬을 서로 다르게 봅니다.',
      remember: '새 일을 더 받기 전, 입금일과 마감일이 같이 버틸 수 있는지 먼저 보세요.',
    },
    chatSuggestions: [
      '이번 달 수입 기준을 잡아줘',
      '불규칙한 수입에서 조심할 신호를 봐줘',
      '새 제안을 받을 기준을 봐줘',
    ],
  },
  work_overload: {
    key: 'work_overload',
    label: '책임만 늘어나는 시기',
    shortLabel: '책임',
    freeHeadline: '맡는 몫이 무거워지는 신호가 있어요',
    freeBody:
      '일이 많아진다는 말보다 책임의 경계가 흐려지는 흐름으로 보는 편이 맞습니다. 사주는 관성과 역할 압력을, 자미는 맡은 자리의 무게를, 점성은 버티는 리듬과 피로를 함께 봅니다.',
    todayAction:
      '오늘은 모든 일을 해내려 하기보다 내 책임, 남의 책임, 협의할 책임을 하나씩 나눠보세요.',
    previewCards: [
      {
        title: '공통 신호',
        body: '일의 양보다 책임의 경계가 흐려져 내 몫이 늘어난 것처럼 느껴질 수 있습니다.',
      },
      {
        title: '관점 차이',
        body: '청운은 역할 압력, 태을은 자리의 무게, 루나는 피로와 회복 리듬을 더 크게 봅니다.',
      },
      {
        title: '오늘의 기준',
        body: '오늘 새로 맡는 일은 "내가 결정할 수 있는가"를 먼저 확인하고 답하세요.',
      },
    ],
    paidIntro: {
      headline: '책임만 늘어나는 흐름을 세 관점으로 봅니다',
      signal:
        '맡는 몫이 무거워지는 신호가 있어요. 사주에서는 관성과 역할 압력이 강해질 때 책임의 경계가 흐려지는 식으로 읽습니다.',
      relief:
        '이 흐름은 못 버틴다는 결론이 아닙니다. 내 책임과 협의할 책임을 나누면 압박을 줄일 수 있습니다.',
      reason:
        '청운은 역할 압력과 기준을, 태을은 맡은 자리의 무게를, 루나는 피로와 회복 리듬을 서로 다르게 봅니다.',
      remember: '새 책임을 받기 전, 결정권까지 같이 오는지 먼저 확인하세요.',
    },
    chatSuggestions: [
      '책임이 늘어나는 흐름인지 봐줘',
      '내가 맡을 일과 거절할 일을 나눠줘',
      '이번 주 업무 기준을 잡아줘',
    ],
  },
  work_drift: {
    key: 'work_drift',
    label: '일이 내 손을 떠나는 느낌',
    shortLabel: '통제감',
    freeHeadline: '일이 내 손을 떠나는 듯한 신호가 있어요',
    freeBody:
      '이 흐름은 일이 망가진다는 뜻보다, 결정권과 실행 책임이 엇갈리는 신호로 볼 수 있습니다. 사주는 역할의 흐름을, 자미는 일의 자리 변화를, 점성은 환경 압박과 조율 피로를 함께 봅니다.',
    todayAction:
      '오늘은 통제할 일, 기다릴 일, 다시 협의할 일을 세 칸으로 나눠보세요.',
    previewCards: [
      {
        title: '공통 신호',
        body: '내가 책임지는 일인데 결정권은 밖에 있는 듯한 답답함이 커질 수 있습니다.',
      },
      {
        title: '관점 차이',
        body: '청운은 역할 기준, 태을은 일의 자리 변화, 루나는 주변 환경과 소통 피로를 봅니다.',
      },
      {
        title: '오늘의 기준',
        body: '오늘 막힌 일은 "내가 바꿀 수 있는 것"과 "확인만 필요한 것"을 먼저 나눠보세요.',
      },
    ],
    paidIntro: {
      headline: '일이 내 손을 떠나는 느낌을 세 관점으로 봅니다',
      signal:
        '일이 내 손을 떠나는 듯한 신호가 있어요. 다만 이것은 실패 예언이 아니라 결정권과 책임이 엇갈리는 흐름에 가깝습니다.',
      relief:
        '통제감이 낮아지는 구간일수록 모든 것을 붙잡기보다 다시 협의할 지점을 찾는 편이 안전합니다.',
      reason:
        '청운은 역할 기준을, 태을은 일의 자리와 담당 범위를, 루나는 주변 환경의 압박과 소통 피로를 서로 다르게 봅니다.',
      remember: '내가 통제할 일과 다시 확인할 일을 먼저 나누세요.',
    },
    chatSuggestions: [
      '일이 내 손을 떠나는 신호인지 봐줘',
      '내가 통제할 일과 기다릴 일을 나눠줘',
      '다시 협의해야 할 기준을 봐줘',
    ],
  },
  next_3_months: {
    key: 'next_3_months',
    label: '앞으로 3개월 흐름',
    shortLabel: '3개월',
    freeHeadline: '앞으로 3개월은 우선순위가 중요해요',
    freeBody:
      '큰 사건을 맞히기보다, 앞으로 3개월 동안 어디에 힘이 몰리고 어디서 힘이 새는지 보는 편이 맞습니다. 사주, 자미, 점성은 시기 압력과 역할 변화, 마음의 리듬을 나눠 읽습니다.',
    todayAction:
      '오늘은 3개월 목표를 늘리기보다, 이번 달에 줄일 일 하나와 남길 일 하나를 먼저 고르세요.',
    previewCards: [
      {
        title: '공통 신호',
        body: '해야 할 일이 늘어나는 흐름 속에서 선택 기준이 흐려지면 피로가 먼저 커질 수 있습니다.',
      },
      {
        title: '관점 차이',
        body: '청운은 큰 흐름의 속도, 태을은 자리 변화, 루나는 지금의 압박과 회복 리듬을 봅니다.',
      },
      {
        title: '오늘의 기준',
        body: '앞으로 30일은 새 목표보다 줄일 일을 먼저 정하면 흐름을 읽기 쉬워집니다.',
      },
    ],
    paidIntro: {
      headline: '앞으로 3개월 흐름을 세 관점으로 봅니다',
      signal:
        '앞으로 3개월은 큰 결론보다 우선순위를 다시 세우라는 신호가 먼저 보여요.',
      relief:
        '이 흐름은 좋은 달과 나쁜 달을 찍는 예언이 아닙니다. 먼저 줄일 것과 남길 것을 나누는 기준입니다.',
      reason:
        '청운은 큰 흐름의 속도를, 태을은 자리 변화와 맡는 역할을, 루나는 압박과 회복 리듬을 서로 다르게 봅니다.',
      remember: '앞으로 30일은 새 목표보다 줄일 일을 먼저 정하세요.',
    },
    chatSuggestions: [
      '앞으로 3개월 우선순위를 봐줘',
      '이번 달에 먼저 줄일 일을 봐줘',
      '다음 30일 기준을 잡아줘',
    ],
  },
  love_distance: {
    key: 'love_distance',
    label: '그 사람 마음이 헷갈림',
    shortLabel: '관계',
    freeHeadline: '마음이 멀어진 듯한 신호는 있어요',
    freeBody:
      '자미와 점성에서는 감정 표현이 닫히거나 확인이 어려워지는 흐름으로 볼 수 있습니다. 다만 이것은 이별로 단정할 말이 아니라, 서로의 속도와 표현 방식이 어긋나는 구간으로 읽어야 해요.',
    todayAction:
      '오늘은 결론을 몰아붙이기보다, 내가 확인하고 싶은 말과 상대가 부담스러워하는 방식을 따로 적어 보세요.',
    previewCards: [
      {
        title: '공통 신호',
        body: '마음이 식었다기보다 표현이 닫히고 확인이 늦어지는 신호로 보입니다.',
      },
      {
        title: '관점 차이',
        body: '태을은 관계 자리, 루나는 감정 리듬, 청운은 내가 반복하는 반응 방식을 더 봅니다.',
      },
      {
        title: '오늘의 기준',
        body: '상대의 결론보다, 내가 확인하고 싶은 말이 무엇인지 먼저 짧게 정리해보세요.',
      },
    ],
    paidIntro: {
      headline: '헷갈리는 마음의 거리를 세 관점으로 봅니다',
      signal:
        '마음이 멀어진 듯한 신호는 있어요. 자미와 점성에서는 감정 표현이 닫히거나 확인이 어려워지는 흐름으로 읽을 수 있습니다.',
      relief:
        '이 신호는 이별 확정이 아니라, 서로의 속도와 표현 방식이 어긋나는 구간에 가깝습니다.',
      reason:
        '태을은 관계의 자리와 반응 패턴을, 루나는 감정 리듬을, 청운은 반복되는 대응 방식을 함께 봅니다.',
      remember: '상대의 결론보다, 확인이 막히는 지점을 먼저 보세요.',
    },
    chatSuggestions: [
      '상대 마음이 멀어진 신호인지 봐줘',
      '관계에서 내가 오해하는 부분을 봐줘',
      '재회 가능성보다 지금 막힌 지점을 봐줘',
    ],
  },
  repeat_pattern: {
    key: 'repeat_pattern',
    label: '같은 문제가 반복됨',
    shortLabel: '반복',
    freeHeadline: '같은 문제가 다시 도는 느낌이 있어요',
    freeBody:
      '반복되는 문제는 운이 나쁘다는 뜻보다, 같은 기운을 같은 방식으로 쓰고 있다는 신호일 수 있습니다. 사주, 자미, 점성은 반복의 원인을 기질, 자리, 심리 리듬으로 나눠 봅니다.',
    todayAction:
      '오늘은 문제를 해결하려고 몰아붙이기보다, 이번에도 반복된 반응 하나를 짧게 적어 보세요.',
    previewCards: [
      {
        title: '공통 신호',
        body: '상황은 달라도 내가 같은 방식으로 참고, 미루고, 몰아붙이는 흐름이 보일 수 있어요.',
      },
      {
        title: '관점 차이',
        body: '청운은 기질의 반복, 태을은 맡는 역할의 반복, 루나는 심리 리듬의 반복을 봅니다.',
      },
      {
        title: '오늘의 기준',
        body: '이번에도 반복된 반응 하나만 적고, 다음 순서를 바꿀 기준을 하나 정해보세요.',
      },
    ],
    paidIntro: {
      headline: '반복되는 문제를 세 관점으로 봅니다',
      signal:
        '같은 문제가 다시 도는 느낌이 있어요. 사주에서는 강한 기운을 같은 방식으로 쓰는 반복 신호로 읽을 수 있습니다.',
      relief:
        '이 신호는 운명이 정해졌다는 뜻이 아닙니다. 반복을 알아차리면 다음 선택의 순서를 바꿀 수 있어요.',
      reason:
        '청운은 기질의 반복을, 태을은 맡는 역할의 반복을, 루나는 심리 리듬의 반복을 함께 봅니다.',
      remember: '문제보다, 내가 매번 같은 방식으로 반응하는 지점을 보세요.',
    },
    chatSuggestions: [
      '반복되는 문제의 시작점을 봐줘',
      '내가 매번 같은 방식으로 반응하는 부분을 봐줘',
      '이번에는 어떻게 순서를 바꾸면 좋을지 봐줘',
    ],
  },
  compatibility: {
    key: 'compatibility',
    label: '궁합이 궁금함',
    shortLabel: '궁합',
    freeHeadline: '둘 사이의 결이 궁금한 흐름이에요',
    freeBody:
      '궁합은 결혼이나 이별을 정하는 말이 아니라, 두 사람의 속도와 반응이 어디서 맞고 어긋나는지 보는 해석입니다. 먼저 내 흐름을 본 뒤 궁합 보기에서 상대 정보를 함께 비교할 수 있어요.',
    todayAction:
      '오늘은 상대의 결론보다, 같이 있을 때 내가 편해지는 순간과 긴장되는 순간을 하나씩 적어 보세요.',
    previewCards: [
      {
        title: '공통 신호',
        body: '끌림은 있어도 속도나 표현 방식이 달라 확인이 늦어지는 느낌이 생길 수 있어요.',
      },
      {
        title: '관점 차이',
        body: '청운은 반응 기질, 태을은 관계의 자리, 루나는 감정 리듬을 더 봅니다.',
      },
      {
        title: '오늘의 기준',
        body: '궁합의 결론보다, 같이 있을 때 편해지는 순간과 긴장되는 순간을 나눠보세요.',
      },
    ],
    paidIntro: {
      headline: '궁합을 보기 전 내 관계 리듬을 봅니다',
      signal:
        '둘 사이의 결이 궁금한 흐름이에요. 먼저 내 관계 리듬이 어디서 빨라지고 어디서 닫히는지 봅니다.',
      relief:
        '이 해석은 결혼이나 이별을 정하는 말이 아닙니다. 두 사람의 속도 차이를 확인하기 위한 준비에 가깝습니다.',
      reason:
        '청운은 반응 기질을, 태을은 관계의 자리와 역할을, 루나는 감정 리듬을 함께 봅니다.',
      remember: '궁합의 결론보다, 내가 관계에서 반복하는 속도를 먼저 보세요.',
    },
    chatSuggestions: [
      '궁합 보기 전에 내 관계 리듬을 봐줘',
      '상대와 속도가 어긋나는 부분을 봐줘',
      '궁합에서 꼭 확인해야 할 기준을 봐줘',
    ],
  },
  general: {
    key: 'general',
    label: '일과 돈이 마음에 걸림',
    shortLabel: '흐름',
    freeHeadline: '일과 돈이 마음에 걸릴 때 먼저 볼 흐름이에요',
    freeBody:
      '불안은 정답을 맞히라는 압박보다, 지금 어디에 힘이 쏠리고 어디서 새는지 보라는 신호일 수 있습니다. 사주, 자미, 점성의 같은 말과 다른 말을 나눠 읽어요.',
    todayAction:
      '오늘은 큰 결론보다, 돈과 일 중 더 마음을 쓰게 만드는 장면 하나를 적고 선택 기준을 하나만 남겨 보세요.',
    previewCards: [
      {
        title: '공통 신호',
        body: '돈과 일의 부담이 겹치면 한 가지 문제보다 여러 압박이 한꺼번에 커져 보일 수 있어요.',
      },
      {
        title: '관점 차이',
        body: '청운은 기준을, 태을은 맡은 자리를, 루나는 지금의 압박과 회복 리듬을 나눠 봅니다.',
      },
      {
        title: '오늘의 기준',
        body: '결론을 서두르기보다, 지금 줄일 일 하나와 남길 기준 하나를 먼저 정해보세요.',
      },
    ],
    paidIntro: {
      headline: '일과 돈의 불안을 세 관점으로 나눠봅니다',
      signal:
        '요즘 걸리는 지점은 하나의 결론보다 돈과 일의 신호가 겹친 모습에 가깝습니다.',
      relief:
        '이 흐름은 정해진 결과가 아니라, 지금 조정할 선택 기준을 찾기 위한 참고 신호입니다.',
      reason:
        '청운은 기준과 흐름을, 태을은 삶의 자리와 역할을, 루나는 압박과 회복 리듬을 함께 봅니다.',
      remember: '결론을 서두르기보다, 돈과 일에서 같은 말과 다른 말을 나눠 보세요.',
    },
    chatSuggestions: [
      '일과 돈 중 먼저 볼 기준을 잡아줘',
      '세 관점이 다르게 보는 부분을 봐줘',
      '다음 30일 기준을 잡아줘',
    ],
  },
};

const CONCERN_ALIAS_ENTRIES: Array<[string, ConcernKey]> = CONCERN_OPTIONS.flatMap(option => [
  [option.key, option.key],
  [option.label, option.key],
  [option.shortLabel, option.key],
  ...option.legacyValues.map(value => [value, option.key] as [string, ConcernKey]),
]);

const CONCERN_ALIAS = new Map<string, ConcernKey>(
  CONCERN_ALIAS_ENTRIES.flatMap(([value, key]) => {
    const trimmed = value.trim();
    return [
      [trimmed, key],
      [trimmed.toLowerCase(), key],
    ] as Array<[string, ConcernKey]>;
  }),
);

export function normalizeConcern(value?: string | null): ConcernKey {
  if (!value) return 'general';
  const trimmed = value.trim();
  return CONCERN_ALIAS.get(trimmed) ?? CONCERN_ALIAS.get(trimmed.toLowerCase()) ?? 'general';
}

export function getConcernCopy(value?: string | ConcernKey | null): ConcernCopy {
  return CONCERN_COPY[normalizeConcern(value)];
}
