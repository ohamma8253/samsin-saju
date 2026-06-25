import { NextRequest, NextResponse } from 'next/server';
import { calculateConsensusMetrics } from '@/lib/consensus';
import { normalizeConcern } from '@/lib/concerns';
import { calculateBasePrescription } from '@/lib/prescription';
import { getSession, scoredToGraph } from '@/lib/session';
import { BirthParamsSchema } from '@/lib/schema';
import {
  auditOracleRouteText,
  buildFinalSynthesisFromTrinity,
  buildDecisionContextFromTrinity,
  buildOracleTransportFromCore,
  buildSamsinOracleCore,
  buildTrinityAnalysisForRuntime,
} from '@/lib/interpretation';
import type { FinalSynthesis } from '@/lib/claude';

function collectFinalSynthesisText(synthesis: FinalSynthesis): string[] {
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BirthParamsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '필수 입력값이 없습니다.' }, { status: 400 });
    }

    const { data: samsinData, scores } = await getSession(parsed.data);

    // 서버 캐시의 점수로 consensus 계산 (클라이언트 데이터 무시)
    const metrics = calculateConsensusMetrics(
      scoredToGraph(scores.moneyPeriods),
      scoredToGraph(scores.careerPeriods),
    );
    const basePrescription = calculateBasePrescription(samsinData.wuxing);
    const oracle = buildSamsinOracleCore(samsinData);
    const trinityAnalysis = await buildTrinityAnalysisForRuntime(samsinData, {
      concern: normalizeConcern(parsed.data.concern),
      situation: parsed.data.situation,
    });

    if (!trinityAnalysis.audit.passed) {
      return NextResponse.json(
        {
          error: '마지막 정리의 의사결정 기준을 확인하지 못했어요. 표현을 더 조심스럽게 바꾼 뒤 다시 시도해주세요.',
          decisionContext: buildDecisionContextFromTrinity(trinityAnalysis),
        },
        { status: 422 },
      );
    }

    const synthesis = buildFinalSynthesisFromTrinity(trinityAnalysis, metrics, basePrescription);
    const oracleAudit = auditOracleRouteText(collectFinalSynthesisText(synthesis), oracle, { limit: 14 });
    if (!oracleAudit.passed) {
      return NextResponse.json(
        {
          error: '마지막 정리의 이유를 확인하지 못했어요. 표현을 더 조심스럽게 바꾼 뒤 다시 시도해주세요.',
          oracle: buildOracleTransportFromCore(oracle, { audit: oracleAudit, limit: 6 }),
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      synthesis,
      consensusMetrics: metrics,
      oracle: buildOracleTransportFromCore(oracle, { audit: oracleAudit, limit: 6 }),
      decisionContext: buildDecisionContextFromTrinity(trinityAnalysis),
    });
  } catch (err) {
    console.error('Final API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '오류' }, { status: 500 });
  }
}
