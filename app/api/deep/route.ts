import { NextRequest, NextResponse } from 'next/server';
import { generateDeepCheongwoon, generateDeepTaeeul, generateDeepLuna } from '@/lib/claude';
import { getSession } from '@/lib/session';
import { BirthParamsSchema } from '@/lib/schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { character } = body;
    const parsed = BirthParamsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '필수 입력값이 없습니다.' }, { status: 400 });
    }

    const { data: samsinData } = await getSession(parsed.data);

    let report;
    if (character === 'cheongwoon') report = await generateDeepCheongwoon(samsinData);
    else if (character === 'taeeul') report = await generateDeepTaeeul(samsinData);
    else if (character === 'luna') report = await generateDeepLuna(samsinData);
    else return NextResponse.json({ error: '잘못된 캐릭터' }, { status: 400 });

    return NextResponse.json({ report });
  } catch (err) {
    console.error('Deep API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '오류' }, { status: 500 });
  }
}
