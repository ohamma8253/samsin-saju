import type { SamsinData } from '../saju';
import type {
  ClaimPlan,
  DivinationSystem,
  DomainConsensus,
  EvidenceDomain,
  InterpretationEvidence,
} from './evidence';
import {
  auditPlainOracleTextSafety,
  auditRenderedOracleClaims,
  type OracleRenderAudit,
  type RenderedOracleClaim,
} from './audit';
import { buildSamsinOracleCore, type SamsinOracleCore } from './oracle';

export interface OracleEvidenceLine {
  id: string;
  system: DivinationSystem;
  title: string;
  basis: string[];
  caveat?: string;
}

export interface OracleEvidenceCard {
  claimId: string;
  consensusId?: string;
  domain: EvidenceDomain;
  claimAxis: string;
  claimStrength: ClaimPlan['claimStrength'];
  claim: string;
  evidence: OracleEvidenceLine[];
  caveat?: string;
}

export interface OracleAuditSummary {
  passed: boolean;
  checkedClaimCount: number;
  knownClaimCount: number;
  issues: Array<{
    code: string;
    claimId?: string;
    detail: string;
  }>;
}

export interface OracleTransportBundle {
  safetyPolicyVersion: string;
  evidenceCards: OracleEvidenceCard[];
  audit?: OracleAuditSummary;
}

interface OracleSelectionOptions {
  limit?: number;
  system?: DivinationSystem;
  allowSafetyOnlyWhenNoClaims?: boolean;
}

const CHARACTER_SYSTEM: Record<string, DivinationSystem> = {
  cheongwoon: 'saju',
  taeeul: 'ziwei',
  luna: 'natal',
};

function normalizeSentences(items: string[]): string[] {
  return items
    .flatMap(item => item.split(/(?<=[.!?。！？])\s+/))
    .map(item => item.trim())
    .filter(Boolean);
}

function evidenceById(oracle: SamsinOracleCore): Map<string, InterpretationEvidence> {
  return new Map(oracle.evidence.map(item => [item.id, item]));
}

function planHasSystem(
  plan: ClaimPlan,
  evidenceMap: Map<string, InterpretationEvidence>,
  system?: DivinationSystem,
): boolean {
  if (!system) return true;
  return plan.evidenceIds.some(id => evidenceMap.get(id)?.system === system);
}

function selectClaimPlans(
  oracle: SamsinOracleCore,
  options: OracleSelectionOptions = {},
): ClaimPlan[] {
  const evidenceMap = evidenceById(oracle);
  const plans = oracle.claimPlans.filter(plan =>
    plan.audit.hasEvidence &&
    plan.audit.hasRule &&
    plan.audit.safetyPassed &&
    planHasSystem(plan, evidenceMap, options.system),
  );
  return plans.slice(0, options.limit ?? plans.length);
}

function summarizeAudit(audit: OracleRenderAudit): OracleAuditSummary {
  return {
    passed: audit.passed,
    checkedClaimCount: audit.checkedClaimCount,
    knownClaimCount: audit.knownClaimCount,
    issues: audit.issues.map(item => ({
      code: item.code,
      claimId: item.claimId,
      detail: item.detail,
    })),
  };
}

export function systemForCharacter(character: string): DivinationSystem | undefined {
  return CHARACTER_SYSTEM[character];
}

export function buildOracleTransportBundle(
  data: SamsinData,
  options: OracleSelectionOptions & { audit?: OracleRenderAudit } = {},
): OracleTransportBundle {
  return buildOracleTransportFromCore(buildSamsinOracleCore(data), options);
}

export function buildOracleTransportFromCore(
  oracle: SamsinOracleCore,
  options: OracleSelectionOptions & { audit?: OracleRenderAudit } = {},
): OracleTransportBundle {
  return {
    safetyPolicyVersion: oracle.safetyPolicyVersion,
    evidenceCards: buildOracleEvidenceCards(oracle, options),
    audit: options.audit ? summarizeAudit(options.audit) : undefined,
  };
}

export function buildOracleEvidenceCards(
  oracle: SamsinOracleCore,
  options: OracleSelectionOptions = {},
): OracleEvidenceCard[] {
  const evidenceMap = evidenceById(oracle);
  return selectClaimPlans(oracle, options).map(plan => {
    const evidence = plan.evidenceIds
      .map(id => evidenceMap.get(id))
      .filter((item): item is InterpretationEvidence => Boolean(item))
      .filter(item => !options.system || item.system === options.system)
      .map(item => ({
        id: item.id,
        system: item.system,
        title: item.title,
        basis: item.userFacing.basis,
        caveat: item.userFacing.caveat,
      }));
    return {
      claimId: plan.claimId,
      consensusId: plan.consensusId,
      domain: plan.domain,
      claimAxis: String(plan.claimAxis),
      claimStrength: plan.claimStrength,
      claim: plan.userVisibleClaim,
      evidence,
      caveat: evidence.find(item => item.caveat)?.caveat,
    };
  });
}

export function bindRenderedClaimsToOracle(
  textItems: string[],
  oracle: SamsinOracleCore,
  options: OracleSelectionOptions = {},
): RenderedOracleClaim[] {
  const claimPlans = selectClaimPlans(oracle, options);
  if (claimPlans.length === 0) return [];

  return normalizeSentences(textItems).map((sentence, index) => {
    const plan = claimPlans[index % claimPlans.length];
    return {
      sentence,
      claimId: plan.claimId,
      consensusId: plan.consensusId,
      evidenceIds: plan.evidenceIds.slice(0, 4),
    };
  });
}

export function auditOracleRouteText(
  textItems: string[],
  oracle: SamsinOracleCore,
  options: OracleSelectionOptions = {},
): OracleRenderAudit {
  const sentences = normalizeSentences(textItems);
  const renderedClaims = bindRenderedClaimsToOracle(textItems, oracle, options);
  if (renderedClaims.length === 0) {
    if (options.allowSafetyOnlyWhenNoClaims) {
      return auditPlainOracleTextSafety(textItems.join('\n'));
    }
    if (sentences.length > 0) {
      return {
        passed: false,
        issues: sentences.map(sentence => ({
          code: 'missing_claim_id',
          sentence,
          detail: 'Rendered text cannot be released because no audited ClaimPlan is available for it.',
        })),
        checkedClaimCount: sentences.length,
        knownClaimCount: 0,
      };
    }
    return auditPlainOracleTextSafety(textItems.join('\n'));
  }
  return auditRenderedOracleClaims(
    renderedClaims,
    oracle.claimPlans,
    oracle.consensus,
    oracle.evidence,
  );
}

export function consensusForClaim(
  plan: ClaimPlan,
  consensusItems: DomainConsensus[],
): DomainConsensus | undefined {
  if (!plan.consensusId) return undefined;
  return consensusItems.find(item => item.id === plan.consensusId);
}
