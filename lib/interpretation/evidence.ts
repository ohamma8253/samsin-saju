export type DivinationSystem = 'saju' | 'ziwei' | 'natal';

export type EvidenceDomain =
  | 'temperament'
  | 'money_pattern'
  | 'career'
  | 'relationship_pattern'
  | 'timing'
  | 'risk_pattern'
  | 'growth'
  | 'wellbeing_reflection';

export type ClaimAxis =
  | 'career_independence'
  | 'career_stability'
  | 'money_volatility'
  | 'money_accumulation'
  | 'relationship_autonomy'
  | 'relationship_commitment'
  | 'public_visibility'
  | 'learning_style'
  | 'timing_change_pressure'
  | 'emotional_recovery'
  | 'self_expression'
  | string;

export type EvidencePolarity = 'supportive' | 'challenging' | 'mixed' | 'neutral';
export type EvidenceConfidence = 'high' | 'medium' | 'low';
export type ClaimStrength = 'none' | 'weak' | 'moderate' | 'strong';
export type BirthTimePrecision = 'exact' | 'range' | 'unknown';

export type EvidenceSourceType =
  | 'computed_chart'
  | 'derived_feature'
  | 'rule_signal'
  | 'oracle_fixture'
  | 'human_review';

export interface EvidenceSource {
  sourceType: EvidenceSourceType;
  sourceRefs: string[];
  researchNoteIds?: string[];
  licenseConstraint?: string;
}

export interface CalculationProvenance {
  extractorVersion: string;
  calculationVersion: string;
  ruleId: string;
  ruleVersion: string;
  schoolOrMethod: string;
  oracleName?: string;
  oracleVersion?: string;
}

export interface EvidenceInputContext {
  birthDate: string;
  birthTime?: string;
  birthTimePrecision: BirthTimePrecision;
  timezone?: string;
  location?: string;
  calendarInputType?: 'solar' | 'lunar';
  lunarLeapMonth?: boolean;
  analysisYear?: number;
}

export interface FeatureTrace {
  rawFeatureRefs: string[];
  derivedFeatureRefs: string[];
  featurePath: string;
  featureValue: unknown;
  normalizedScore?: number;
}

export interface EvidenceUncertainty {
  level: 'low' | 'medium' | 'high';
  reasons: string[];
  birthTimeSensitive: boolean;
  schoolVariantSensitive: boolean;
  missingInputs: string[];
}

export interface ClaimBinding {
  allowedClaimAxes: string[];
  forbiddenClaimAxes: string[];
  maxClaimStrength: Exclude<ClaimStrength, 'none'>;
  requiresCaveat: boolean;
  requiresSafetyDisclaimer: boolean;
}

export interface UserFacingEvidence {
  basis: string[];
  adviceHint?: string;
  caveat?: string;
  jargonTerms?: string[];
}

export interface InterpretationEvidence {
  id: string;
  system: DivinationSystem;
  domain: EvidenceDomain;
  claimAxis: ClaimAxis;
  weight: number;
  polarity: EvidencePolarity;
  confidence: EvidenceConfidence;
  title: string;
  claim: string;
  source: EvidenceSource;
  provenance: CalculationProvenance;
  inputContext: EvidenceInputContext;
  featureTrace: FeatureTrace;
  uncertainty: EvidenceUncertainty;
  claimBinding: ClaimBinding;
  userFacing: UserFacingEvidence;
}

export interface DomainVote {
  vote: 'support' | 'refute' | 'mixed' | 'no_signal';
  strength: 0 | 1 | 2 | 3 | 4 | 5;
  confidence: EvidenceConfidence;
  evidenceIds: string[];
  caveat?: string;
}

export interface DomainConsensus {
  id: string;
  domain: EvidenceDomain;
  claimAxis: ClaimAxis;
  claimKey: string;
  summaryClaim: string;
  votes: {
    saju?: DomainVote;
    ziwei?: DomainVote;
    natal?: DomainVote;
  };
  consensusType:
    | 'strong_convergence'
    | 'partial_convergence'
    | 'structured_conflict'
    | 'single_system_only'
    | 'insufficient_evidence';
  finalClaimStrength: ClaimStrength;
  supportingEvidenceIds: string[];
  dissentEvidenceIds: string[];
  missingSystemReasons: string[];
  contradictionNotes: string[];
  safety: {
    medicalClaimRisk: boolean;
    legalClaimRisk: boolean;
    investmentClaimRisk: boolean;
    relationshipDeterminismRisk: boolean;
    fatalismRisk: boolean;
  };
  rendererConstraints: {
    mustMentionUncertainty: boolean;
    mustMentionConflict: boolean;
    prohibitedPhrases: string[];
    requiredCaveat?: string;
  };
}

export interface ClaimPlan {
  claimId: string;
  consensusId?: string;
  domain: EvidenceDomain;
  claimAxis: ClaimAxis;
  userVisibleClaim: string;
  evidenceIds: string[];
  claimStrength: Exclude<ClaimStrength, 'none'>;
  tone: 'analytical' | 'reflective' | 'cautious';
  mustInclude: string[];
  mustAvoid: string[];
  audit: {
    hasEvidence: boolean;
    hasRule: boolean;
    safetyPassed: boolean;
    unsupportedExpansionRisk: 'low' | 'medium' | 'high';
  };
}
