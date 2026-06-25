import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { calculateSamsin, type SamsinData, type SamsinInput } from '../lib/saju';
import {
  DEFAULT_SAFETY_POLICY,
  auditOracleRouteText,
  auditRenderedOracleClaims,
  buildSamsinCoreModel,
  buildSamsinOracleCore,
  containsForbiddenPhrase,
  extractNatalEvidence,
  extractSajuEvidence,
  extractSamsinEvidence,
  extractZiweiEvidence,
  type DivinationSystem,
  type DomainConsensus,
  type InterpretationEvidence,
} from '../lib/interpretation/index';

const KNOWN_TIME_INPUT: SamsinInput = {
  name: '검증',
  year: 1990,
  month: 5,
  day: 17,
  hour: 14,
  minute: 30,
  gender: 'F',
  calculationSex: 'female',
  city: 'seoul',
  timezone: 'Asia/Seoul',
  analysisYear: 2026,
};

const UNKNOWN_TIME_INPUT: SamsinInput = {
  ...KNOWN_TIME_INPUT,
  hour: 12,
  minute: 0,
  unknownTime: true,
  birthTimePrecision: 'unknown',
};

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function countBySystem(evidence: InterpretationEvidence[]): Record<DivinationSystem, number> {
  return evidence.reduce<Record<DivinationSystem, number>>((acc, item) => {
    acc[item.system] += 1;
    return acc;
  }, { saju: 0, ziwei: 0, natal: 0 });
}

function validateEvidenceContract(item: InterpretationEvidence): void {
  const readable = [
    item.title,
    item.claim,
    ...item.userFacing.basis,
    item.userFacing.adviceHint ?? '',
    item.userFacing.caveat ?? '',
  ].join('\n');

  assert(Boolean(item.id), 'evidence.id is required');
  assert(Boolean(item.provenance.ruleId), `${item.id}: ruleId is required`);
  assert(item.provenance.ruleId.startsWith(`${item.system}.`), `${item.id}: ruleId must start with system`);
  assert(Boolean(item.provenance.ruleVersion), `${item.id}: ruleVersion is required`);
  assert(Boolean(item.provenance.extractorVersion), `${item.id}: extractorVersion is required`);
  assert(Boolean(item.provenance.calculationVersion), `${item.id}: calculationVersion is required`);
  assert(Boolean(item.featureTrace.featurePath), `${item.id}: featureTrace.featurePath is required`);
  assert(item.userFacing.basis.length > 0, `${item.id}: user-facing basis is required`);
  assert(item.claimBinding.allowedClaimAxes.includes(String(item.claimAxis)), `${item.id}: claim axis must be explicitly allowed`);
  assert(!containsForbiddenPhrase(readable), `${item.id}: contains forbidden phrase`);
  const licenseConstraint = item.source.licenseConstraint ?? '';
  assert(!licenseConstraint.includes('AGPL-3.0-only'), `${item.id}: AGPL-licensed material cannot be a production evidence source`);

  if (item.domain === 'wellbeing_reflection' || item.domain === 'timing' || item.domain === 'risk_pattern') {
    assert(item.claimBinding.maxClaimStrength === 'weak', `${item.id}: ${item.domain} must cap claim strength at weak`);
  }

  const featureJson = JSON.stringify(item.featureTrace.featureValue);
  const syntheticUsed = featureJson.includes('Chiron') || featureJson.includes('NorthNode') || featureJson.includes('SouthNode');
  assert(!(syntheticUsed && item.claimBinding.maxClaimStrength !== 'weak'), `${item.id}: synthetic natal bodies cannot support moderate/strong claims`);
}

function validateKnownTimeEvidence(data: SamsinData): void {
  const saju = extractSajuEvidence(data);
  const ziwei = extractZiweiEvidence(data);
  const natal = extractNatalEvidence(data);
  const all = extractSamsinEvidence(data);
  const counts = countBySystem(all);
  const ids = new Set(all.map(item => item.id));

  assert(all.length === saju.length + ziwei.length + natal.length, 'bundle must include all extractor output');
  assert(ids.size === all.length, 'evidence ids must be unique');
  assert(counts.saju >= 4, `expected at least 4 saju evidence items, got ${counts.saju}`);
  assert(counts.ziwei >= 4, `expected at least 4 ziwei evidence items, got ${counts.ziwei}`);
  assert(counts.natal >= 4, `expected at least 4 natal evidence items, got ${counts.natal}`);

  for (const item of all) {
    validateEvidenceContract(item);
  }
}

