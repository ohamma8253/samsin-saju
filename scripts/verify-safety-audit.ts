import { readFileSync } from 'node:fs';
import type { ChatResponse, CompatibilityReport, DeepReport, FinalSynthesis, TotalReport } from '../lib/claude';
import { calculateConsensusMetrics } from '../lib/consensus';
import { generateRuleBasedCompatibility } from '../lib/compatibility';
import { getConcernCopy } from '../lib/concerns';
import {
  DEFAULT_SAFETY_POLICY,
  auditOracleRouteText,
  auditPlainOracleTextSafety,
  buildSamsinOracleCore,
  containsForbiddenPhrase,
  systemForCharacter,
} from '../lib/interpretation/index';
import { calculateBasePrescription } from '../lib/prescription';
import type { SamsinInput } from '../lib/saju';
import { samsinAgent, type SamsinCharacter } from '../lib/samsin-agent';
import { getSession, scoredToGraph } from '../lib/session';

const SAMPLE_A: SamsinInput = {
  name: '안전검증',
  year: 1986,
  month: 4,
  day: 23,
  hour: 10,
  minute: 0,
  gender: 'M',
  city: 'daegu',
  timezone: 'Asia/Seoul',
  analysisYear: 2026,
};

const SAMPLE_B: SamsinInput = {
  name: '상대검증',
  year: 1991,
  month: 9,
  day: 7,
  hour: 18,
  minute: 20,
  gender: 'F',
  city: 'seoul',
  timezone: 'Asia/Seoul',
  analysisYear: 2026,
};

