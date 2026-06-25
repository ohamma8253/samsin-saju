import { NextRequest, NextResponse } from 'next/server';
import type { ChatMessage, ReportContext } from '@/lib/claude';
import { samsinAgent } from '@/lib/samsin-agent';
import { getSession } from '@/lib/session';
import { BirthParamsSchema } from '@/lib/schema';
import { CHAT_MODE_COSTS, type ChatQuestionMode, type SamsinDeityKey } from '@/lib/pricing';
import {
  auditOracleRouteText,
  buildOracleTransportFromCore,
  buildSamsinOracleCore,
  systemForCharacter,
} from '@/lib/interpretation';

const CHAT_MODES = ['single_deity', 'trinity', 'deep_session'] as const;
const DEITIES = ['cheongwoon', 'taeeul', 'luna'] as const;

function isChatMode(value: unknown): value is ChatQuestionMode {
  return typeof value === 'string' && CHAT_MODES.includes(value as ChatQuestionMode);
}

function isDeity(value: unknown): value is SamsinDeityKey {
  return typeof value === 'string' && DEITIES.includes(value as SamsinDeityKey);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, reportContext } = body;
    const rawQuestionMode: unknown = body.questionMode;
    const rawSelectedDeity: unknown = body.selectedDeity;
    const isFirstFree = body.isFirstFree === true;
    const requestedQuestionMode: ChatQuestionMode = isChatMode(rawQuestionMode) ? rawQuestionMode : 'trinity';
    const questionMode: ChatQuestionMode = isFirstFree ? 'trinity' : requestedQuestionMode;
    const selectedDeity: SamsinDeityKey | undefined = !isFirstFree && isDeity(rawSelectedDeity) ? rawSelectedDeity : undefined;
    const expectedCost = isFirstFree ? 0 : CHAT_MODE_COSTS[questionMode];

    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: '질문을 입력해주세요.' }, { status: 400 });
    }
    if (questionMode === 'single_deity' && !selectedDeity) {
      return NextResponse.json({ error: '질문할 신을 선택해주세요.' }, { status: 400 });
    }
    if (body.costCookie !== expectedCost) {
      return NextResponse.json({ error: '채팅 비용 정보가 맞지 않습니다.' }, { status: 400 });
    }

    const parsed = BirthParamsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '필수 입력값이 없습니다.' }, { status: 400 });
    }

    const { data: samsinData } = await getSession(parsed.data);
    const oracle = buildSamsinOracleCore(samsinData);

    const response = samsinAgent.chat(
      samsinData,
      (history ?? []) as ChatMessage[],
      message,
      reportContext as ReportContext | undefined,
      { questionMode, selectedDeity, isFirstFree, costCookie: expectedCost },
    );
    const system = questionMode === 'single_deity' && selectedDeity ? systemForCharacter(selectedDeity) : undefined;
    const oracleAudit = auditOracleRouteText(
      Object.values(response).filter((item): item is string => typeof item === 'string' && item.trim().length > 0),
      oracle,
      {
        system,
        limit: questionMode === 'single_deity' ? 4 : 9,
        allowSafetyOnlyWhenNoClaims: questionMode === 'single_deity',
      },
    );
    if (!oracleAudit.passed) {
      return NextResponse.json(
        {
          error: '답변의 이유를 확인하지 못했어요. 질문을 더 구체적으로 바꿔 다시 시도해주세요.',
          oracle: buildOracleTransportFromCore(oracle, { audit: oracleAudit, system, limit: 4 }),
        },
        { status: 422 },
      );
    }
    return NextResponse.json({
      response,
      oracle: buildOracleTransportFromCore(oracle, { audit: oracleAudit, system, limit: 4 }),
    });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '오류' }, { status: 500 });
  }
}
