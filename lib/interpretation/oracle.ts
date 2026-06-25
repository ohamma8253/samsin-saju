import type { SamsinData } from '../saju';
import type { ClaimPlan, DomainConsensus, DivinationSystem, InterpretationEvidence } from './evidence';
import { buildClaimPlans } from './claim-plan';
import { buildDomainConsensus } from './consensus';
import { extractSamsinEvidence } from './bundle';
import { DEFAULT_SAFETY_POLICY, type SafetyPolicy } from './safety';

const SYSTEM_LABEL: Record<DivinationSystem, string> = {
  saju: '사주',
  ziwei: '자미두수',
  natal: '서양점성',
};

export interface SamsinOracleCore {
  evidence: InterpretationEvidence[];
  consensus: DomainConsensus[];
  claimPlans: ClaimPlan[];
  safetyPolicyVersion: string;
}

export function buildSamsinOracleCore(
  data: SamsinData,
  policy: SafetyPolicy = DEFAULT_SAFETY_POLICY,
): SamsinOracleCore {
  const evidence = extractSamsinEvidence(data);
  const consensus = buildDomainConsensus(evidence, policy);
  const claimPlans = buildClaimPlans(consensus, evidence, policy);
  return {
    evidence,
    consensus,
    claimPlans,
    safetyPolicyVersion: policy.policyVersion,
  };
}

export function formatOraclePromptContext(data: SamsinData, maxClaimPlans = 10): string {
  const oracle = buildSamsinOracleCore(data);
  if (oracle.claimPlans.length === 0) {
    return '삼신 오라클 ClaimPlan 없음. 이유가 부족하거나 입력이 불확실하면 강하게 단정하지 않는다.';
  }

  const evidenceById = new Map(oracle.evidence.map(item => [item.id, item]));
  return oracle.claimPlans.slice(0, maxClaimPlans).map(plan => {
    const evidenceLines = plan.evidenceIds
      .map(id => evidenceById.get(id))
      .filter((item): item is InterpretationEvidence => Boolean(item))
      .map(item => {
        const caveat = item.userFacing.caveat ? ` caveat=${item.userFacing.caveat}` : '';
        return `${SYSTEM_LABEL[item.system]}:${item.id}:${item.userFacing.basis.join(' / ')}${caveat}`;
      });
    return [
      `- claim_id=${plan.claimId}`,
      `consensus_id=${plan.consensusId ?? 'none'}`,
      `domain=${plan.domain}`,
      `axis=${String(plan.claimAxis)}`,
      `strength=${plan.claimStrength}`,
      `tone=${plan.tone}`,
      `claim=${plan.userVisibleClaim}`,
      `evidence=${evidenceLines.join(' || ')}`,
      `avoid=${plan.mustAvoid.slice(0, 8).join(', ')}`,
    ].join(' | ');
  }).join('\n');
}