function validateConsensus(items: DomainConsensus[], evidence: InterpretationEvidence[]): void {
  const evidenceIds = new Set(evidence.map(item => item.id));
  assert(items.length > 0, 'consensus items are required');
  assert(
    items.some(item => item.consensusType === 'strong_convergence' || item.consensusType === 'partial_convergence'),
    'at least one cross-system convergence is required',
  );

  for (const item of items) {
    assert(Boolean(item.id), 'consensus.id is required');
    assert(Boolean(item.claimKey), `${item.id}: claimKey is required`);
    assert(item.supportingEvidenceIds.length > 0, `${item.id}: supporting evidence is required`);
    assert(item.finalClaimStrength !== 'none', `${item.id}: final claim strength must be actionable`);
    for (const evidenceId of [...item.supportingEvidenceIds, ...item.dissentEvidenceIds]) {
      assert(evidenceIds.has(evidenceId), `${item.id}: unknown evidence id ${evidenceId}`);
    }
    if (item.consensusType === 'structured_conflict') {
      assert(item.rendererConstraints.mustMentionConflict, `${item.id}: conflict must be marked for renderer`);
    }
    if (item.consensusType === 'single_system_only') {
      assert(item.rendererConstraints.mustMentionUncertainty, `${item.id}: single-system claim must mention uncertainty`);
    }
  }
}

function validateOracleCore(data: SamsinData): void {
  const oracle = buildSamsinOracleCore(data);
  const evidenceIds = new Set(oracle.evidence.map(item => item.id));
  const consensusIds = new Set(oracle.consensus.map(item => item.id));

  validateConsensus(oracle.consensus, oracle.evidence);
  assert(oracle.claimPlans.length > 0, 'claim plans are required');

  for (const plan of oracle.claimPlans) {
    assert(Boolean(plan.claimId), 'claimPlan.claimId is required');
    assert(Boolean(plan.consensusId), `${plan.claimId}: consensus id is required`);
    assert(consensusIds.has(plan.consensusId ?? ''), `${plan.claimId}: consensus id must exist`);
    assert(plan.evidenceIds.length > 0, `${plan.claimId}: evidence ids are required`);
    assert(plan.audit.hasEvidence, `${plan.claimId}: audit.hasEvidence must pass`);
    assert(plan.audit.hasRule, `${plan.claimId}: audit.hasRule must pass`);
    assert(plan.audit.safetyPassed, `${plan.claimId}: audit.safetyPassed must pass`);
    assert(!containsForbiddenPhrase(plan.userVisibleClaim), `${plan.claimId}: claim contains forbidden phrase`);
    for (const evidenceId of plan.evidenceIds) {
      assert(evidenceIds.has(evidenceId), `${plan.claimId}: unknown evidence id ${evidenceId}`);
    }
    if (plan.domain === 'timing' || plan.domain === 'risk_pattern' || plan.domain === 'wellbeing_reflection') {
      assert(plan.claimStrength === 'weak', `${plan.claimId}: ${plan.domain} must remain weak`);
    }
  }

  const renderedClaims = oracle.claimPlans.slice(0, 5).map(plan => ({
    sentence: plan.userVisibleClaim,
    claimId: plan.claimId,
    consensusId: plan.consensusId,
    evidenceIds: plan.evidenceIds.slice(0, 1),
  }));
  const passingAudit = auditRenderedOracleClaims(renderedClaims, oracle.claimPlans, oracle.consensus, oracle.evidence);
  assert(passingAudit.passed, `rendered oracle claims should pass audit: ${JSON.stringify(passingAudit.issues)}`);

  const routeAudit = auditOracleRouteText([
    '이 판정은 결과를 보장하는 예언이 아니라 자기성찰용 지도입니다.',
    oracle.claimPlans[0].userVisibleClaim,
  ], oracle, { limit: 5 });
  assert(routeAudit.passed, `route-bound rendered text should pass audit: ${JSON.stringify(routeAudit.issues)}`);

  const failingAudit = auditRenderedOracleClaims([
    {
      sentence: '이 사람은 반드시 결혼 확정입니다.',
      claimId: oracle.claimPlans[0].claimId,
      consensusId: oracle.claimPlans[0].consensusId,
      evidenceIds: [],
    },
  ], oracle.claimPlans, oracle.consensus, oracle.evidence);
  assert(!failingAudit.passed, 'unsupported deterministic rendered claim must fail audit');
}

