'use client';

import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import CookieShopModal, { type CookieShopContext } from '@/components/CookieShopModal';
import SafetyNotice from '@/components/SafetyNotice';
import SamsinCharacterCard, { SamsinAvatar } from '@/components/SamsinCharacterCard';
import { trackEvent } from '@/lib/analytics';
import { normalizeConcern } from '@/lib/concerns';
import { addCookies, deductCookies, getCookieCount, isUnlocked, setUnlocked } from '@/lib/cookies';
import { getConcernDesireCopy } from '@/lib/desire-copy';
import { buildEntitlementKey } from '@/lib/entitlements';
import type { DecisionContext } from '@/lib/interpretation/decision-context';
import {
  CHAT_DEEP_SESSION_COST,
  CHAT_MODE_COSTS,
  CHAT_SINGLE_DEITY_COST,
  CHAT_TRINITY_COST,
  type ChatQuestionMode,
  type ProductId,
  type SamsinDeityKey,
} from '@/lib/pricing';
import { readReportContextSnapshot, type ReportContextSnapshot } from '@/lib/report-context';
import { SAMSIN_CHARACTER_LIST } from '@/lib/samsin-characters';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  responses?: Partial<Record<SamsinDeityKey, string>>;
}

const MODES: Record<ChatQuestionMode, { label: string; desc: string; cost: number }> = {
  single_deity: { label: '한 신에게', desc: '기준·자리·리듬 중 하나', cost: CHAT_SINGLE_DEITY_COST },
  trinity: { label: '삼신에게', desc: '세 관점으로 바로 정리', cost: CHAT_TRINITY_COST },
  deep_session: { label: '깊게 묻기', desc: '반론과 이번 주 기준', cost: CHAT_DEEP_SESSION_COST },
};

const CHAT_PRODUCT_BY_MODE: Record<ChatQuestionMode, ProductId> = {
  single_deity: 'chat_single_deity',
  trinity: 'chat_trinity',
  deep_session: 'chat_deep_session',
};

const REPORT_CONTEXT_STORAGE_KEY = 'samsin_report_contexts';

const CLAIM_SYSTEM_LABEL: Record<DecisionContext['claimGrounding'][number]['system'], string> = {
  saju: '사주',
  ziwei: '자미',
  natal: '점성',
};

function subscribeReportContextStore(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', onStoreChange);
  window.addEventListener('samsin-report-context-change', onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener('samsin-report-context-change', onStoreChange);
  };
}

function getReportContextStoreSnapshot() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(REPORT_CONTEXT_STORAGE_KEY) ?? '[]';
}

function getReportContextServerSnapshot() {
  return '';
}

function buildDecisionSuggestions(
  decisionContext: DecisionContext | undefined,
  fallback: string[],
): string[] {
  if (!decisionContext) return fallback;
  const suggestions = [
    decisionContext.nowActions[0] ? '오늘 먼저 할 일을 한 단계로 줄여줘' : '',
    decisionContext.avoidActions[0] ? '피해야 할 기준을 더 구체적으로 잡아줘' : '',
    decisionContext.divergence[0] ? '공통 신호와 관점 차이를 풀어줘' : '',
  ].filter(Boolean);
  return suggestions.length > 0 ? suggestions : fallback;
}

function MissingReportState() {
  const router = useRouter();

  return (
    <main className="min-h-screen pb-24">
      <div className="mobile-shell flex min-h-screen items-center">
        <section className="panel-strong w-full p-6">
          <p className="section-label">이어 묻기</p>
          <h1 className="title-tight mt-2">리포트를 먼저 열어주세요</h1>
          <p className="body-copy mt-3">
            이어 묻기는 세 관점 리포트의 맥락을 기준으로 답합니다.
          </p>
          <button type="button" onClick={() => router.push('/')} className="btn-primary mt-5 w-full">
            내 고민 선택하기
          </button>
        </section>
      </div>
      <BottomNav active="ask" askDisabled />
    </main>
  );
}

