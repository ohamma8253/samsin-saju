import type { ClaimPlan, DomainConsensus, InterpretationEvidence } from './evidence';
import { containsForbiddenPhrase, DEFAULT_SAFETY_POLICY, type SafetyPolicy } from './safety';

export interface RenderedOracleClaim {
  sentence: string;
  claimId?: string;
  consensusId?: string;
  evidenceIds?: string[];
}

export type OracleAuditIssueCode =
  | 'missing_claim_id'
  | 'unknown_claim_id'
  | 'missing_consensus_id'
  | 'consensus_mismatch'
  | 'missing_evidence_id'
  | 'unsupported_evidence_id'
  | 'unsafe_claim_plan'
  | 'forbidden_phrase'
  | 'weak_claim_overstated';

export interface OracleAuditIssue {
  code: OracleAuditIssueCode;
  sentence: string;
  claimId?: string;
  detail: string;
}

export interface OracleRenderAudit {
  passed: boolean;
  issues: OracleAuditIssue[];
  checkedClaimCount: number;
  knownClaimCount: number;
}

const WEAK_OVERSTATEMENT_PATTERNS = [
  '반드시',
  '무조건',
  '확실히',
  '운명이다',
  '정해져 있다',
  '피할 수 없다',
  '보장',
];

const NEGATED_OVERSTATEMENT_PATTERNS = [
  /보장하는\s+(?:답|정답|예언|결과)[^.!?。！？]*(?:아니라|아닙니다)/,
  /보장하지\s+않/,
  /확정(?:하는|된)?\s+(?:답|정답|예언|결과)[^.!?。！？]*(?:아니라|아닙니다)/,
  /(?:결혼|이혼|이별|헤어짐|재회|외도)[^.!?。！？]{0,24}확정(?:은|이)?\s+아니(?:다|라|에요|예요|며|고|라고)/,
  /확정하지\s+않/,
  /정해져\s+있지\s+않/,
];

function issue(code: OracleAuditIssueCode, rendered: RenderedOracleClaim, detail: string): OracleAuditIssue {
  return {
    code,
    sentence: rendered.sentence,
    claimId: rendered.claimId,
    detail,
  };
}

function includesWeakOverstatement(sentence: string): boolean {
  const cleaned = NEGATED_OVERSTATEMENT_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, ''),
    sentence,
  );
  return WEAK_OVERSTATEMENT_PATTERNS.some(pattern => cleaned.includes(pattern));
}

export function auditRenderedOracleClaims(
  renderedClaims: RenderedOracleClaim[],
  claimPlans: ClaimPlan[],
  consensusItems: DomainConsensus[],
  evidence: InterpretationEvidence[],
  policy: SafetyPolicy = DEFAULT_SAFETY_POLICY,
): OracleRenderAudit {
  const planById = new Map(claimPlans.map(plan => [plan.claimId, plan]));
  const consensusIds = new Set(consensusItems.map(item => item.id));
  const evidenceIds = new Set(evidence.map(item => item.id));
  const issues: OracleAuditIssue[] = [];

  for (const rendered of renderedClaims) {
    if (!rendered.claimId) {
      issues.push(issue('missing_claim_id', rendered, 'Every rendered claim must cite a ClaimPlan id.'));
      continue;
    }

    const plan = planById.get(rendered.claimId);
    if (!plan) {
      issues.push(issue('unknown_claim_id', rendered, 'Rendered claim references an unknown ClaimPlan id.'));
      continue;
    }

    if (!rendered.consensusId) {
      issues.push(issue('missing_consensus_id', rendered, 'Every rendered claim must cite a consensus id.'));
    } else if (rendered.consensusId !== plan.consensusId || !consensusIds.has(rendered.consensusId)) {
      issues.push(issue('consensus_mismatch', rendered, 'Rendered consensus id does not match the ClaimPlan.'));
    }

    const renderedEvidenceIds = rendered.evidenceIds ?? [];
    if (renderedEvidenceIds.length === 0) {
      issues.push(issue('missing_evidence_id', rendered, 'Every rendered claim must cite at least one evidence id.'));
    }

    for (const evidenceId of renderedEvidenceIds) {
      if (!evidenceIds.has(evidenceId) || !plan.evidenceIds.includes(evidenceId)) {
        issues.push(issue('unsupported_evidence_id', rendered, `Evidence id is not allowed for this claim: ${evidenceId}`));
      }
    }

    if (!plan.audit.safetyPassed) {
      issues.push(issue('unsafe_claim_plan', rendered, 'ClaimPlan did not pass safety audit.'));
    }

    if (containsForbiddenPhrase(rendered.sentence, policy)) {
      issues.push(issue('forbidden_phrase', rendered, 'Rendered sentence includes a forbidden phrase.'));
    }

    if (plan.claimStrength === 'weak' && includesWeakOverstatement(rendered.sentence)) {
      issues.push(issue('weak_claim_overstated', rendered, 'Weak claim was rendered with deterministic language.'));
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    checkedClaimCount: renderedClaims.length,
    knownClaimCount: claimPlans.length,
  };
}

export function auditPlainOracleTextSafety(
  text: string,
  policy: SafetyPolicy = DEFAULT_SAFETY_POLICY,
): OracleRenderAudit {
  const rendered = { sentence: text };
  const issues: OracleAuditIssue[] = [];
  if (containsForbiddenPhrase(text, policy)) {
    issues.push(issue('forbidden_phrase', rendered, 'Plain rendered text includes a forbidden phrase.'));
  }
  if (includesWeakOverstatement(text)) {
    issues.push(issue('weak_claim_overstated', rendered, 'Plain rendered text includes deterministic wording.'));
  }
  return {
    passed: issues.length === 0,
    issues,
    checkedClaimCount: text.trim() ? 1 : 0,
    knownClaimCount: 0,
  };
}
