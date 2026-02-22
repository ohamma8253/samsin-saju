import { NextRequest, NextResponse } from 'next/server';
import { chatWithSamsin } from '@/lib/claude';
import type { ChatMessage, ReportContext } from '@/lib/claude';
import { getSession } from '@/lib/session';
import { BirthParamsSchema } from '@/lib/schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, reportContext } = body;
    const parsed = BirthParamsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '필수 입력값이 없습니다.' }, { status: 400 });
    }

    const { data: samsinData } = await getSession(parsed.data);

    const response = await chatWithSamsin(
      samsinData,
      (history ?? []) as ChatMessage[],
      message,
      reportContext as ReportContext | undefined,
    );
    return NextResponse.json({ response });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '오류' }, { status: 500 });
  }
}
