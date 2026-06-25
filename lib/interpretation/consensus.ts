import type {
  ClaimAxis,
  ClaimStrength,
  DivinationSystem,
  DomainConsensus,
  DomainVote,
  EvidenceConfidence,
  EvidenceDomain,
  InterpretationEvidence,
} from './evidence';
import { DEFAULT_SAFETY_POLICY, type SafetyPolicy } from './safety';

const SYSTEMS: DivinationSystem[] = ['saju', 'ziwei', 'natal'];

const AXIS_LABELS: Record<string, string> = {
  career_independence: '독립적으로 판을 짜는 직업 흐름',
  career_stability: '역할과 책임이 누적되는 직업 흐름',
  money_volatility: '돈의 흐름이 커졌다 작아지는 패턴',
  money_accumulation: '자원을 모으고 축적하는 패턴',
  relationship_autonomy: '관계 안에서 거리와 자율성을 조절하는 패턴',
  relationship_commitment: '관계 안에서 안정감과 몰입을 만드는 패턴',
  public_visibility: '밖으로 드러나는 역할과 평판',
  learning_style: '배우고 판단하는 방식',
  timing_change_pressure: '현재 선택 압력이 강해지는 흐름',
  emotional_recovery: '감정과 생활 리듬을 회복하는 방식',
  self_expression: '자기 표현과 기본 기질',
};

const CONFLICTING_AXES: Record<string, string[]> = {
  career_independence: ['career_stability'],
  career_stability: ['career_independence'],
  money_volatility: ['money_accumulation'],
  money_accumulation: ['money_volatility'],
  relationship_autonomy: ['relationship_commitment'],
  relationship_commitment: ['relationship_autonomy'],
};

function confidenceRank(confidence: EvidenceConfidence): number {
  if (confidence === 'high') return 3;
  if (confidence === 'medium') return 2;
  return 1;
}

function aggregateConfidence(items: InterpretationEvidence[]): EvidenceConfidence {
  const best = Math.max(...items.map(item => confidenceRank(item.confidence)), 1);
  if (best >= 3) return 'high';
  if (best >= 2) return 'medium';
  return 'low';
}

function strengthFromWeight(weight: number): DomainVote['strength'] {
  if (weight >= 82) return 5;
  if (weight >= 70) return 4;
  if (weight >= 58) return 3;
  if (weight >= 45) return 2;
  return 1;
}

function voteFor(system: DivinationSystem, supporting: InterpretationEvidence[], dissenting: InterpretationEvidence[]): DomainVote {
  const support = supporting.filter(item => item.system === system);
  const dissent = dissenting.filter(item => item.system === system);
  const items = [...support, ...dissent];

  if (items.length === 0) {
    return {
      vote: 'no_signal',
      strength: 0,
      confidence: 'low',
      evidenceIds: [],
    };
  }

  const maxWeight = Math.max(...items.map(item => item.weight));
  const strength = strengthFromWeight(maxWeight);
  const confidence = aggregateConfidence(items);
  const caveat = items
    .map(item => item.userFacing.caveat)
    .filter((value): value is string => Boolean(value))[0];

  if (support.length > 0 && dissent.length > 0) {
    return {
      vote: 'mixed',
      strength,
      confidence,
      evidenceIds: items.map(item => item.id),
      caveat,
    };
  }

  if (support.length > 0) {
    return {
      vote: 'support',
      strength,
      confidence,
      evidenceIds: support.map(item => item.id),
      caveat,
    };
  }

  return {
    vote: 'refute',
    strength,
    confidence,
    evidenceIds: dissent.map(item => item.id),
    caveat,
  };
}

function maxClaimStrengthAllowed(
  domain: EvidenceDomain,
  supporting: InterpretationEvidence[],
  consensusType: DomainConsensus['consensusType'],
  policy: SafetyPolicy,
): ClaimStrength {
  if (supporting.length === 0 || consensusType === 'insufficient_evidence') return 'none';

  const domainMax = policy.maxClaimStrengthByDomain[domain];
  const evidenceCaps = supporting.map(item => item.claimBinding.maxClaimStrength);
  const hasWeakCap = evidenceCaps.includes('weak');
  const hasModerateCap = evidenceCaps.includes('moderate');
  const averageStrength = supporting.reduce((sum, item) => sum + strengthFromWeight(item.weight), 0) / supporting.length;
  const hasHighConfidence = supporting.some(item => item.confidence === 'high');

  if (domainMax === 'weak' || hasWeakCap || consensusType === 'single_system_only' || consensusType === 'structured_conflict') {
    return 'weak';
  }
  if (domainMax === 'moderate' || hasModerateCap || consensusType === 'partial_convergence') {
    return averageStrength >= 2 ? 'moderate' : 'weak';
  }
  if (consensusType === 'strong_convergence' && averageStrength >= 4 && hasHighConfidence) {
    return 'strong';
  }
  return averageStrength >= 3 ? 'moderate' : 'weak';
}

