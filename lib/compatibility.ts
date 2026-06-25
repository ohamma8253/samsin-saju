import type { CompatibilityReport } from './claude';
import type { SamsinData, WuxingCount } from './saju';
import { BRANCH_ELEMENT, STEM_INFO, type Element } from './manselyeok-core';

type RelationshipKind = 'friend' | 'romantic';

const ELEMENT_KO: Record<Element, string> = {
  tree: '나무',
  fire: '불',
  earth: '흙',
  metal: '쇠',
  water: '물',
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

const STEM_KO: Record<string, string> = {
  甲: '봄 나무',
  乙: '덩굴 나무',
  丙: '큰 불',
  丁: '등불',
  戊: '큰 산',
  己: '기름진 흙',
  庚: '단단한 쇠',
  辛: '보석 같은 쇠',
  壬: '큰 물',
  癸: '이슬 같은 물',
};

function strongestElement(wuxing: WuxingCount): Element {
  return (Object.entries(wuxing) as Array<[Element, number]>)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'earth';
}

function dayElement(data: SamsinData): Element {
  const day = data.saju.pillars[1]?.pillar;
  return STEM_INFO[day?.stem ?? '']?.element ?? BRANCH_ELEMENT[day?.branch ?? ''] ?? strongestElement(data.wuxing);
}

function dayLabel(data: SamsinData): string {
  const stem = data.saju.pillars[1]?.pillar.stem ?? '';
  return STEM_KO[stem] ?? `${ELEMENT_KO[dayElement(data)]} 기운`;
}

function hasFinalConsonant(text: string): boolean {
  const charCode = text.trim().charCodeAt(text.trim().length - 1);
  if (charCode < 0xac00 || charCode > 0xd7a3) return false;
  return (charCode - 0xac00) % 28 > 0;
}

function withAndParticle(text: string): string {
  return `${text}${hasFinalConsonant(text) ? '과' : '와'}`;
}

function interaction(a: Element, b: Element): { headline: string; body: string; tone: 'support' | 'tension' | 'parallel' } {
  if (a === b) {
    return {
      headline: `${ELEMENT_KO[a]} 기운이 나란히 놓인 구조`,
      body: '서로의 속도와 판단 방식이 닮아 빠르게 이해하는 장점이 있습니다. 같은 장점이 동시에 강해질 때는 양보보다 기준 경쟁으로 번질 수 있어 역할을 분리하는 편이 좋습니다.',
      tone: 'parallel',
    };
  }
  if (ELEMENT_GENERATES[a] === b) {
    return {
      headline: `${ELEMENT_KO[a]} 기운이 ${ELEMENT_KO[b]} 기운을 밀어주는 구조`,
      body: '한 사람이 시작한 흐름을 다른 사람이 키워 주기 쉬운 배치입니다. 도움의 방향이 한쪽으로 굳지 않게 고마움과 부담을 자주 확인해야 균형이 유지됩니다.',
      tone: 'support',
    };
  }
  if (ELEMENT_GENERATES[b] === a) {
    return {
      headline: `${ELEMENT_KO[b]} 기운이 ${ELEMENT_KO[a]} 기운을 밀어주는 구조`,
      body: '상대의 자극이 내 선택을 움직이게 하는 관계입니다. 받는 쪽이 침묵하면 균형이 흐려질 수 있어 필요한 것과 어려운 점을 말로 남기는 습관이 중요합니다.',
      tone: 'support',
    };
  }
  if (ELEMENT_CONTROLS[a] === b || ELEMENT_CONTROLS[b] === a) {
    return {
      headline: `${ELEMENT_KO[a]} 기운과 ${ELEMENT_KO[b]} 기운이 서로를 조정하는 구조`,
      body: '서로 다른 기준이 만나 긴장과 성장을 함께 만듭니다. 이 관계는 누가 맞는지 가르기보다 어떤 상황에서 압박을 느끼는지 먼저 확인할 때 장점이 살아납니다.',
      tone: 'tension',
    };
  }
  return {
    headline: `${ELEMENT_KO[a]} 기운과 ${ELEMENT_KO[b]} 기운이 속도를 맞추는 구조`,
    body: '서로의 장점이 바로 겹치지는 않지만, 생활 리듬을 맞추면 빈 곳을 채우는 관계가 됩니다. 기대를 추측으로 두지 말고 약속의 단위를 작게 잡는 편이 좋습니다.',
    tone: 'parallel',
  };
}

function toneSummary(tone: 'support' | 'tension' | 'parallel', relationship: RelationshipKind): string {
  if (tone === 'support') return relationship === 'romantic' ? '서로를 키우는 관계' : '서로의 일을 밀어주는 관계';
  if (tone === 'tension') return relationship === 'romantic' ? '다름을 조율하는 관계' : '기준 차이를 활용하는 관계';
  return relationship === 'romantic' ? '닮은 속도를 다듬는 관계' : '비슷한 리듬을 나누는 관계';
}

function ziweiAnchor(data: SamsinData): string {
  const careerStars = data.ziwei.palaces.官祿?.stars.map(star => star.name).slice(0, 2).join(', ');
  const relationStars = data.ziwei.palaces.夫妻?.stars.map(star => star.name).slice(0, 2).join(', ');
  return relationStars || careerStars || '명반의 주요 별';
}

function natalAnchor(data: SamsinData): string {
  const sun = data.natal.planets.find(planet => planet.id === 'Sun')?.sign ?? '태양';
  const moon = data.natal.planets.find(planet => planet.id === 'Moon')?.sign ?? '달';
  return `태양 ${sun}, 달 ${moon}`;
}

export function generateRuleBasedCompatibility(
  dataA: SamsinData,
  dataB: SamsinData,
  relationship: RelationshipKind,
  includeDeep: boolean,
): CompatibilityReport {
  const elementA = dayElement(dataA);
  const elementB = dayElement(dataB);
  const relation = interaction(elementA, elementB);
  const summary = toneSummary(relation.tone, relationship);
  const namePair = `${dataA.input.name}님과 ${dataB.input.name}님`;
  const labelA = dayLabel(dataA);
  const labelB = dayLabel(dataB);

  return {
    ohaengRelation: relation.headline,
    summary,
    light: {
      gijil: {
        headline: '기질의 접점',
        body: `${namePair}은 ${withAndParticle(labelA)} ${labelB}의 만남으로 읽습니다. ${relation.body} 이 해석은 관계 결정을 대신하지 않고, 서로의 반복 패턴을 점검하는 참고 신호입니다.`,
      },
      sothrough: {
        headline: '대화의 리듬',
        body: `${dataA.input.name}님은 ${ELEMENT_KO[strongestElement(dataA.wuxing)]} 기운이 앞서고, ${dataB.input.name}님은 ${ELEMENT_KO[strongestElement(dataB.wuxing)]} 기운이 먼저 보입니다. 대화에서는 결론을 빨리 내기보다 각자 무엇을 안정감으로 느끼는지 확인하는 순서가 좋습니다.`,
      },
      strength: {
        headline: '관계의 자원',
        body: `자미두수로는 ${dataA.input.name}님에게 ${ziweiAnchor(dataA)}, ${dataB.input.name}님에게 ${ziweiAnchor(dataB)} 신호가 보입니다. 서양점성으로는 ${natalAnchor(dataA)}와 ${natalAnchor(dataB)}의 리듬 차이가 관계의 색을 만듭니다. 강점은 서로 다른 관찰점을 제공한다는 데 있고, 주의점은 상대의 속도를 내 기준으로 해석하지 않는 것입니다.`,
      },
      samsinMessage: summary,
    },
    deep: includeDeep
      ? {
        emotion: {
          headline: '감정 확인 방식',
          body: `감정은 맞고 틀림보다 확인 주기가 중요합니다. ${dataA.input.name}님은 ${ELEMENT_KO[elementA]} 방식으로 반응하고, ${dataB.input.name}님은 ${ELEMENT_KO[elementB]} 방식으로 받아들이기 쉬워 말의 속도와 회복 시간을 따로 합의하는 편이 안정적입니다.`,
        },
        longterm: {
          headline: '오래 가는 조건',
          body: '오래 가는 관계는 큰 약속보다 작은 반복에서 만들어집니다. 돈, 가족, 일처럼 현실 부담이 커지는 주제는 점술식 결론보다 역할과 일정, 비용의 기준을 먼저 정할 때 관계 에너지가 덜 새어 나갑니다.',
        },
        sokgungham: {
          headline: '친밀감의 결',
          body: '친밀감은 운으로 고정되는 것이 아니라 신뢰가 쌓이는 방식에서 달라집니다. 가까워질수록 상대의 침묵이나 속도를 거절로 단정하지 말고, 필요한 거리와 표현 방식을 직접 확인하는 것이 좋습니다.',
        },
        bestTime: '좋은 시기는 둘 중 한쪽이 밀어붙이는 때가 아니라, 두 사람이 같은 약속을 같은 말로 설명할 수 있을 때입니다.',
      }
      : undefined,
  };
}
