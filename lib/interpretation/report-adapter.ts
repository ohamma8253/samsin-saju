import type { TrinityAnalysis } from './decision';
import {
  buildDecisionContextFromTrinity,
  type DecisionClaimGrounding,
} from './decision-context';

export interface TrinityPaidReport {
  headline: string;
  summary: string;
  diagnosis: string;
  mainStrategy: string;
  caution: string;
  convergence: string[];
  divergence: string[];
  actionPlan: {
    now: string[];
    next3Months: string[];
    next6To12Months: string[];
    avoid: string[];
  };
  claimRefs: string[];
  claimGrounding: DecisionClaimGrounding[];
  modelRouting: TrinityAnalysis['modelRouting'];
  audit: TrinityAnalysis['audit'];
}

export function buildTrinityPaidReport(analysis: TrinityAnalysis): TrinityPaidReport {
  const context = buildDecisionContextFromTrinity(analysis);

  return {
    headline: context.headline,
    summary: analysis.userFacingSummary.shortSummary,
    diagnosis: context.diagnosis,
    mainStrategy: context.mainStrategy,
    caution: context.caution,
    convergence: context.convergence,
    divergence: context.divergence,
    actionPlan: {
      now: context.nowActions,
      next3Months: analysis.actionPlan.next3Months.map(advice => advice.action),
      next6To12Months: analysis.actionPlan.next6To12Months.map(advice => advice.action),
      avoid: context.avoidActions,
    },
    claimRefs: context.claimRefs,
    claimGrounding: context.claimGrounding,
    modelRouting: analysis.modelRouting,
    audit: analysis.audit,
  };
}

export function collectTrinityPaidReportText(report: TrinityPaidReport): string[] {
  return [
    report.headline,
    report.summary,
    report.diagnosis,
    report.mainStrategy,
    report.caution,
    ...report.convergence,
    ...report.divergence,
    ...report.actionPlan.now,
    ...report.actionPlan.next3Months,
    ...report.actionPlan.next6To12Months,
    ...report.actionPlan.avoid,
    ...report.claimGrounding.map(item => item.summary),
  ];
}
