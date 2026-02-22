import { NextRequest, NextResponse } from 'next/server';
import { generateCompatibility } from '@/lib/claude';
import { getSession } from '@/lib/session';
import { BirthParamsSchema } from '@/lib/schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personA, personB, relationship, includeDeep } = body;

    const parsedA = BirthParamsSchema.safeParse(personA);
    const parsedB = BirthParamsSchema.safeParse(personB);
    if (!parsedA.success || !parsedB.success) {
      return NextResponse.json({ error: '필수 입력값이 없습니다.' }, { status: 400 });
    }

    const [{ data: dataA }, { data: dataB }] = await Promise.all([
      getSession(parsedA.data),
      getSession(parsedB.data),
    ]);

    const report = await generateCompatibility(dataA, dataB, relationship ?? 'friend', includeDeep ?? false);

    return NextResponse.json({
      report,
      meta: {
        nameA: parsedA.data.name,
        nameB: parsedB.data.name,
        dayPillarA: dataA.saju.pillars[1]?.pillar.ganzi,
        dayPillarB: dataB.saju.pillars[1]?.pillar.ganzi,
      },
    });
  } catch (err) {
    console.error('Compatibility API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '오류' }, { status: 500 });
  }
}
