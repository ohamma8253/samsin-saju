import { NextRequest, NextResponse } from 'next/server';
import { generateFinalSynthesis } from '@/lib/claude';
import { calculateConsensusMetrics } from '@/lib/consensus';
import { calculateBasePrescription } from '@/lib/prescription';
import { getSession, scoredToGraph } from '@/lib/session';
import { BirthParamsSchema } from '@/lib/schema';

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

    const synthesis = await generateFinalSynthesis(samsinData, metrics, basePrescription);
    return NextResponse.json({ synthesis, consensusMetrics: metrics });
  } catch (err) {
    console.error('Final API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '오류' }, { status: 500 });
  }
}
