import assert from 'node:assert/strict';
import { calculateSamsin } from '../lib/saju';
import {
  auditTrinityAnalysis,
  buildTrinityAnalysis,
  type SituationContext,
  type TrinityAnalysis,
} from '../lib/interpretation/decision';
import { buildDecisionContextFromTrinity } from '../lib/interpretation/decision-context';
import { buildFinalSynthesisFromTrinity } from '../lib/interpretation/final-synthesis';
import { buildTrinityPaidReport } from '../lib/interpretation/report-adapter';

const INPUT = {
  name: 'fixture',
  year: 1986,
  month: 4,
  day: 23,
  hour: 10,
  minute: 0,
  gender: 'M' as const,
  city: 'daegu',
  timezone: 'Asia/Seoul',
  calendarInputType: 'solar' as const,
  birthTimePrecision: 'exact' as const,
  analysisYear: 2026,
};

const FIXTURES: Array<{ name: string; concern: string; situation: Partial<SituationContext> }> = [
  {
    name: 'job pressure high + business idea',
    concern: 'income_anxiety',
    situation: {
      mode: 'both',
      cashflowPressure: 'high',
      runwayMonths: 2,
      projectStage: 'idea',
      incomeNeed: 'urgent',
      decisionDeadline: '2026-08-31',
      mainQuestion: '구직과 사업을 어떻게 병행할지',
      currentConstraints: ['고정수입 부족'],
    },
  },
  {
    name: 'stable cashflow + business growth',
    concern: 'general',
    situation: {
      mode: 'business',
      cashflowPressure: 'low',
      runwayMonths: 12,
      projectStage: 'growth',
      incomeNeed: 'stable',
      mainQuestion: '사업 확장 우선순위를 어떻게 잡을지',
      currentConstraints: ['채널 우선순위 필요'],
    },
  },
  {
    name: 'stable job + contract concern',
    concern: 'career_timing',
    situation: {
      mode: 'job_search',
      cashflowPressure: 'medium',
      runwayMonths: 6,
      projectStage: 'prototype',
      incomeNeed: 'stable',
      mainQuestion: '이직 제안과 계약 조건을 어떻게 볼지',
      currentConstraints: ['역할 범위 불명확'],
    },
  },
  {
    name: 'public expansion desire + energy pressure',
    concern: 'next_3_months',
    situation: {
      mode: 'both',
      cashflowPressure: 'medium',
      projectStage: 'prototype',
      timeAvailablePerWeek: 12,
      incomeNeed: 'soon',
      mainQuestion: '공개 활동을 늘려도 되는지',
      currentConstraints: ['체력 압박', '시간 부족'],
    },
  },
];

function allAdvice(analysis: TrinityAnalysis) {
  return Object.values(analysis.actionPlan).flat();
}

function assertNoAdviceInReadings(analysis: TrinityAnalysis): void {
  for (const reading of Object.values(analysis.portrait)) {
    assert(!('adviceHints' in reading), 'NativeSystemReading must not contain adviceHints');
    for (const claim of reading.coreClaims) {
      assert(claim.sourceEvidenceIds.length > 0, `${claim.id} must cite source evidence`);
      assert(claim.basis.length > 0, `${claim.id} must include evidence basis`);
      assert(!('action' in claim), 'NativeClaim must not contain action advice');
    }
  }
  for (const reading of Object.values(analysis.readings)) {
    assert(!('adviceHints' in reading), 'SystemReading must not contain adviceHints');
    for (const claim of reading.coreClaims) {
      assert(!('action' in claim), 'Claim must not contain action advice');
    }
  }
}

function assertAdviceReferencesClaims(analysis: TrinityAnalysis): void {
  const claimIds = new Set(analysis.normalizedClaims.map(claim => claim.sourceClaimId));
  for (const advice of allAdvice(analysis)) {
    assert(advice.basedOnClaims.length > 0, `${advice.id} must cite at least one claim`);
    for (const claimId of advice.basedOnClaims) {
      assert(claimIds.has(claimId), `${advice.id} cites unknown claim: ${claimId}`);
    }
  }
}

