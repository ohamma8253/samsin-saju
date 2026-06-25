import type { ClaimPlan, DomainConsensus, EvidenceDomain, InterpretationEvidence } from './evidence';
import { auditClaimPlanSafety, DEFAULT_SAFETY_POLICY, type SafetyPolicy } from './safety';

const DOMAIN_TONE: Record<EvidenceDomain, ClaimPlan['tone']> = {
  temperament: 'reflective',
  money_pattern: 'analytical',
  career: 'analytical',
  relationship_pattern: 'reflective',
  timing: 'cautious',
  risk_pattern: 'cautious',
  growth: 'reflective',
  wellbeing_reflection: 'cautious',
};

function evidenceById(evidence: InterpretationEvidence[]): Map<string, InterpretationEvidence> {
  return new Map(evidence.map(item => [item.id, item]));
}

function maxUnsupportedExpansionRisk(consensus: DomainConsensus): ClaimPlan['audit']['unsupportedExpansionRisk'] {
  if (consensus.consensusType === 'structured_conflict' || consensus.rendererConstraints.mustMentionConflict) return 'medium';
  if (consensus.consensusType === 'single_system_only' || consensus.rendererConstraints.mustMentionUncertainty) return 'medium';
  return 'low';
}

function visibleClaim(consensus: DomainConsensus): string {
  if (consensus.finalClaimStrength === 'weak') {
    return `${consensus.summaryClaim} 확정이 아니라 참고할 만한 흐름으로만 본다.`;
  }
  if (consensus.finalClaimStrength === 'strong') {
    return `${consensus.summaryClaim} 다만 건강, 투자, 관계 결정처럼 현실 결정을 대신하지 않는다.`;
  }
  return consensus.summaryClaim;
}

export function buildClaimPlans(
  consensusItems: DomainConsensus[],
  evidence: InterpretationEvidence[],
  policy: SafetyPolicy = DEFAULT_SAFETY_POLICY,
): ClaimPlan[] {
  const lookup = evidenceById(evidence);

  return consensusItems
    .filter(item => item.finalClaimStrength !== 'none')
    .filter(item => item.supportingEvidenceIds.length > 0)
    .map(consensus => {
      const supporting = consensus.supportingEvidenceIds
        .map(id => lookup.get(id))
        .filter((item): item is InterpretationEvidence => Boolean(item));
      const hasRule = supporting.every(item => Boolean(item.provenance.ruleId));
      const requiredCaveats = supporting
        .map(item => item.userFacing.caveat)
        .filter((value): value is string => Boolean(value));
      const requiredBasis = supporting.flatMap(item => item.userFacing.basis).slice(0, 3);

      const draft: ClaimPlan = {
        claimId: `claim.${consensus.domain}.${String(consensus.claimAxis)}.v1`,
        consensusId: consensus.id,
        domain: consensus.domain,
        claimAxis: consensus.claimAxis,
        userVisibleClaim: visibleClaim(consensus),
        evidenceIds: consensus.supportingEvidenceIds,
        claimStrength: consensus.finalClaimStrength === 'none' ? 'weak' : consensus.finalClaimStrength,
        tone: DOMAIN_TONE[consensus.domain],
        mustInclude: [
          consensus.summaryClaim,
          ...requiredBasis,
          ...requiredCaveats,
        ],
        mustAvoid: [
          ...policy.forbiddenPhrases,
          ...supporting.flatMap(item => item.claimBinding.forbiddenClaimAxes),
        ],
        audit: {
          hasEvidence: consensus.supportingEvidenceIds.length > 0,
          hasRule,
          safetyPassed: false,
          unsupportedExpansionRisk: maxUnsupportedExpansionRisk(consensus),
        },
      };

      return {
        ...draft,
        audit: auditClaimPlanSafety(draft, consensus, policy),
      };
    })
    .filter(item => item.audit.hasEvidence && item.audit.hasRule && item.audit.safetyPassed)
    .sort((a, b) => {
      const strengthRank = { strong: 3, moderate: 2, weak: 1 };
      return strengthRank[b.claimStrength] - strengthRank[a.claimStrength] || a.claimId.localeCompare(b.claimId);
    });
}