function LoadingReportState() {
  return (
    <main className="min-h-screen pb-24">
      <div className="mobile-shell flex min-h-screen items-center">
        <section className="panel-strong w-full p-6">
          <p className="section-label">이어 묻기</p>
          <h1 className="title-tight mt-2">질문 맥락을 불러오고 있어요</h1>
        </section>
      </div>
      <BottomNav active="ask" askDisabled />
    </main>
  );
}

function AskChat({ snapshot }: { snapshot: ReportContextSnapshot }) {
  const router = useRouter();
  const firstFreeKey = buildEntitlementKey('chat_first_free', snapshot.params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [questionMode, setQuestionMode] = useState<ChatQuestionMode>('trinity');
  const [selectedDeity, setSelectedDeity] = useState<SamsinDeityKey>('cheongwoon');
  const [firstFreeUsed, setFirstFreeUsed] = useState(() => isUnlocked(firstFreeKey));
  const [cookieCount, setCookieCount] = useState(() => getCookieCount());
  const [showShop, setShowShop] = useState(false);
  const [shopContext, setShopContext] = useState<CookieShopContext | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const trackedOpenRef = useRef(false);

  const isFirstFree = !firstFreeUsed;
  const effectiveQuestionMode: ChatQuestionMode = isFirstFree ? 'trinity' : questionMode;
  const costCookie = isFirstFree ? 0 : CHAT_MODE_COSTS[effectiveQuestionMode];
  const chatProductId: ProductId = isFirstFree ? 'chat_first_free' : CHAT_PRODUCT_BY_MODE[effectiveQuestionMode];
  const desireCopy = getConcernDesireCopy(normalizeConcern(snapshot.params.concern));
  const decisionContext = snapshot.reportContext.decisionContext;
  const basisHeadline = decisionContext?.headline ?? snapshot.reportContext.totalReport?.coreInsightHeadline ?? snapshot.headline;
  const suggestionQuestions = useMemo(
    () => buildDecisionSuggestions(snapshot.reportContext.decisionContext, desireCopy.askSuggestions),
    [desireCopy.askSuggestions, snapshot.reportContext.decisionContext],
  );

  useEffect(() => {
    if (trackedOpenRef.current) return;
    trackedOpenRef.current = true;
    trackEvent('ask_opened', {
      report_id: snapshot.reportId,
      entry_point: 'ask_page',
    });
  }, [snapshot.reportId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const syncCookieCount = () => setCookieCount(getCookieCount());
    window.addEventListener('cookie-change', syncCookieCount);
    return () => window.removeEventListener('cookie-change', syncCookieCount);
  }, []);

  const openProductShop = (entryPoint: string, productId: ProductId, requiredCookie: number) => {
    trackEvent('shop_opened', {
      entry_point: entryPoint,
      product_id: productId,
      required_cookie: requiredCookie,
      current_cookie: getCookieCount(),
    });
    setShopContext({ productId, requiredCookie });
    setShowShop(true);
  };

  const closeShop = () => {
    setShowShop(false);
    setShopContext(undefined);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    if (costCookie > 0 && getCookieCount() < costCookie) {
      trackEvent('paywall_viewed', {
        product_id: chatProductId,
        required_cookie: costCookie,
        current_cookie: getCookieCount(),
        entry_point: 'ask_send',
      });
      openProductShop('ask_send', chatProductId, costCookie);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    const paid = costCookie === 0 || deductCookies(costCookie);
    if (!paid) {
      trackEvent('paywall_viewed', {
        product_id: chatProductId,
        required_cookie: costCookie,
        current_cookie: getCookieCount(),
        entry_point: 'ask_send',
      });
      openProductShop('ask_send', chatProductId, costCookie);
      setLoading(false);
      return;
    }

    setCookieCount(getCookieCount());
    trackEvent('chat_question_sent', {
      question_mode: effectiveQuestionMode,
      selected_deity: effectiveQuestionMode === 'single_deity' ? selectedDeity : null,
      cost_cookie: costCookie,
      is_first_free: isFirstFree,
      has_report_context: Boolean(snapshot.reportContext.decisionContext || snapshot.reportContext.totalReport),
      has_decision_context: Boolean(snapshot.reportContext.decisionContext),
    });

    try {
      const history = messages.map(message => ({ role: message.role, content: message.content }));
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history,
          reportContext: snapshot.reportContext,
          questionMode: effectiveQuestionMode,
          selectedDeity: effectiveQuestionMode === 'single_deity' ? selectedDeity : undefined,
          isFirstFree,
          costCookie,
          ...snapshot.params,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (isFirstFree) {
        setUnlocked(firstFreeKey);
        setFirstFreeUsed(true);
      }
      setMessages(prev => [...prev, { role: 'assistant', content: '', responses: data.response }]);
    } catch {
      if (costCookie > 0) {
        addCookies(costCookie);
        setCookieCount(getCookieCount());
      }
      setMessages(prev => [...prev, { role: 'assistant', content: '답변을 확인하지 못했어요. 질문을 조금 더 구체적으로 바꿔 다시 보내주세요.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen pb-32">
      <div className="mobile-shell space-y-4">
        <header className="panel-strong p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-label">이어 묻기</p>
              <h1 className="mt-1 text-2xl font-black">{desireCopy.askHeadline}</h1>
              <p className="muted-copy mt-1">{basisHeadline}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="chip chip-gold">{cookieCount}쿠키</span>
              <button type="button" onClick={() => router.push(snapshot.reportUrl)} className="chip">
                리포트
              </button>
            </div>
          </div>
        </header>

        <section className="panel p-4">
          <div className="grid grid-cols-[1fr_auto] items-start gap-3">
            <div>
              <p className="section-label">질문 기준</p>
              <p className="mt-1 text-sm font-black leading-snug">
                {basisHeadline}
              </p>
              <p className="muted-copy mt-1">
                {decisionContext?.mainStrategy ?? desireCopy.askSubcopy}
              </p>
              {decisionContext?.claimGrounding?.length ? (
                <div className="mt-3 grid gap-2">
                  {decisionContext.claimGrounding.slice(0, 2).map(claim => (
                    <div key={claim.claimId} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2">
                      <p className="text-[10px] font-black text-[var(--muted)]">리포트 근거 · {CLAIM_SYSTEM_LABEL[claim.system]}</p>
                      <p className="mt-1 text-xs font-bold leading-relaxed text-[var(--ink-soft)]">{claim.summary}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <span className={isFirstFree ? 'chip chip-green' : 'chip chip-gold'}>
              {isFirstFree ? '무료 첫 답변' : `${costCookie}쿠키`}
            </span>
          </div>
        </section>

        {messages.length === 0 && (
          <section className="panel-strong p-5">
            <p className="section-label">추천 질문</p>
            <h2 className="title-tight mt-1">지금 바로 이어볼 질문</h2>
            <div className="mt-4 grid gap-2">
              {suggestionQuestions.map(question => (
                <button key={question} type="button" onClick={() => setInput(question)} className="btn-secondary !justify-start !text-left">
                  {question}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-2">
              {SAMSIN_CHARACTER_LIST.map(character => (
                <SamsinCharacterCard key={character.key} character={character} variant="compact">
                  <p className="text-xs font-black" style={{ color: character.color }}>
                    {desireCopy.deityPrompts[character.key].cta}
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-[var(--muted)]">
                    {desireCopy.deityPrompts[character.key].line}
                  </p>
                </SamsinCharacterCard>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`}>
              {message.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[82%] rounded-lg bg-[var(--green)] px-4 py-3 text-sm leading-relaxed text-white">
                    {message.content}
                  </div>
                </div>
              ) : message.responses ? (
                <div className="space-y-3">
                  {SAMSIN_CHARACTER_LIST
                    .filter(character => Boolean(message.responses?.[character.key]))
                    .map(character => (
                      <SamsinCharacterCard
                        key={character.key}
                        character={character}
                        variant="voice"
                        action={<span className="chip">{character.short}</span>}
                      >
                        <p className="mt-3 text-xs font-bold text-[var(--muted)]">{character.lens}</p>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{message.responses?.[character.key]}</p>
                      </SamsinCharacterCard>
                    ))}
                </div>
              ) : (
                <div className="rounded-lg bg-[var(--red-soft)] px-4 py-3 text-sm font-bold text-[var(--red)]">
                  {message.content}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="panel p-4">
              <p className="section-label">답변을 확인하고 있어요</p>
              <div className="mt-3 space-y-2">
                {[70, 48, 62].map((width, index) => (
                  <div key={index} className="h-2 rounded-full bg-[var(--surface-2)]">
                    <div className="h-full rounded-full bg-[var(--line-strong)]" style={{ width: `${width}%` }} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </section>

        <section className="panel-strong p-4">
          {isFirstFree ? (
            <div className="rounded-lg border border-[var(--line)] bg-[var(--green-soft)] p-3">
              <p className="text-xs font-black text-[var(--green)]">첫 질문 무료</p>
              <p className="mt-1 text-xs font-bold text-[var(--ink-soft)]">
                리포트 확인 후, 1회 무료로 더 물어볼 수 있어요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(MODES) as [ChatQuestionMode, typeof MODES[ChatQuestionMode]][]).map(([mode, config]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setQuestionMode(mode)}
                  className={`rounded-lg border p-2 text-left ${questionMode === mode ? 'border-[rgba(20,122,92,0.32)] bg-[var(--green-soft)]' : 'border-[var(--line)] bg-[var(--surface)]'}`}
                >
                  <span className="block text-xs font-black">{config.label}</span>
                  <span className="mt-0.5 block text-[10px] font-bold text-[var(--ink-soft)]">{config.desc}</span>
                  <span className="block text-[10px] font-bold text-[var(--muted)]">{config.cost}쿠키</span>
                </button>
              ))}
            </div>
          )}

          {!isFirstFree && questionMode === 'single_deity' && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {SAMSIN_CHARACTER_LIST.map(character => (
                <button
                  key={character.key}
                  type="button"
                  onClick={() => setSelectedDeity(character.key)}
                  className={`rounded-lg border p-2 text-left ${selectedDeity === character.key ? 'border-[rgba(20,122,92,0.32)] bg-[var(--green-soft)]' : 'border-[var(--line)] bg-[var(--surface)]'}`}
                >
                  <span className="flex items-center gap-2">
                    <SamsinAvatar character={character} size="sm" className="!h-8 !w-8" />
                    <span className="min-w-0">
                      <span className="block text-xs font-black" style={{ color: character.color }}>{character.name}</span>
                      <span className="mt-0.5 block text-[10px] font-bold text-[var(--muted)]">{character.signature}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <p className="muted-copy mt-2 text-center">
            이번 질문: {costCookie === 0 ? '무료 · 삼신 첫 답변' : `${costCookie}쿠키`}
          </p>
          <SafetyNotice variant="inline" className="mt-2 text-center" />

          {messages.length > 0 && !loading && (
            <div className="mt-3 grid gap-2">
              <p className="section-label">다음으로 바로 물어볼 것</p>
              {suggestionQuestions.slice(0, 2).map(question => (
                <button key={question} type="button" onClick={() => setInput(question)} className="btn-secondary !justify-start !text-left">
                  {question}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) void send();
              }}
              placeholder={desireCopy.askPlaceholder}
              className="field flex-1"
            />
            <button type="button" onClick={send} disabled={loading || !input.trim()} className="btn-primary">
              {desireCopy.askSendCta}
            </button>
          </div>
        </section>
      </div>

      <BottomNav active="ask" reportHref={snapshot.reportUrl} askHref={`/ask?reportId=${encodeURIComponent(snapshot.reportId)}`} />
      {showShop && (
        <CookieShopModal
          onClose={closeShop}
          context={shopContext}
          onBought={() => getCookieCount()}
        />
      )}
    </main>
  );
}

function AskContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('reportId');
  const reportContextStore = useSyncExternalStore(
    subscribeReportContextStore,
    getReportContextStoreSnapshot,
    getReportContextServerSnapshot,
  );
  const snapshot = useMemo(
    () => (reportContextStore ? readReportContextSnapshot(reportId) : null),
    [reportContextStore, reportId],
  );

  if (!reportContextStore) return <LoadingReportState />;
  if (!snapshot) return <MissingReportState />;
  return <AskChat key={snapshot.reportId} snapshot={snapshot} />;
}

export default function AskPage() {
  return (
    <Suspense>
      <AskContent />
    </Suspense>
  );
}