function assertNativeLayerExists(analysis: TrinityAnalysis): void {
  const expectedRoles = ['saju_native', 'ziwei_native', 'natal_native'] as const;
  for (const role of expectedRoles) {
    assert(
      analysis.modelRouting.receipts.some(receipt => receipt.role === role),
      `model route receipt missing: ${role}`,
    );
  }

  for (const system of ['saju', 'ziwei', 'natal'] as const) {
    const nativeReading = analysis.portrait[system];
    const systemReading = analysis.readings[system];
    assert.equal(nativeReading.system, system);
    assert(nativeReading.coreClaims.length > 0, `${system} native reading needs claims`);
    assert(systemReading.coreClaims.length > 0, `${system} normalized reading needs claims`);
    for (const claim of systemReading.coreClaims) {
      assert(
        nativeReading.coreClaims.some(nativeClaim => nativeClaim.id === claim.sourceNativeClaimId),
        `${claim.id} must point to a ${system} native claim`,
      );
    }
  }
}

function assertSituationDoesNotRewriteNativePortrait(base: TrinityAnalysis, variant: TrinityAnalysis): void {
  for (const system of ['saju', 'ziwei', 'natal'] as const) {
    assert.equal(
      variant.portrait[system].personPortrait,
      base.portrait[system].personPortrait,
      `${system} native portrait must not change by situation context`,
    );
    assert.deepEqual(
      variant.portrait[system].coreClaims.map(claim => claim.statement),
      base.portrait[system].coreClaims.map(claim => claim.statement),
      `${system} native statements must not change by situation context`,
    );
  }
}

function assertAuditBlocksDeterminism(analysis: TrinityAnalysis): void {
  const unsafe = {
    ...analysis,
    userFacingSummary: {
      ...analysis.userFacingSummary,
      caution: '반드시 성공한다.',
    },
  };
  const audit = auditTrinityAnalysis(unsafe);
  assert.equal(audit.passed, false, 'deterministic wording must be blocked');
  assert(audit.blockedClaims.length > 0, 'deterministic audit should include blocked claims');
}

function assertDecisionContextAdapter(analysis: TrinityAnalysis): void {
  const context = buildDecisionContextFromTrinity(analysis);
  assert.equal(context.headline, analysis.userFacingSummary.headline);
  assert.equal(context.diagnosis, analysis.situation.diagnosis.rationale);
  assert.equal(context.mainStrategy, analysis.userFacingSummary.mainStrategy);
  assert.equal(context.caution, analysis.userFacingSummary.caution);
  assert(context.convergence.length > 0, 'decisionContext must include convergence summaries');
  assert(context.divergence.length > 0, 'decisionContext must include divergence summaries');
  assert.deepEqual(
    context.nowActions,
    analysis.actionPlan.now.map(advice => advice.action),
    'decisionContext nowActions must mirror actionPlan.now',
  );
  assert.deepEqual(
    context.avoidActions,
    analysis.actionPlan.avoid.map(advice => advice.action),
    'decisionContext avoidActions must mirror actionPlan.avoid',
  );
  assert(
    context.claimRefs.length >= analysis.actionPlan.now[0].basedOnClaims.length,
    'decisionContext must preserve claim references for Ask grounding',
  );
  assert(context.claimGrounding.length > 0, 'decisionContext must include readable claim grounding for Ask');
  assert(
    context.claimGrounding.every(item => item.summary.length > 0 && item.sourceClaimId.length > 0),
    'decisionContext claim grounding must include summaries and source claim ids',
  );
}

function assertFinalSynthesisAdapter(analysis: TrinityAnalysis): void {
  const synthesis = buildFinalSynthesisFromTrinity(analysis);
  assert.equal(synthesis.consensusLevel, 'majority');
  assert(synthesis.verdict.includes(analysis.userFacingSummary.headline), 'final verdict should lead with Trinity headline');
  assert(synthesis.verdict.includes('선택 기준'), 'final verdict should frame the result as decision criteria');
  assert(synthesis.pillars.some(pillar => pillar.title === '공통 신호'), 'final synthesis must include convergence pillar');
  assert(synthesis.pillars.some(pillar => pillar.title === '관점 차이'), 'final synthesis must include divergence pillar');
  assert(synthesis.nowAdvice.includes(analysis.actionPlan.now[0].action), 'final nowAdvice must cite actionPlan.now');
  assert(synthesis.seal === analysis.actionPlan.now[0].action, 'final seal should prefer the first Trinity now action');
}

