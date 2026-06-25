import type { NormalizedBirthInput } from './input';
import { normalizeBirthInput, type RawBirthInput } from './input';
import {
  CLAIM_PLAN_CONTRACT_VERSION,
  CONSENSUS_CONTRACT_VERSION,
  CORE_MODEL_VERSION,
  EVIDENCE_CONTRACT_VERSION,
  getCoreProfile,
  type CalculationCoreId,
  type CalculationCoreProfile,
} from './provenance';
import { DEFAULT_SAFETY_POLICY, type SafetyPolicy } from './safety';

export interface CoreUsage {
  core: CalculationCoreProfile;
  mode: 'active' | 'pending' | 'blocked_for_production';
}

export interface SamsinCoreModel {
  modelVersion: typeof CORE_MODEL_VERSION;
  birth: NormalizedBirthInput;
  calculators: {
    saju: CoreUsage;
    ziwei: CoreUsage;
    natal: CoreUsage;
  };
  interpretation: {
    evidenceContractVersion: typeof EVIDENCE_CONTRACT_VERSION;
    consensusContractVersion: typeof CONSENSUS_CONTRACT_VERSION;
    claimPlanContractVersion: typeof CLAIM_PLAN_CONTRACT_VERSION;
    safetyPolicyVersion: string;
  };
  renderFlow: readonly [
    'calculation_core',
    'feature_extraction',
    'evidence_ranking',
    'domain_consensus',
    'claim_plan',
    'korean_renderer',
    'post_render_audit',
  ];
  releaseBlockers: string[];
}

function coreUsage(id: CalculationCoreId, mode: CoreUsage['mode']): CoreUsage {
  return {
    core: getCoreProfile(id),
    mode,
  };
}

export function buildSamsinCoreModel(
  input: RawBirthInput,
  safetyPolicy: SafetyPolicy = DEFAULT_SAFETY_POLICY,
): SamsinCoreModel {
  const birth = normalizeBirthInput(input);
  const releaseBlockers: string[] = [];

  if (birth.unknownTime) {
    releaseBlockers.push('birth time is unknown: hour, house, ASC, MC, and ziwei timing claims must remain constrained by the oracle core.');
  }

  return {
    modelVersion: CORE_MODEL_VERSION,
    birth,
    calculators: {
      saju: coreUsage('samsin-manselyeok-core', 'active'),
      ziwei: coreUsage('samsin-ziwei-core', 'active'),
      natal: coreUsage('samsin-natal-core', 'active'),
    },
    interpretation: {
      evidenceContractVersion: EVIDENCE_CONTRACT_VERSION,
      consensusContractVersion: CONSENSUS_CONTRACT_VERSION,
      claimPlanContractVersion: CLAIM_PLAN_CONTRACT_VERSION,
      safetyPolicyVersion: safetyPolicy.policyVersion,
    },
    renderFlow: [
      'calculation_core',
      'feature_extraction',
      'evidence_ranking',
      'domain_consensus',
      'claim_plan',
      'korean_renderer',
      'post_render_audit',
    ],
    releaseBlockers,
  };
}
