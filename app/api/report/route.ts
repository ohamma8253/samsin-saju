import { NextRequest, NextResponse } from 'next/server';
import { getDayPillar, getYearPillar } from '@/lib/saju';
import { samsinAgent } from '@/lib/samsin-agent';
import { calculateConsensusMetrics } from '@/lib/consensus';
import { getConcernCopy, normalizeConcern, type ConcernKey } from '@/lib/concerns';
import { getSession } from '@/lib/session';
import { BirthParamsSchema } from '@/lib/schema';
import {
  auditOracleRouteText,
  buildOracleTransportFromCore,
  buildSamsinOracleCore,
  buildDecisionContextFromTrinity,
  buildTrinityPaidReport,
  collectTrinityPaidReportText,
  buildTrinityAnalysisForRuntime,
} from '@/lib/interpretation';

type GeneratedTotalReport = ReturnType<typeof samsinAgent.generateTotalReport>;

function buildFreeReport(concern: ConcernKey) {
  const copy = getConcernCopy(concern);
  return {
    headline: copy.freeHeadline,
    body: copy.freeBody,
    todayAction: copy.todayAction,
    previewCards: copy.previewCards,
  };
}

function applyConcernFraming(report: GeneratedTotalReport, concern: ConcernKey): GeneratedTotalReport {
  const copy = getConcernCopy(concern);
  return {
    ...report,
    coreInsight: {
      ...report.coreInsight,
      headline: copy.paidIntro.headline,
      body: `${copy.paidIntro.signal} ${copy.paidIntro.relief} ${copy.paidIntro.reason}`,
    },
    samsinMessage: copy.paidIntro.remember,
  };
}

function collectReportText(report: GeneratedTotalReport): string[] {
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tier = body.tier === 'first_reading' ? 'first_reading' : 'free';
    const parsed = BirthParamsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '필수 입력값이 없습니다.' }, { status: 400 });
    }
    const concern = normalizeConcern(parsed.data.concern);

    const { data: samsinData, scores: preComputedScores } = await getSession(parsed.data);
    const oracle = buildSamsinOracleCore(samsinData);

    const meta = {
      name: parsed.data.name,
      dayPillar: getDayPillar(samsinData),
      yearPillar: getYearPillar(samsinData),
      wuxing: samsinData.wuxing,
    };

    if (tier === 'free') {
      return NextResponse.json({
        tier,
        freeReport: buildFreeReport(concern),
        meta,
      });
    }

    const trinityAnalysis = await buildTrinityAnalysisForRuntime(samsinData, {
      concern,
      situation: parsed.data.situation,
    });

    if (!trinityAnalysis.audit.passed) {
      return NextResponse.json(
        {
          error: '의사결정 리포트의 안전 기준을 통과하지 못했어요. 표현을 더 조심스럽게 바꾼 뒤 다시 시도해주세요.',
          trinityAnalysis,
        },
        { status: 422 },
      );
    }

    const decisionContext = buildDecisionContextFromTrinity(trinityAnalysis);
    const trinityReport = buildTrinityPaidReport(trinityAnalysis);
    const oracleAudit = auditOracleRouteText(collectTrinityPaidReportText(trinityReport), oracle, { limit: 14 });
    if (!oracleAudit.passed) {
      return NextResponse.json(
        {
          error: '답변의 이유를 확인하지 못했어요. 표현을 더 조심스럽게 바꾼 뒤 다시 시도해주세요.',
          trinityAnalysis,
          decisionContext,
          oracle: buildOracleTransportFromCore(oracle, { audit: oracleAudit, limit: 5 }),
        },
        { status: 422 },
      );
    }

    const legacyTotalReport = samsinAgent.generateTotalReport(samsinData, preComputedScores);
    const framedLegacyReport = applyConcernFraming(legacyTotalReport, concern);
    const legacyAudit = auditOracleRouteText(collectReportText(framedLegacyReport), oracle, { limit: 14 });
    const consensusMetrics = calculateConsensusMetrics(
      legacyTotalReport.moneyGraph,
      legacyTotalReport.careerGraph,
    );
    const legacyReport = legacyAudit.passed ? framedLegacyReport : undefined;

    return NextResponse.json({
      tier,
      report: trinityReport,
      trinityReport,
      legacyReport,
      legacyReportBlocked: !legacyAudit.passed,
      meta,
      consensusMetrics,
      oracle: buildOracleTransportFromCore(oracle, { audit: oracleAudit, limit: 5 }),
      legacyOracle: buildOracleTransportFromCore(oracle, { audit: legacyAudit, limit: 5 }),
      trinityAnalysis,
      decisionContext,
    });
  } catch (err) {
    console.error('Report API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '오류가 발생했습니다.' }, { status: 500 });
  }
}
