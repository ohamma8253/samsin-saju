import type { FinalSynthesis } from '../claude';
import type { ConsensusMetrics } from '../consensus';
import type { Prescription } from '../prescription';
import { buildDecisionContextFromTrinity } from './decision-context';
import type { Advice, TrinityAnalysis } from './decision';

function firstOrFallback(values: string[], fallback: string): string {
  return values.find(value => value.trim().length > 0) ?? fallback;
}

function sentenceList(values: string[], fallback: string): string {
  const filtered = values.filter(value => value.trim().length > 0).slice(0, 3);
  return filtered.length > 0 ? filtered.join(' ') : fallback;
}

function adviceText(advice: Advice[] | undefined, fallback: string): string {
  if (!advice || advice.length === 0) return fallback;
  return advice
    .slice(0, 2)
    .map(item => `${item.action} 이유는 ${item.reason}`)
    .join(' ');
}

function consensusNote(analysis: TrinityAnalysis, metrics?: ConsensusMetrics): string {
  if (metrics?.level === 'unanimous') {
    return '세 관점이 같은 방향의 기준을 강하게 봅니다.';
  }
  if (metrics?.level === 'conflict') {
    return '세 관점이 보는 우선순위가 갈리므로 공통 신호와 조건부 신호를 나눠야 합니다.';
  }
  const convergenceCount = analysis.comparison.convergence.length;
  const divergenceCount = analysis.comparison.divergence.length;
  return `공통 신호 ${convergenceCount}개와 관점 차이 ${divergenceCount}개를 함께 봅니다.`;
}

function buildVoices(analysis: TrinityAnalysis): FinalSynthesis['voices'] {
  const sajuClaim = analysis.portrait.saju.coreClaims[0]?.statement
    ?? '현실 기준과 책임 경계를 먼저 확인해야 합니다.';
  const ziweiClaim = analysis.portrait.ziwei.coreClaims[0]?.statement
    ?? '맡는 자리와 역할의 변화를 차분히 봐야 합니다.';
  const natalClaim = analysis.portrait.natal.coreClaims[0]?.statement
    ?? '압박과 회복 리듬을 함께 살펴야 해요.';

  return {
    cheongwoon: `청운은 ${analysis.portrait.saju.nativeSummary} ${sajuClaim}`,
    taeeul: `태을은 ${analysis.portrait.ziwei.nativeSummary} ${ziweiClaim}`,
    luna: `루나는 ${analysis.portrait.natal.nativeSummary} ${natalClaim}`,
  };
}

function buildDissent(
  analysis: TrinityAnalysis,
  metrics?: ConsensusMetrics,
): FinalSynthesis['dissent'] {
  if (metrics?.level !== 'conflict') return undefined;
  const argument = analysis.comparison.divergence[0]?.resolution?.translatedAdvice
    ?? analysis.comparison.divergence[0]?.summary;
  if (!argument) return undefined;
  return {
    voice: metrics.dominantVoice,
    argument,
  };
}

export function buildFinalSynthesisFromTrinity(
  analysis: TrinityAnalysis,
  metrics?: ConsensusMetrics,
  prescription?: Prescription,
): FinalSynthesis {
  const decision = buildDecisionContextFromTrinity(analysis);
  const convergence = firstOrFallback(
    decision.convergence,
    '세 관점 모두 지금은 결론보다 기준을 먼저 세우는 쪽을 봅니다.',
  );
  const divergence = firstOrFallback(
    decision.divergence,
    '관점 차이는 크지 않지만, 실행 순서와 부담의 크기는 나눠서 봐야 합니다.',
  );
  const nowAdvice = adviceText(
    analysis.actionPlan.now,
    decision.mainStrategy,
  );
  const nextAdvice = adviceText(
    analysis.actionPlan.next3Months,
    '다음 30일은 큰 결론보다 작은 검증과 조건 정리에 쓰는 편이 좋습니다.',
  );
  const avoidAdvice = sentenceList(
    analysis.actionPlan.avoid.map(item => item.action),
    decision.caution,
  );

  return {
    verdict: `${decision.headline}. ${decision.diagnosis} 이 정리는 결과를 보장하는 답이 아니라, 사주와 자미두수와 서양점성이 함께 짚은 근거를 오늘의 선택 기준으로 번역한 것입니다.`,
    consensusLevel: metrics?.level ?? 'majority',
    consensusNote: consensusNote(analysis, metrics),
    pillars: [
      {
        icon: '1',
        title: '공통 신호',
        body: `${convergence} 그래서 마지막 판단은 감정의 크기보다 반복되는 조건을 먼저 확인하는 쪽으로 잡습니다.`,
      },
      {
        icon: '2',
        title: '관점 차이',
        body: `${divergence} 한 관점만 따라가기보다 돈, 역할, 회복 리듬을 나눠서 보면 무리한 결정을 줄일 수 있습니다.`,
      },
      {
        icon: '3',
        title: '오늘의 기준',
        body: `${decision.mainStrategy} ${decision.caution}`,
      },
    ],
    nowAdvice: `${nowAdvice} ${nextAdvice} 피할 기준은 ${avoidAdvice}`,
    prescription,
    voices: buildVoices(analysis),
    seal: firstOrFallback(
      analysis.actionPlan.now.map(item => item.action),
      '오늘은 결론보다 기준을 먼저 세우세요.',
    ),
    dissent: buildDissent(analysis, metrics),
  };
}