function assertTrinityPaidReportAdapter(analysis: TrinityAnalysis): void {
  const report = buildTrinityPaidReport(analysis);
  assert.equal(report.headline, analysis.userFacingSummary.headline);
  assert.equal(report.summary, analysis.userFacingSummary.shortSummary);
  assert.equal(report.diagnosis, analysis.situation.diagnosis.rationale);
  assert.equal(report.mainStrategy, analysis.userFacingSummary.mainStrategy);
  assert.equal(report.caution, analysis.userFacingSummary.caution);
  assert.deepEqual(
    report.actionPlan.now,
    analysis.actionPlan.now.map(advice => advice.action),
    'paid report must lead with Trinity now action plan',
  );
  assert.deepEqual(
    report.actionPlan.avoid,
    analysis.actionPlan.avoid.map(advice => advice.action),
    'paid report must preserve Trinity avoid action plan',
  );
  assert(report.convergence.length > 0, 'paid report must include Trinity convergence');
  assert(report.divergence.length > 0, 'paid report must include Trinity divergence');
  assert(report.claimGrounding.length > 0, 'paid report must include readable grounding for frontend details');
  assert.equal(report.modelRouting.mode, analysis.modelRouting.mode);
  assert.equal(report.audit.passed, analysis.audit.passed);
}

const data = await calculateSamsin(INPUT);

for (const fixture of FIXTURES) {
  const analysis = buildTrinityAnalysis(data, {
    concern: fixture.concern,
    situation: fixture.situation,
    now: new Date('2026-06-11T00:00:00+09:00'),
  });

  assert.equal(analysis.audit.passed, true, `${fixture.name}: audit must pass`);
  assertNativeLayerExists(analysis);
  assertNoAdviceInReadings(analysis);
  assertAdviceReferencesClaims(analysis);
  assertDecisionContextAdapter(analysis);
  assertFinalSynthesisAdapter(analysis);
  assertTrinityPaidReportAdapter(analysis);

  if (fixture.situation.cashflowPressure === 'high') {
    assert.equal(analysis.situation.diagnosis.recommendedPosture, 'stabilize');
    assert(
      analysis.actionPlan.now.some(advice => advice.id === 'advice.now.cashflow-stabilize'),
      `${fixture.name}: high cashflow pressure must produce stabilization advice`,
    );
  }

  if (fixture.situation.cashflowPressure === 'low' && fixture.situation.projectStage === 'growth') {
    assert.equal(analysis.situation.diagnosis.recommendedPosture, 'expand');
  }

  assert(
    analysis.comparison.divergence.some(item => item.resolution?.type === 'risk_condition'),
    `${fixture.name}: risk-condition divergence should be preserved`,
  );

  assertAuditBlocksDeterminism(analysis);
}

const baseAnalysis = buildTrinityAnalysis(data, {
  concern: 'money_leak',
  situation: {
    mode: 'both',
    cashflowPressure: 'high',
    projectStage: 'paid_test',
    mainQuestion: '돈이 안 남는 흐름을 어떻게 볼지',
    currentConstraints: ['지출 기준 불명확'],
  },
  now: new Date('2026-06-11T00:00:00+09:00'),
});

const variantAnalysis = buildTrinityAnalysis(data, {
  concern: 'career_timing',
  situation: {
    mode: 'job_search',
    cashflowPressure: 'low',
    projectStage: 'growth',
    mainQuestion: '이직 제안을 어떻게 볼지',
    currentConstraints: ['역할 범위 확인 필요'],
  },
  now: new Date('2026-06-11T00:00:00+09:00'),
});

assertSituationDoesNotRewriteNativePortrait(baseAnalysis, variantAnalysis);

console.log(`verify:trinity-decision passed (${FIXTURES.length} fixtures)`);
