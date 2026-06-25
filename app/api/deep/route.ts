import { NextRequest, NextResponse } from 'next/server';
import { samsinAgent } from '@/lib/samsin-agent';
import type { SamsinCharacter } from '@/lib/samsin-agent';
import { getSession } from '@/lib/session';
import { BirthParamsSchema } from '@/lib/schema';
import {
  auditOracleRouteText,
  buildOracleTransportFromCore,
  buildSamsinOracleCore,
  systemForCharacter,
} from '@/lib/interpretation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { character } = body;
    const parsed = BirthParamsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '필수 입력값이 없습니다.' }, { status: 400 });
    }

    const { data: samsinData } = await getSession(parsed.data);

    if (character !== 'cheongwoon' && character !== 'taeeul' && character !== 'luna') {
      return NextResponse.json({ error: '잘못된 캐릭터' }, { status: 400 });
    }

    const report = samsinAgent.generateDeepReport(character as SamsinCharacter, samsinData);
    const oracle = buildSamsinOracleCore(samsinData);
    const system = systemForCharacter(character);
    const oracleAudit = auditOracleRouteText(
      report.sections.flatMap(section => [section.title, section.content]),
      oracle,
      { system, limit: 8, allowSafetyOnlyWhenNoClaims: true },
    );

    if (!oracleAudit.passed) {
      return NextResponse.json(
        {
          error: '자세한 내용의 이유를 확인하지 못했어요. 표현을 더 조심스럽게 바꾼 뒤 다시 시도해주세요.',
          oracle: buildOracleTransportFromCore(oracle, { audit: oracleAudit, system, limit: 4 }),
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      report,
      oracle: buildOracleTransportFromCore(oracle, { audit: oracleAudit, system, limit: 4 }),
    });
  } catch (err) {
    console.error('Deep API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '오류' }, { status: 500 });
  }
}