function validateUnknownTimeEvidence(data: SamsinData): void {
  const ziwei = extractZiweiEvidence(data);
  const natal = extractNatalEvidence(data);
  const oracle = buildSamsinOracleCore(data);

  assert(ziwei.length === 0, 'unknown-time mode must suppress Ziwei palace/timing evidence');
  assert(oracle.evidence.every(item => item.system !== 'ziwei'), 'unknown-time oracle must not include Ziwei evidence');
  for (const item of natal) {
    validateEvidenceContract(item);
    assert(!item.featureTrace.featurePath.includes('house'), `${item.id}: unknown-time natal evidence must not use houses`);
    assert(!item.featureTrace.featurePath.includes('angles'), `${item.id}: unknown-time natal evidence must not use angles`);
  }
  for (const plan of oracle.claimPlans) {
    const planEvidence = oracle.evidence.filter(item => plan.evidenceIds.includes(item.id));
    assert(planEvidence.every(item => item.system !== 'ziwei'), `${plan.claimId}: unknown-time ClaimPlan must not use Ziwei evidence`);
    assert(
      planEvidence.every(item => !item.featureTrace.featurePath.includes('house') && !item.featureTrace.featurePath.includes('angles')),
      `${plan.claimId}: unknown-time ClaimPlan must not use natal house/angle evidence`,
    );
  }
}

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      return collectSourceFiles(path);
    }
    return /\.(ts|tsx|js|jsx)$/.test(path) ? [path] : [];
  });
}

function validateProductionAgplBoundary(): void {
  const files = [
    ...collectSourceFiles('app'),
    ...collectSourceFiles('components'),
    ...collectSourceFiles('lib'),
  ];
  const offenders = files.filter(file => readFileSync(file, 'utf8').includes('@orrery/core'));
  assert(offenders.length === 0, `@orrery/core must stay out of production runtime files: ${offenders.join(', ')}`);
}

async function main(): Promise<void> {
  const knownData = await calculateSamsin(KNOWN_TIME_INPUT);
  const unknownData = await calculateSamsin(UNKNOWN_TIME_INPUT);
  const model = buildSamsinCoreModel(KNOWN_TIME_INPUT, DEFAULT_SAFETY_POLICY);

  assert(model.calculators.saju.mode === 'active', 'saju calculator must be active');
  assert(model.calculators.ziwei.mode === 'active', 'ziwei calculator must be active');
  assert(model.calculators.natal.mode === 'active', 'natal calculator must be active');
  assert(
    !model.releaseBlockers.some(blocker => blocker.includes('not accepted yet')),
    'release blockers must not contain stale calculation-gate blockers',
  );

  validateKnownTimeEvidence(knownData);
  validateOracleCore(knownData);
  validateUnknownTimeEvidence(unknownData);
  validateProductionAgplBoundary();

  const counts = countBySystem(extractSamsinEvidence(knownData));
  const oracle = buildSamsinOracleCore(knownData);
  console.log(JSON.stringify({
    status: 'pass',
    checks: {
      modelCalculators: 'active',
      staleCalculationBlockers: 0,
      knownTimeEvidence: counts,
      consensusCount: oracle.consensus.length,
      claimPlanCount: oracle.claimPlans.length,
      postRenderAudit: 'pass',
      unknownTimeZiweiEvidence: extractZiweiEvidence(unknownData).length,
      productionAgplImports: 0,
    },
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