function consensusTypeFromVotes(votes: DomainConsensus['votes']): DomainConsensus['consensusType'] {
  const values = Object.values(votes);
  const supportCount = values.filter(vote => vote.vote === 'support' || vote.vote === 'mixed').length;
  const refuteCount = values.filter(vote => vote.vote === 'refute' || vote.vote === 'mixed').length;

  if (supportCount === 0) return 'insufficient_evidence';
  if (supportCount >= 1 && refuteCount >= 1) return 'structured_conflict';
  if (supportCount >= 3) return 'strong_convergence';
  if (supportCount === 2) return 'partial_convergence';
  return 'single_system_only';
}

function hasSafetyRisk(domain: EvidenceDomain, axis: ClaimAxis, supporting: InterpretationEvidence[]): DomainConsensus['safety'] {
  const axisText = String(axis);
  const medicalClaimRisk = domain === 'wellbeing_reflection' && supporting.some(item => item.claimBinding.maxClaimStrength !== 'weak');
  return {
    medicalClaimRisk,
    legalClaimRisk: axisText.includes('legal'),
    investmentClaimRisk: axisText.includes('investment'),
    relationshipDeterminismRisk: axisText.includes('guaranteed_') || axisText.includes('marriage_prediction'),
    fatalismRisk: supporting.some(item => item.claim.includes('운명 확정')),
  };
}

function summaryClaim(domain: EvidenceDomain, axis: ClaimAxis, type: DomainConsensus['consensusType']): string {
  const label = AXIS_LABELS[String(axis)] ?? String(axis);
  if (type === 'strong_convergence') return `세 체계가 모두 ${label}을 핵심 신호로 본다.`;
  if (type === 'partial_convergence') return `두 체계 이상이 ${label}을 반복 신호로 본다.`;
  if (type === 'structured_conflict') return `${label}은 맞는 이유와 조심해야 할 이유가 함께 보인다.`;
  if (type === 'single_system_only') return `${label}은 한 관점에서만 보여서 가볍게 참고한다.`;
  return `${label}은 아직 뚜렷하게 말하기 어렵다.`;
}

function groupKey(domain: EvidenceDomain, axis: ClaimAxis): string {
  return `${domain}:${String(axis)}`;
}

export function buildDomainConsensus(
  evidence: InterpretationEvidence[],
  policy: SafetyPolicy = DEFAULT_SAFETY_POLICY,
): DomainConsensus[] {
  const groups = new Map<string, { domain: EvidenceDomain; axis: ClaimAxis; evidence: InterpretationEvidence[] }>();
  for (const item of evidence) {
    const key = groupKey(item.domain, item.claimAxis);
    const group = groups.get(key);
    if (group) {
      group.evidence.push(item);
    } else {
      groups.set(key, { domain: item.domain, axis: item.claimAxis, evidence: [item] });
    }
  }

  return [...groups.values()]
    .map(group => {
      const conflictAxes = new Set(CONFLICTING_AXES[String(group.axis)] ?? []);
      const sameDomainEvidence = evidence.filter(item => item.domain === group.domain);
      const dissenting = sameDomainEvidence.filter(item => conflictAxes.has(String(item.claimAxis)));
      const votes = Object.fromEntries(SYSTEMS.map(system => [
        system,
        voteFor(system, group.evidence, dissenting),
      ])) as Required<DomainConsensus['votes']>;
      const consensusType = consensusTypeFromVotes(votes);
      const finalClaimStrength = maxClaimStrengthAllowed(group.domain, group.evidence, consensusType, policy);
      const safety = hasSafetyRisk(group.domain, group.axis, group.evidence);
      const confidenceNeedsCaveat = group.evidence.some(item => item.confidence !== 'high' || item.claimBinding.requiresCaveat);
      const conflictNotes = dissenting.length > 0
        ? [`다르게 보는 이유: ${[...new Set(dissenting.map(item => String(item.claimAxis)))].join(', ')}`]
        : [];

      return {
        id: `consensus.${group.domain}.${String(group.axis)}.v1`,
        domain: group.domain,
        claimAxis: group.axis,
        claimKey: groupKey(group.domain, group.axis),
        summaryClaim: summaryClaim(group.domain, group.axis, consensusType),
        votes,
        consensusType,
        finalClaimStrength,
        supportingEvidenceIds: group.evidence.map(item => item.id),
        dissentEvidenceIds: dissenting.map(item => item.id),
        missingSystemReasons: SYSTEMS
          .filter(system => votes[system].vote === 'no_signal')
          .map(system => `${system}: no accepted evidence for ${group.domain}/${String(group.axis)}`),
        contradictionNotes: conflictNotes,
        safety,
        rendererConstraints: {
          mustMentionUncertainty: confidenceNeedsCaveat || consensusType === 'single_system_only',
          mustMentionConflict: consensusType === 'structured_conflict',
          prohibitedPhrases: policy.forbiddenPhrases,
          requiredCaveat: group.evidence
            .map(item => item.userFacing.caveat)
            .filter((value): value is string => Boolean(value))[0],
        },
      } satisfies DomainConsensus;
    })
    .sort((a, b) => {
      const typeRank: Record<DomainConsensus['consensusType'], number> = {
        strong_convergence: 5,
        partial_convergence: 4,
        structured_conflict: 3,
        single_system_only: 2,
        insufficient_evidence: 1,
      };
      return typeRank[b.consensusType] - typeRank[a.consensusType] ||
        b.supportingEvidenceIds.length - a.supportingEvidenceIds.length ||
        a.id.localeCompare(b.id);
    });
}