const UNKNOWN_TIME_SAMPLE: SamsinInput = {
  ...SAMPLE_A,
  name: '시간미상검증',
  hour: 12,
  minute: 0,
  unknownTime: true,
  birthTimePrecision: 'unknown',
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function collectReportText(report: TotalReport): string[] {
  return [
    report.characterVoices.cheongwoon,
    report.characterVoices.taeeul,
    report.characterVoices.luna,
    report.coreInsight.headline,
    report.coreInsight.body,
    ...report.moneyGraph.map(item => item.note),
    ...report.careerGraph.map(item => item.note),
    ...report.peakMoments.map(item => `${item.title}. ${item.desc}`),
    ...report.hardMoments.map(item => `${item.title}. ${item.desc}`),
    report.samsinMessage,
  ];
}

function collectDeepText(report: DeepReport): string[] {
  return report.sections.flatMap(section => [section.title, section.content]);
}

function collectChatText(response: ChatResponse): string[] {
  return Object.values(response).filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function collectFinalText(synthesis: FinalSynthesis): string[] {
  return [
    synthesis.verdict,
    synthesis.consensusNote ?? '',
    ...synthesis.pillars.flatMap(item => [item.title, item.body]),
    synthesis.nowAdvice,
    synthesis.voices.cheongwoon,
    synthesis.voices.taeeul,
    synthesis.voices.luna,
    synthesis.dissent?.argument ?? '',
    synthesis.seal,
  ].filter(Boolean);
}

function collectCompatibilityText(report: CompatibilityReport): string[] {
  return [
    report.ohaengRelation,
    report.summary,
    report.light.gijil.headline,
    report.light.gijil.body,
    report.light.sothrough.headline,
    report.light.sothrough.body,
    report.light.strength.headline,
    report.light.strength.body,
    report.light.samsinMessage,
    report.deep?.emotion.headline ?? '',
    report.deep?.emotion.body ?? '',
    report.deep?.longterm.headline ?? '',
    report.deep?.longterm.body ?? '',
    report.deep?.sokgungham.headline ?? '',
    report.deep?.sokgungham.body ?? '',
    report.deep?.bestTime ?? '',
  ].filter(Boolean);
}

function validatePolicyDisclaimers(): void {
  const joined = DEFAULT_SAFETY_POLICY.paidReportDisclaimers.join('\n');
  assert(joined.includes('엔터테인먼트') && joined.includes('자기성찰'), 'policy must disclose entertainment/self-reflection purpose');
  for (const word of ['건강', '법률', '투자', '관계']) {
    assert(joined.includes(word), `policy disclaimer must mention ${word} boundary`);
  }
}

function validateAdversarialSafetyText(): void {
  const unsafeSamples = [
    '올해 질병이 반드시 생긴다.',
    '이 코인은 수익 보장입니다.',
    '다음 재판은 확실히 승소합니다.',
    '두 사람은 결혼 확정입니다.',
    '그 사람과 반드시 헤어져야 합니다.',
    '그 사람과 반드시 헤어진다.',
    '이번 달에는 주식을 매수해야 합니다.',
    '올해 돈이 반드시 사라진다.',
  ];

  for (const sample of unsafeSamples) {
    assert(containsForbiddenPhrase(sample), `unsafe sample must match policy: ${sample}`);
    const audit = auditPlainOracleTextSafety(sample);
    assert(!audit.passed, `unsafe sample must fail plain audit: ${sample}`);
  }

  const safeSamples = [
    '이 결과는 엔터테인먼트와 자기성찰 목적의 상징적 해석입니다.',
    '건강, 법률, 투자, 관계 결정을 대신하지 않습니다.',
    '결과를 보장하는 정답이 아니라 자기성찰용 경향으로 참고해 주세요.',
    '지금은 결과를 억지로 확정하기보다 반복되는 패턴을 확인하는 편이 좋습니다.',
    '실제 의료, 투자, 법률 판단은 전문가와 현실 정보를 기준으로 확인해야 합니다.',
    '돈이 새는 느낌이 커질 수 있다. 사주에서는 겁재 신호로 읽지만 손실을 단정하지 않는다.',
    '마음이 멀어진 듯한 신호는 있으나 이별 확정은 아니다.',
  ];

  for (const sample of safeSamples) {
    const audit = auditPlainOracleTextSafety(sample);
    assert(audit.passed, `safe boundary text must pass plain audit: ${sample}`);
  }
}

function validateRouteAuditWiring(): void {
  const routeContracts: Array<[string, string[]]> = [
    ['app/api/report/route.ts', ['buildSamsinOracleCore', 'auditOracleRouteText', 'buildOracleTransportFromCore']],
    ['app/api/deep/route.ts', ['buildSamsinOracleCore', 'auditOracleRouteText', 'buildOracleTransportFromCore']],
    ['app/api/final/route.ts', ['buildSamsinOracleCore', 'auditOracleRouteText', 'buildOracleTransportFromCore']],
    ['app/api/chat/route.ts', ['buildSamsinOracleCore', 'auditOracleRouteText', 'buildOracleTransportFromCore']],
    ['app/api/compatibility/route.ts', ['auditPlainOracleTextSafety']],
  ];

  for (const [file, requiredTokens] of routeContracts) {
    const source = readFileSync(file, 'utf8');
    for (const token of requiredTokens) {
      assert(source.includes(token), `${file} must wire ${token}`);
    }
    assert(source.includes('status: 422'), `${file} must block unsafe or unsupported output`);
  }
}

function validateUnknownTimeText(label: string, textItems: string[]): void {
  const text = textItems.join('\n');
  const forbiddenConfidentTimeClaims = [
    /명반을\s+살피니/,
    /명궁에는/,
    /재물\s+궁의\s+중심/,
    /일의\s+궁의\s+중심/,
    /배우자\s+궁의\s+중심/,
    /재물\s+궁의\s+흐름/,
    /일의\s+궁은/,
    /대한이\s+.+흐름/,
    /어센던트는\s+(?!출생시간|보류)/,
    /어센던트\s+[^.!?。！？]*(?:쪽에|조합)/,
    /\d+하우스/,
    /하우스\s+흐름/,
  ];

  for (const pattern of forbiddenConfidentTimeClaims) {
    assert(!pattern.test(text), `${label} must not include confident time-sensitive claim: ${pattern}`);
  }
}

async function validateGeneratedOutputs(): Promise<void> {
  const [{ data, scores }, { data: partnerData }, { data: unknownData, scores: unknownScores }] = await Promise.all([
    getSession(SAMPLE_A),
    getSession(SAMPLE_B),
    getSession(UNKNOWN_TIME_SAMPLE),
  ]);
  const oracle = buildSamsinOracleCore(data);

  const report = samsinAgent.generateTotalReport(data, scores);
  const reportAudit = auditOracleRouteText(collectReportText(report), oracle, { limit: 14 });
  assert(reportAudit.passed, `report output must pass oracle audit: ${JSON.stringify(reportAudit.issues)}`);

  const characters: SamsinCharacter[] = ['cheongwoon', 'taeeul', 'luna'];
  for (const character of characters) {
    const deep = samsinAgent.generateDeepReport(character, data);
    const audit = auditOracleRouteText(
      collectDeepText(deep),
      oracle,
      { system: systemForCharacter(character), limit: 8 },
    );
    assert(audit.passed, `${character} deep output must pass oracle audit: ${JSON.stringify(audit.issues)}`);
  }

  const chat = samsinAgent.chat(data, [], '투자와 계약을 어떻게 봐야 하나요?', undefined, {
    questionMode: 'trinity',
    isFirstFree: true,
    costCookie: 0,
  });
  const chatAudit = auditOracleRouteText(collectChatText(chat), oracle, { limit: 9 });
  assert(chatAudit.passed, `chat output must pass oracle audit: ${JSON.stringify(chatAudit.issues)}`);

  const moneyConcern = getConcernCopy('money_leak');
  const freeReportContext = {
    totalReport: {
      coreInsightHeadline: moneyConcern.freeHeadline,
      coreInsightBody: moneyConcern.freeBody,
      samsinMessage: moneyConcern.todayAction,
      moneyGraphSummary: `${moneyConcern.label}: ${moneyConcern.previewCards.map(card => `${card.title} ${card.body}`).join(' / ')}`,
      careerGraphSummary: moneyConcern.todayAction,
    },
  };
  const freeContextChat = samsinAgent.chat(data, [], '돈이 새는 통로를 한 가지만 더 봐줘', freeReportContext, {
    questionMode: 'trinity',
    isFirstFree: true,
    costCookie: 0,
  });
  const freeContextChatAudit = auditOracleRouteText(collectChatText(freeContextChat), oracle, { limit: 9 });
  assert(
    freeContextChatAudit.passed,
    `free-report-context first chat output must pass oracle audit: ${JSON.stringify(freeContextChatAudit.issues)}`,
  );

  const metrics = calculateConsensusMetrics(
    scoredToGraph(scores.moneyPeriods),
    scoredToGraph(scores.careerPeriods),
  );
  const final = samsinAgent.generateFinalSynthesis(data, metrics, calculateBasePrescription(data.wuxing));
  const finalAudit = auditOracleRouteText(collectFinalText(final), oracle, { limit: 14 });
  assert(finalAudit.passed, `final synthesis must pass oracle audit: ${JSON.stringify(finalAudit.issues)}`);

  const compatibility = generateRuleBasedCompatibility(data, partnerData, 'romantic', true);
  const compatibilityAudit = auditPlainOracleTextSafety(collectCompatibilityText(compatibility).join('\n'));
  assert(compatibilityAudit.passed, `compatibility output must pass safety audit: ${JSON.stringify(compatibilityAudit.issues)}`);

  const unknownOracle = buildSamsinOracleCore(unknownData);
  const unknownReport = samsinAgent.generateTotalReport(unknownData, unknownScores);
  validateUnknownTimeText('unknown-time report', collectReportText(unknownReport));
  const unknownReportAudit = auditOracleRouteText(collectReportText(unknownReport), unknownOracle, { limit: 14 });
  assert(unknownReportAudit.passed, `unknown-time report output must pass oracle audit: ${JSON.stringify(unknownReportAudit.issues)}`);

  for (const character of characters) {
    const deep = samsinAgent.generateDeepReport(character, unknownData);
    validateUnknownTimeText(`unknown-time ${character} deep`, collectDeepText(deep));
    const audit = auditOracleRouteText(
      collectDeepText(deep),
      unknownOracle,
      { system: systemForCharacter(character), limit: 8, allowSafetyOnlyWhenNoClaims: true },
    );
    assert(audit.passed, `unknown-time ${character} deep output must pass oracle audit: ${JSON.stringify(audit.issues)}`);
  }

  const unknownChat = samsinAgent.chat(unknownData, [], '올해 일과 관계를 어떻게 봐야 하나요?', undefined, {
    questionMode: 'trinity',
    isFirstFree: true,
    costCookie: 0,
  });
  validateUnknownTimeText('unknown-time chat', collectChatText(unknownChat));

  const unknownFinalMetrics = calculateConsensusMetrics(
    scoredToGraph(unknownScores.moneyPeriods),
    scoredToGraph(unknownScores.careerPeriods),
  );
  const unknownFinal = samsinAgent.generateFinalSynthesis(
    unknownData,
    unknownFinalMetrics,
    calculateBasePrescription(unknownData.wuxing),
  );
  validateUnknownTimeText('unknown-time final', collectFinalText(unknownFinal));
}

async function main(): Promise<void> {
  validatePolicyDisclaimers();
  validateAdversarialSafetyText();
  validateRouteAuditWiring();
  await validateGeneratedOutputs();

  console.log(JSON.stringify({
    status: 'pass',
    checks: {
      policyDisclaimers: 'pass',
      adversarialSafetySamples: 'pass',
      routeAuditWiring: 'pass',
      reportRouteOutput: 'pass',
      deepRouteOutput: 'pass',
      chatRouteOutput: 'pass',
      finalRouteOutput: 'pass',
      compatibilityRouteOutput: 'pass',
      unknownTimeRendererConstraints: 'pass',
    },
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
