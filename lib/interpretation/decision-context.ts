import type { TrinityAnalysis } from './decision';

export interface DecisionClaimGrounding {
  claimId: string;
  sourceClaimId: string;
  system: 'saju' | 'ziwei' | 'natal';
  axis: TrinityAnalysis['normalizedClaims'][number]['axis'];
  summary: string;
}

export interface DecisionContext {
  headline: string;
  diagnosis: string;
  mainStrategy: string;
  caution: string;
  convergence: string[];
  divergence: string[];
  nowActions: string[];
  avoidActions: string[];
  claimRefs: string[];
  claimGrounding: DecisionClaimGrounding[];
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(value => value.trim().length > 0))];
}

export function buildDecisionContextFromTrinity(analysis: TrinityAnalysis): DecisionContext {
  const convergence = analysis.comparison.convergence
    .filter(item => item.finalWeight === 'core_strategy' || item.finalWeight === 'important')
    .map(item => item.summary);
  const fallbackConvergence = analysis.comparison.convergence.map(item => item.summary);

  const divergence = analysis.comparison.divergence.map(item =>
    item.resolution?.translatedAdvice ?? item.summary,
  );

  const actionGroups = Object.values(analysis.actionPlan).flat();
  const comparisonRefs = [
    ...analysis.comparison.convergence.flatMap(item => item.claimIds),
    ...analysis.comparison.divergence.flatMap(item => item.claimIds),
  ];
  const actionRefs = actionGroups.flatMap(advice => advice.basedOnClaims);
  const selectedRefs = unique([...actionRefs, ...comparisonRefs]);
  const claimGrounding = selectedRefs
    .map(ref => {
      const claim = analysis.normalizedClaims.find(item => item.sourceClaimId === ref || item.id === ref);
      if (!claim) return null;
      return {
        claimId: claim.id,
        sourceClaimId: claim.sourceClaimId,
        system: claim.system,
        axis: claim.axis,
        summary: claim.normalizedStatement,
      };
    })
    .filter((item): item is DecisionClaimGrounding => Boolean(item))
    .slice(0, 8);

  return {
    headline: analysis.userFacingSummary.headline,
    diagnosis: analysis.situation.diagnosis.rationale,
    mainStrategy: analysis.userFacingSummary.mainStrategy,
    caution: analysis.userFacingSummary.caution,
    convergence: convergence.length > 0 ? convergence : fallbackConvergence.slice(0, 3),
    divergence: divergence.slice(0, 3),
    nowActions: analysis.actionPlan.now.map(advice => advice.action),
    avoidActions: analysis.actionPlan.avoid.map(advice => advice.action),
    claimRefs: selectedRefs,
    claimGrounding,
  };
}
