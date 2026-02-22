import { NextRequest, NextResponse } from 'next/server';
import { getDayPillar, getYearPillar } from '@/lib/saju';
import { generateTotalReport } from '@/lib/claude';
import { calculateConsensusMetrics } from '@/lib/consensus';
import { getSession } from '@/lib/session';
import { BirthParamsSchema } from '@/lib/schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BirthParamsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '필수 입력값이 없습니다.' }, { status: 400 });
    }

    const { data: samsinData, scores: preComputedScores } = await getSession(parsed.data);
    const report = await generateTotalReport(samsinData, preComputedScores);
    const consensusMetrics = calculateConsensusMetrics(
      report.moneyGraph,
      report.careerGraph,
    );

    return NextResponse.json({
      report,
      meta: {
        name: parsed.data.name,
        dayPillar: getDayPillar(samsinData),
        yearPillar: getYearPillar(samsinData),
        wuxing: samsinData.wuxing,
      },
      consensusMetrics,
    });
  } catch (err) {
    console.error('Report API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
