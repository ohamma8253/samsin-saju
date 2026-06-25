import { NextRequest, NextResponse } from 'next/server';
import type { CompatibilityReport } from '@/lib/claude';
import { generateRuleBasedCompatibility } from '@/lib/compatibility';
import { getSession } from '@/lib/session';
import { BirthParamsSchema } from '@/lib/schema';
import { auditPlainOracleTextSafety } from '@/lib/interpretation';

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

    const report = generateRuleBasedCompatibility(
      dataA,
      dataB,
      relationship === 'romantic' ? 'romantic' : 'friend',
      includeDeep ?? false,
    );
    const safetyAudit = auditPlainOracleTextSafety(collectCompatibilityText(report).join('\n'));
    if (!safetyAudit.passed) {
      return NextResponse.json(
        { error: '궁합 내용의 안전 기준을 확인하지 못했어요. 표현을 더 조심스럽게 바꾼 뒤 다시 시도해주세요.' },
        { status: 422 },
      );
    }

    return NextResponse.json({
      report,
      safetyAudit: {
        passed: safetyAudit.passed,
        checkedClaimCount: safetyAudit.checkedClaimCount,
        issues: safetyAudit.issues.map(item => ({ code: item.code, detail: item.detail })),
      },
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
