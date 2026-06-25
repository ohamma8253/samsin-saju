import type { ClaimPlan, DomainConsensus, EvidenceDomain } from './evidence';

export type DeterministicClaimCategory =
  | 'medical'
  | 'death'
  | 'accident'
  | 'pregnancy'
  | 'investment'
  | 'legal'
  | 'marriage'
  | 'divorce'
  | 'breakup';

export interface SafetyPolicy {
  policyVersion: string;
  forbiddenClaimAxes: string[];
  forbiddenPhrases: string[];
  deterministicClaimBlocklist: DeterministicClaimCategory[];
  maxClaimStrengthByDomain: Record<EvidenceDomain, 'weak' | 'moderate' | 'strong'>;
  paidReportDisclaimers: string[];
}

export const DEFAULT_SAFETY_POLICY: SafetyPolicy = {
  policyVersion: 'SAMSIN_SAFETY_V1',
  forbiddenClaimAxes: [
    'medical_diagnosis',
    'death_prediction',
    'accident_prediction',
    'pregnancy_prediction',
    'investment_action',
    'legal_outcome',
    'guaranteed_marriage',
    'guaranteed_divorce',
    'guaranteed_breakup',
  ],
  forbiddenPhrases: [
    '100% 적중',
    '운명 확정',
    '수익 보장',
    '결혼 확정',
    '반드시 헤어져',
    '반드시 결혼',
    '질병이 생긴다',
    '사망한다',
  ],
  deterministicClaimBlocklist: [
    'medical',
    'death',
    'accident',
    'pregnancy',
    'investment',
    'legal',
    'marriage',
    'divorce',
    'breakup',
  ],
  maxClaimStrengthByDomain: {
    temperament: 'strong',
    money_pattern: 'moderate',
    career: 'moderate',
    relationship_pattern: 'moderate',
    timing: 'weak',
    risk_pattern: 'weak',
    growth: 'moderate',
    wellbeing_reflection: 'weak',
  },
  paidReportDisclaimers: [
    '이 결과는 엔터테인먼트와 자기성찰 목적의 상징적 해석입니다.',
    '건강, 법률, 투자, 관계 결정을 대신하지 않습니다.',
    '세 체계의 합의는 사실 확정이 아니라 계산된 상징 신호의 요약입니다.',
  ],
};

const SAFE_NEGATION_PATTERNS = [
  /보장(?:하는|된)?\s+(?:답|정답|예언|결과)[^.!?。！？]*(?:아니라|아닙니다)/,
  /보장(?:하는|된)?\s+근거로\s+쓰지\s+않/,
  /보장하지\s+않/,
  /확정(?:하는|된)?\s+(?:답|정답|예언|결과)[^.!?。！？]*(?:아니라|아닙니다)/,
  /(?:결혼|이혼|이별|헤어짐|재회|외도)[^.!?。！？]{0,24}확정(?:은|이)?\s+아니(?:다|라|에요|예요|며|고|라고)/,
  /(?:결혼|이혼|이별|헤어짐|재회|외도)[^.!?。！？]{0,24}확정(?:이|하는|된)?\s+아니라/,
  /확정하지\s+않/,
  /확정하기보다/,
  /정해져\s+있지\s+않/,
  /(?:건강|투자|법률|관계)\s*(?:결정|판단)[^.!?。！？]*(?:대신하지|정하지\s+말고|전문가)/,
];

const FORBIDDEN_DETERMINISTIC_PATTERNS = [
  /(?:건강|질병|병원|수술|임신|사망|사고).{0,16}(?:반드시|무조건|확실히|확정|생긴다|된다|예정|피할\s+수\s+없다)/,
  /(?:반드시|무조건|확실히|확정|생긴다|된다).{0,16}(?:질병|병원|수술|임신|사망|사고)/,
  /(?:돈|투자|주식|코인|부동산|매수|매도|수익|손실|원금).{0,16}(?:반드시|무조건|확실히|확정|보장|오른다|내린다|사라진다)/,
  /(?:수익|이익|원금).{0,8}(?:보장|확정)/,
  /(?:법률|소송|재판|계약|고소).{0,16}(?:반드시|무조건|확실히|승소|패소|확정|유리하다)/,
  /(?:반드시|무조건|확실히|확정).{0,16}(?:승소|패소|고소|계약)/,
  /(?:결혼|이혼|이별|헤어짐|재회|외도).{0,16}(?:반드시|무조건|확실히|확정|한다|된다|해야\s+한다|피할\s+수\s+없다)/,
  /반드시\s+(?:헤어져|헤어진다|결혼|이혼|재회|고소|투자|매수|매도|수술)/,
  /(?:헤어져야|결혼해야|이혼해야|재회해야|투자해야|매수해야|매도해야|수술해야|고소해야)\s*(?:합니다|해요|한다)?/,
];

function removeSafeNegations(text: string): string {
  return SAFE_NEGATION_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, ''),
    text,
  );
}

export function containsForbiddenPhrase(text: string, policy: SafetyPolicy = DEFAULT_SAFETY_POLICY): boolean {
  const cleaned = removeSafeNegations(text);
  return (
    policy.forbiddenPhrases.some(phrase => cleaned.includes(phrase)) ||
    FORBIDDEN_DETERMINISTIC_PATTERNS.some(pattern => pattern.test(cleaned))
  );
}

export function auditClaimPlanSafety(
  claimPlan: ClaimPlan,
  consensus: DomainConsensus | undefined,
  policy: SafetyPolicy = DEFAULT_SAFETY_POLICY,
): ClaimPlan['audit'] {
  const maxStrength = policy.maxClaimStrengthByDomain[claimPlan.domain];
  const forbiddenAxis = policy.forbiddenClaimAxes.includes(String(claimPlan.claimAxis));
  const forbiddenPhrase = containsForbiddenPhrase(claimPlan.userVisibleClaim, policy);
  const unsafeConsensus =
    consensus?.safety.medicalClaimRisk ||
    consensus?.safety.legalClaimRisk ||
    consensus?.safety.investmentClaimRisk ||
    consensus?.safety.relationshipDeterminismRisk ||
    consensus?.safety.fatalismRisk ||
    false;

  const strengthAllowed =
    maxStrength === 'strong' ||
    claimPlan.claimStrength === 'weak' ||
    (maxStrength === 'moderate' && claimPlan.claimStrength !== 'strong');

  return {
    hasEvidence: claimPlan.evidenceIds.length > 0,
    hasRule: claimPlan.audit.hasRule,
    safetyPassed: !forbiddenAxis && !forbiddenPhrase && !unsafeConsensus && strengthAllowed,
    unsupportedExpansionRisk: claimPlan.audit.unsupportedExpansionRisk,
  };
}
