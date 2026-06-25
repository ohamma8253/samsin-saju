'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import CookieShopModal, { type CookieShopContext } from '@/components/CookieShopModal';
import PrescriptionCard from '@/components/PrescriptionCard';
import SafetyNotice from '@/components/SafetyNotice';
import SamsinCharacterCard, { SamsinAvatar } from '@/components/SamsinCharacterCard';
import { trackEvent } from '@/lib/analytics';
import { upsertArchiveItem, type ArchiveItemKind } from '@/lib/archive';
import { getConcernCopy, normalizeConcern } from '@/lib/concerns';
import { addCookies, clearUnlocked, deductCookies, getCookieCount, isUnlocked, setUnlocked } from '@/lib/cookies';
import { getConcernDesireCopy } from '@/lib/desire-copy';
import { buildEntitlementKey, buildReportId } from '@/lib/entitlements';
import { buildDecisionContextFromTrinity, type DecisionContext } from '@/lib/interpretation/decision-context';
import type { TrinityPaidReport } from '@/lib/interpretation/report-adapter';
import { DEEP_BUNDLE_COST, FIRST_READING_COST, formatCookieValue, type ProductId } from '@/lib/pricing';
import { buildAskHref, saveReportContextSnapshot, type ReportChatParams } from '@/lib/report-context';
import { SAMSIN_CHARACTER_LIST } from '@/lib/samsin-characters';
import type { FinalSynthesis, GraphPeriod, LifeMoment, ReportContext } from '@/lib/claude';
import type { ConsensusMetrics } from '@/lib/consensus';
import type { TrinityAnalysis } from '@/lib/interpretation/decision';
import type { SamsinInput } from '@/lib/saju';

const SYSTEMS = SAMSIN_CHARACTER_LIST;

const LOADING_COPY = ['생년월일 확인', '세 관점 계산', '같은 점과 다른 점 정리', '근거 확인'];

interface LegacyTotalReport {
  characterVoices?: { cheongwoon: string; taeeul: string; luna: string };
  coreInsight?: { headline: string; body: string };
  moneyGraph?: GraphPeriod[];
  careerGraph?: GraphPeriod[];
  peakMoments?: LifeMoment[];
  hardMoments?: LifeMoment[];
  samsinMessage: string;
}

interface ReportMeta {
  name: string;
  dayPillar: string;
  yearPillar: string;
  wuxing: Record<string, number>;
}

interface DeepSection {
  title: string;
  content: string;
}

interface FreeReport {
  headline: string;
  body: string;
  todayAction: string;
  previewCards: { title: string; body: string }[];
}

interface OracleEvidenceLine {
  id: string;
  system: 'saju' | 'ziwei' | 'natal';
  title: string;
  basis: string[];
  caveat?: string;
}

interface OracleEvidenceCard {
  claimId: string;
  consensusId?: string;
  domain: string;
  claimAxis: string;
  claimStrength: 'weak' | 'moderate' | 'strong';
  claim: string;
  evidence: OracleEvidenceLine[];
  caveat?: string;
}

interface OracleAuditSummary {
  passed: boolean;
  checkedClaimCount: number;
  knownClaimCount: number;
  issues: { code: string; claimId?: string; detail: string }[];
}

interface OraclePayload {
  safetyPolicyVersion: string;
  evidenceCards: OracleEvidenceCard[];
  audit?: OracleAuditSummary;
}

interface ReportResponse {
  error?: string;
  freeReport?: FreeReport;
  report?: TrinityPaidReport;
  trinityReport?: TrinityPaidReport;
  legacyReport?: LegacyTotalReport;
  legacyReportBlocked?: boolean;
  meta?: ReportMeta;
  consensusMetrics?: ConsensusMetrics;
  oracle?: OraclePayload;
  legacyOracle?: OraclePayload;
  trinityAnalysis?: TrinityAnalysis;
  decisionContext?: DecisionContext;
}

interface FinalResponse {
  error?: string;
  synthesis?: FinalSynthesis;
  consensusMetrics?: ConsensusMetrics;
  oracle?: OraclePayload;
  decisionContext?: DecisionContext;
}

type ReportIntent = 'free' | 'first_reading';

const SYSTEM_LABEL: Record<OracleEvidenceLine['system'], string> = {
  saju: '사주',
  ziwei: '자미',
  natal: '점성',
};

const STRENGTH_LABEL: Record<OracleEvidenceCard['claimStrength'], string> = {
  weak: '가볍게 참고',
  moderate: '참고할 이유',
  strong: '잘 맞아요',
};

const CONSENSUS_LABEL: Record<string, string> = {
  unanimous: '잘 맞아요',
  majority: '대체로 맞아요',
  conflict: '다르게 봐요',
};

function currentLabel(graph: GraphPeriod[] | undefined, age: number): string | undefined {
  if (!graph) return undefined;
  return graph.find(item => {
    const match = item.label.match(/^(\d+)~(\d+)세$/);
    if (!match) return false;
    return age >= Number(match[1]) && age <= Number(match[2]);
  })?.label;
}

function EvidencePanel({ payload, title }: { payload: OraclePayload | null; title: string }) {
  if (!payload || payload.evidenceCards.length === 0) return null;

  return (
    <section className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label">{title}</p>
          <h3 className="mt-1 text-base font-black">왜 이렇게 봤어요</h3>
        </div>
        <span className={`chip ${payload.audit?.passed ? 'chip-green' : ''}`}>
          {payload.audit?.passed ? '확인했어요' : '확인 중'}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {payload.evidenceCards.slice(0, 4).map(card => (
          <article key={card.claimId} className="panel-flat p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-extrabold leading-snug">{card.claim}</p>
              <span className="chip chip-gold shrink-0">{STRENGTH_LABEL[card.claimStrength]}</span>
            </div>
            <div className="mt-3 space-y-2">
              {card.evidence.slice(0, 3).map(item => (
                <div key={item.id} className="flex gap-2 text-xs leading-relaxed text-[var(--muted)]">
                  <span className="mt-1 evidence-dot shrink-0" />
                  <span className="min-w-0">
                    <span className="chip !min-h-0 !px-2 !py-0.5 text-[10px]">{SYSTEM_LABEL[item.system]}</span>
                    <span className="ml-2 font-bold text-[var(--ink-soft)]">{item.title}</span>
                    {item.basis[0] && (
                      <span className="mt-1 block text-[10px] text-[var(--muted)]">원자료 기준: {item.basis[0]}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {card.caveat && (
              <p className="mt-3 rounded-md bg-[var(--gold-soft)] px-3 py-2 text-xs font-bold text-[#775514]">
                {card.caveat}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function TrinitySignalPanel({ report }: { report: TrinityPaidReport }) {
  const nowCriterion = report.actionPlan.now[0] ?? report.mainStrategy;
  return (
    <div className="mt-4 grid gap-2">
      <div className="panel-flat p-3">
        <p className="text-xs font-black text-[var(--green)]">공통 신호</p>
        <p className="mt-1 text-sm font-bold leading-relaxed text-[var(--ink-soft)]">
          {report.convergence[0] ?? report.diagnosis}
        </p>
      </div>
      <div className="panel-flat p-3">
        <p className="text-xs font-black text-[var(--blue)]">관점 차이</p>
        <p className="mt-1 text-sm font-bold leading-relaxed text-[var(--ink-soft)]">
          {report.divergence[0] ?? report.caution}
        </p>
      </div>
      <div className="panel-flat p-3">
        <p className="text-xs font-black text-[var(--gold)]">오늘의 기준</p>
        <p className="mt-1 text-sm font-bold leading-relaxed text-[var(--ink-soft)]">{nowCriterion}</p>
      </div>
    </div>
  );
}

function DecisionSummaryPanel({
  decisionContext,
  compact = false,
}: {
  decisionContext?: DecisionContext | null;
  compact?: boolean;
}) {
  if (!decisionContext) return null;

  return (
    <section className={compact ? 'rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-4' : 'mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-4'}>
      <p className="section-label">오늘의 결론</p>
      {!compact && <h3 className="mt-1 text-base font-black">{decisionContext.headline}</h3>}
      <p className="mt-2 text-sm font-bold leading-relaxed text-[var(--ink-soft)]">{decisionContext.diagnosis}</p>
      <div className="mt-3 grid gap-2">
        <div className="panel-flat p-3">
          <p className="text-xs font-black text-[var(--green)]">지금의 전략</p>
          <p className="mt-1 text-sm font-bold leading-relaxed text-[var(--ink-soft)]">{decisionContext.mainStrategy}</p>
        </div>
        <div className="panel-flat p-3">
          <p className="text-xs font-black text-[var(--gold)]">주의할 기준</p>
          <p className="mt-1 text-sm font-bold leading-relaxed text-[var(--ink-soft)]">{decisionContext.caution}</p>
        </div>
      </div>
      {decisionContext.nowActions.length > 0 && (
        <div className="mt-3 rounded-lg bg-[var(--green-soft)] p-3">
          <p className="section-label text-[var(--green)]">지금 할 일</p>
          <div className="mt-2 grid gap-1">
            {decisionContext.nowActions.slice(0, compact ? 2 : 3).map(action => (
              <p key={action} className="text-sm font-bold leading-relaxed text-[var(--ink)]">{action}</p>
            ))}
          </div>
        </div>
      )}
      {decisionContext.avoidActions.length > 0 && (
        <div className="mt-3 rounded-lg bg-[var(--gold-soft)] p-3">
          <p className="section-label text-[#775514]">하지 말 일</p>
          <div className="mt-2 grid gap-1">
            {decisionContext.avoidActions.slice(0, compact ? 1 : 2).map(action => (
              <p key={action} className="text-sm font-bold leading-relaxed text-[#775514]">{action}</p>
            ))}
          </div>
        </div>
      )}
      {!compact && (
        <div className="mt-3 grid gap-2">
          {decisionContext.convergence.slice(0, 2).map(item => (
            <div key={item} className="panel-flat p-3">
              <p className="text-xs font-black text-[var(--blue)]">같이 보는 점</p>
              <p className="mt-1 text-xs font-bold leading-relaxed text-[var(--ink-soft)]">{item}</p>
            </div>
          ))}
          {decisionContext.divergence.slice(0, 2).map(item => (
            <div key={item} className="panel-flat p-3">
              <p className="text-xs font-black text-[var(--gold)]">다르게 보는 지점</p>
              <p className="mt-1 text-xs font-bold leading-relaxed text-[var(--ink-soft)]">{item}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface CharacterVoices {
  cheongwoon?: string;
  taeeul?: string;
  luna?: string;
}

function buildCharacterVoicesFromTrinity(analysis?: TrinityAnalysis | null): CharacterVoices | undefined {
  if (!analysis) return undefined;
  return {
    cheongwoon: analysis.portrait.saju.nativeSummary || analysis.portrait.saju.personPortrait,
    taeeul: analysis.portrait.ziwei.nativeSummary || analysis.portrait.ziwei.personPortrait,
    luna: analysis.portrait.natal.nativeSummary || analysis.portrait.natal.personPortrait,
  };
}

function SamsinVoicePanel({ voices, compact = false }: { voices?: CharacterVoices; compact?: boolean }) {
  if (!voices || !Object.values(voices).some(Boolean)) return null;

  return (
    <section className={compact ? 'mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3' : 'panel p-4'}>
      <div>
        <p className="section-label">삼신 첫마디</p>
        <h3 className={compact ? 'mt-1 text-sm font-black' : 'mt-1 text-base font-black'}>세 명이 다르게 짚는 지점</h3>
      </div>
      <div className={compact ? 'mt-3 grid gap-2' : 'mt-4 space-y-3'}>
        {SYSTEMS.map(system => (
          <SamsinCharacterCard key={system.key} character={system} variant={compact ? 'voice' : 'default'}>
            <p className="text-xs font-black" style={{ color: system.color }}>
              {system.method} · {system.archetype}
            </p>
            <p className="mt-1 text-xs font-bold text-[var(--ink-soft)]">{system.roleLine}</p>
            {!compact && <p className="mt-1 text-xs font-bold text-[var(--muted)]">{system.lens}</p>}
            <p className={`${compact ? 'text-xs' : 'mt-2 text-sm'} leading-relaxed text-[var(--ink-soft)]`}>{voices[system.key]}</p>
          </SamsinCharacterCard>
        ))}
      </div>
    </section>
  );
}

function NativeLensPanel({ analysis }: { analysis?: TrinityAnalysis | null }) {
  if (!analysis) return null;

  const cards = [
    { character: SYSTEMS[0], reading: analysis.portrait.saju, label: '사주 native 근거' },
    { character: SYSTEMS[1], reading: analysis.portrait.ziwei, label: '자미 native 근거' },
    { character: SYSTEMS[2], reading: analysis.portrait.natal, label: '점성 native 근거' },
  ];

  return (
    <section className="panel p-4">
      <p className="section-label">세 관점의 원자료 해석</p>
      <h3 className="mt-1 text-base font-black">같은 생년월일을 다르게 읽는 방식</h3>
      <div className="mt-4 space-y-3">
        {cards.map(({ character, reading, label }) => (
          <SamsinCharacterCard key={character.key} character={character} variant="voice">
            <p className="text-xs font-black" style={{ color: character.color }}>{label}</p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-[var(--ink-soft)]">{reading.personPortrait}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {reading.keySymbols.slice(0, 4).map(symbol => (
                <span key={symbol} className={`chip ${character.chipClass}`}>{symbol}</span>
              ))}
            </div>
            <div className="mt-3 grid gap-2">
              {reading.coreClaims.slice(0, 2).map(claim => (
                <div key={claim.id} className="panel-flat p-3">
                  <p className="text-xs font-black text-[var(--ink)]">{claim.title}</p>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-[var(--muted)]">{claim.statement}</p>
                </div>
              ))}
            </div>
          </SamsinCharacterCard>
        ))}
      </div>
    </section>
  );
}

function ScoreSection({ title, graph, activeLabel }: { title: string; graph?: GraphPeriod[]; activeLabel?: string }) {
  if (!graph || graph.length === 0) return null;

  return (
    <section className="panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="section-label">흐름 타임라인</p>
          <h3 className="mt-1 text-base font-black">{title}</h3>
        </div>
        <span className="chip">삼신 점수</span>
      </div>
      <div className="space-y-3">
        {graph.map(item => {
          const active = item.label === activeLabel;
          return (
            <div key={item.label} className={`rounded-lg border p-3 ${active ? 'bg-[var(--green-soft)] border-[rgba(20,122,92,0.28)]' : 'bg-[var(--surface)] border-[var(--line)]'}`}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-extrabold text-[var(--ink)]">{item.label}</span>
                <span className={active ? 'font-black text-[var(--green)]' : 'font-bold text-[var(--muted)]'}>
                  {active ? '지금 ' : ''}{item.score}점
                </span>
              </div>
              <div className="mt-2 timeline-bar">
                <div className="timeline-fill" style={{ width: `${Math.max(6, Math.min(100, item.score))}%` }} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{item.note}</p>
              <div className="mt-2 flex gap-2 text-[10px] font-bold text-[var(--muted)]">
                <span>사주 {item.sajuScore ?? '-'}</span>
                <span>자미 {item.ziweiScore ?? '-'}</span>
                <span>점성 {item.natalScore ?? '-'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MomentList({ title, items }: { title: string; items?: LifeMoment[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="panel p-4">
      <p className="section-label">시기 신호</p>
      <h3 className="mt-1 text-base font-black">{title}</h3>
      <div className="mt-4 space-y-2">
        {items.slice(0, 5).map(item => (
          <div key={`${item.rank}-${item.timing}`} className="grid grid-cols-[70px_1fr] gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
            <div>
              <p className="text-xs font-black text-[var(--green)]">{item.timing}</p>
              <p className="mt-1 text-[10px] font-bold text-[var(--muted)]">신호 {item.rank}</p>
            </div>
            <div>
              <p className="text-sm font-extrabold">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WuxingMini({ wuxing }: { wuxing?: Record<string, number> }) {
  if (!wuxing) return null;
  const labels: Record<string, string> = { tree: '목', fire: '화', earth: '토', metal: '금', water: '수' };
  const max = Math.max(...Object.values(wuxing), 1);
  return (
    <section className="panel p-4">
      <p className="section-label">오행 균형</p>
      <h3 className="mt-1 text-base font-black">오행 분포</h3>
      <div className="mt-4 space-y-2">
        {Object.entries(labels).map(([key, label]) => {
          const value = wuxing[key] ?? 0;
          return (
            <div key={key} className="grid grid-cols-[28px_1fr_24px] items-center gap-2 text-xs">
              <span className="font-black">{label}</span>
              <div className="timeline-bar">
                <div className="timeline-fill" style={{ width: `${Math.max(5, (value / max) * 100)}%` }} />
              </div>
              <span className="text-right font-bold text-[var(--muted)]">{value}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const name = searchParams.get('name') ?? '';
  const year = searchParams.get('year') ?? '';
  const month = searchParams.get('month') ?? '';
  const day = searchParams.get('day') ?? '';
  const hour = searchParams.get('hour') ?? '12';
  const minute = searchParams.get('minute') ?? '0';
  const gender = searchParams.get('gender') ?? 'M';
  const city = searchParams.get('city') ?? 'seoul';
  const unknownTime = searchParams.get('unknownTime') === '1' || searchParams.get('unknownTime') === 'true';
  const birthTimePrecision = searchParams.get('birthTimePrecision') === 'unknown' ? 'unknown' : 'range';
  const intent: ReportIntent = searchParams.get('intent') === 'first_reading' ? 'first_reading' : 'free';
  const concern = searchParams.get('concern') ?? '';
  const concernKey = normalizeConcern(concern);
  const concernCopy = getConcernCopy(concernKey);
  const desireCopy = getConcernDesireCopy(concernKey);
  const age = new Date().getFullYear() - Number(year);
  const searchString = searchParams.toString();

  const birthParams: SamsinInput = useMemo(() => ({
    name,
    gender: gender === 'F' ? 'F' : 'M',
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    unknownTime,
    birthTimePrecision,
    city,
  }), [birthTimePrecision, city, day, gender, hour, minute, month, name, unknownTime, year]);

  const entitlementParams = useMemo(() => ({
    year,
    month,
    day,
    hour,
    minute,
    gender,
    city,
    unknownTime,
    birthTimePrecision,
  }), [birthTimePrecision, city, day, gender, hour, minute, month, unknownTime, year]);

  const firstReadingKey = buildEntitlementKey('first_reading', entitlementParams);
  const deepBundleKey = buildEntitlementKey('deep_bundle', entitlementParams);
  const reportId = useMemo(() => buildReportId(entitlementParams), [entitlementParams]);
  const reportUrl = useMemo(() => `/report?${searchString}`, [searchString]);
  const askHref = useMemo(() => buildAskHref(reportId), [reportId]);
  const reportChatParams: ReportChatParams = useMemo(() => ({
    name,
    year,
    month,
    day,
    hour,
    minute,
    gender,
    city,
    unknownTime: unknownTime ? '1' : '0',
    birthTimePrecision,
    concern: concernKey,
  }), [birthTimePrecision, city, concernKey, day, gender, hour, minute, month, name, unknownTime, year]);

  const [loadingIndex, setLoadingIndex] = useState(0);
  const [freeReport, setFreeReport] = useState<FreeReport | null>(null);
  const [report, setReport] = useState<TrinityPaidReport | null>(null);
  const [legacyReport, setLegacyReport] = useState<LegacyTotalReport | null>(null);
  const [legacyReportBlocked, setLegacyReportBlocked] = useState(false);
  const [trinityAnalysis, setTrinityAnalysis] = useState<TrinityAnalysis | null>(null);
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [consensusMetrics, setConsensusMetrics] = useState<ConsensusMetrics | null>(null);
  const [oraclePayload, setOraclePayload] = useState<OraclePayload | null>(null);
  const [legacyOraclePayload, setLegacyOraclePayload] = useState<OraclePayload | null>(null);
  const [finalOraclePayload, setFinalOraclePayload] = useState<OraclePayload | null>(null);
  const [decisionContext, setDecisionContext] = useState<DecisionContext | null>(null);
  const [finalDecisionContext, setFinalDecisionContext] = useState<DecisionContext | null>(null);
  const [firstReadingLoading, setFirstReadingLoading] = useState(false);
  const [firstReadingUnlocked, setFirstReadingUnlocked] = useState(() => isUnlocked(firstReadingKey));
  const [deepBundleUnlocked, setDeepBundleUnlocked] = useState(() => isUnlocked(deepBundleKey));
  const [deepData, setDeepData] = useState<Record<string, DeepSection[]>>({});
  const [deepLoading, setDeepLoading] = useState<Record<string, boolean>>({});
  const [finalSynthesis, setFinalSynthesis] = useState<FinalSynthesis | null>(null);
  const [finalLoading, setFinalLoading] = useState(false);
  const [, setReportContext] = useState<ReportContext>({});
  const [showShop, setShowShop] = useState(false);
  const [shopContext, setShopContext] = useState<CookieShopContext | undefined>();
  const [error, setError] = useState('');
  const deepBundleRef = useRef<HTMLElement | null>(null);
  const firstReadingIntentHandledRef = useRef(false);
  const reportLoadedRef = useRef(false);
  const pendingShopActionRef = useRef<(() => void) | null>(null);

  const openShop = useCallback((
    entryPoint: string,
    productId?: ProductId,
    requiredCookie?: number,
  ) => {
    const currentCookie = getCookieCount();
    trackEvent('shop_opened', {
      entry_point: entryPoint,
      product_id: productId ?? null,
      required_cookie: requiredCookie ?? null,
      current_cookie: currentCookie,
    });
    if (productId && requiredCookie !== undefined) {
      trackEvent('paywall_viewed', {
        product_id: productId,
        required_cookie: requiredCookie,
        current_cookie: currentCookie,
        entry_point: entryPoint,
      });
    }
    setShopContext(productId ? { productId, requiredCookie } : undefined);
    setShowShop(true);
  }, []);

  const closeShop = useCallback(() => {
    setShowShop(false);
    setShopContext(undefined);
    pendingShopActionRef.current = null;
  }, []);

  const openProductShop = useCallback((
    entryPoint: string,
    productId: ProductId,
    requiredCookie: number,
    afterBuy?: () => void,
  ) => {
    pendingShopActionRef.current = afterBuy ?? null;
    openShop(entryPoint, productId, requiredCookie);
  }, [openShop]);

  const saveArchive = useCallback((
    kind: ArchiveItemKind,
    headline: string,
    summary: string,
    badges: string[],
    flags: { firstReading?: boolean; deepBundle?: boolean } = {},
    decisionContext?: DecisionContext,
  ) => {
    upsertArchiveItem({
      id: reportId,
      kind,
      name: meta?.name ?? name,
      headline: decisionContext?.headline ?? headline,
      summary: decisionContext?.mainStrategy ?? summary,
      reportUrl,
      concern: concernKey,
      decisionContext,
      badges,
      firstReadingUnlocked: flags.firstReading ?? firstReadingUnlocked,
      deepBundleUnlocked: flags.deepBundle ?? deepBundleUnlocked,
    });
    trackEvent('result_saved', {
      kind,
      report_id: reportId,
      first_reading_unlocked: flags.firstReading ?? firstReadingUnlocked,
      deep_bundle_unlocked: flags.deepBundle ?? deepBundleUnlocked,
    });
  }, [concernKey, deepBundleUnlocked, firstReadingUnlocked, meta?.name, name, reportId, reportUrl]);

  const persistReportContext = useCallback((
    nextContext: ReportContext,
    flags: { firstReading?: boolean; deepBundle?: boolean } = {},
  ) => {
    saveReportContextSnapshot({
      reportId,
      reportUrl,
      params: reportChatParams,
      reportContext: nextContext,
      concern: concernKey,
      name: meta?.name ?? name,
      headline: nextContext.decisionContext?.headline ?? nextContext.totalReport?.coreInsightHeadline ?? '삼신 리포트',
      firstReadingUnlocked: flags.firstReading ?? firstReadingUnlocked,
      deepBundleUnlocked: flags.deepBundle ?? deepBundleUnlocked,
    });
  }, [
    concernKey,
    deepBundleUnlocked,
    firstReadingUnlocked,
    meta?.name,
    name,
    reportChatParams,
    reportId,
    reportUrl,
  ]);

  const applyFirstReadingPayload = useCallback((data: ReportResponse) => {
    const paidReport = data.trinityReport ?? data.report;
    if (!paidReport) return;
    const decisionContext = data.decisionContext
      ?? (data.trinityAnalysis ? buildDecisionContextFromTrinity(data.trinityAnalysis) : undefined);
    reportLoadedRef.current = true;
    setReport(paidReport);
    setLegacyReport(data.legacyReport ?? null);
    setLegacyReportBlocked(Boolean(data.legacyReportBlocked));
    setTrinityAnalysis(data.trinityAnalysis ?? null);
    if (data.meta) setMeta(data.meta);
    if (data.consensusMetrics) setConsensusMetrics(data.consensusMetrics);
    if (data.oracle) setOraclePayload(data.oracle);
    if (data.legacyOracle) setLegacyOraclePayload(data.legacyOracle);
    setDecisionContext(decisionContext ?? null);

    setReportContext(prev => {
      const nextContext: ReportContext = {
        ...prev,
        decisionContext: decisionContext,
        totalReport: {
          coreInsightHeadline: paidReport.headline,
          coreInsightBody: paidReport.summary,
          samsinMessage: paidReport.mainStrategy,
          moneyGraphSummary: paidReport.convergence.join(' / '),
          careerGraphSummary: [
            ...paidReport.actionPlan.now,
            ...paidReport.actionPlan.next3Months,
          ].join(' / '),
        },
      };
      persistReportContext(nextContext, { firstReading: true });
      return nextContext;
    });
  }, [persistReportContext]);

  const fetchReport = useCallback(async (tier: 'free' | 'first_reading'): Promise<ReportResponse> => {
    const response = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...birthParams, tier, concern: concernKey }),
    });
    return response.json() as Promise<ReportResponse>;
  }, [birthParams, concernKey]);

  const loadFirstReading = useCallback(async (charged: boolean) => {
    setFirstReadingLoading(true);
    try {
      const data = await fetchReport('first_reading');
      if (data.error) throw new Error(data.error);
      applyFirstReadingPayload(data);
      setFirstReadingUnlocked(true);
      const paidReport = data.trinityReport ?? data.report;
      if (paidReport) {
        const firstDecisionContext = data.decisionContext
          ?? (data.trinityAnalysis ? buildDecisionContextFromTrinity(data.trinityAnalysis) : undefined);
        saveArchive(
          'first_reading',
          firstDecisionContext?.headline ?? paidReport.headline ?? '세 관점 보기',
          firstDecisionContext?.mainStrategy ?? paidReport.summary,
          ['세 관점', '근거', '검토'],
          { firstReading: true },
          firstDecisionContext,
        );
        trackEvent('report_loaded', { tier: 'first_reading', report_id: reportId });
      }
      if (charged) {
        trackEvent('first_reading_unlocked', {
          product_id: 'first_reading',
          required_cookie: FIRST_READING_COST,
          report_id: reportId,
        });
      }
    } catch {
      if (charged) {
        addCookies(FIRST_READING_COST);
        clearUnlocked(firstReadingKey);
        setFirstReadingUnlocked(false);
      }
      setError('세 관점을 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.');
    } finally {
      setFirstReadingLoading(false);
    }
  }, [applyFirstReadingPayload, fetchReport, firstReadingKey, reportId, saveArchive]);

  const runFirstReadingFromBalance = useCallback(() => {
    if (reportLoadedRef.current) return true;
    if (firstReadingUnlocked || isUnlocked(firstReadingKey)) {
      firstReadingIntentHandledRef.current = true;
      setFirstReadingUnlocked(true);
      void loadFirstReading(false);
      return true;
    }
    if (getCookieCount() < FIRST_READING_COST) return false;
    if (!deductCookies(FIRST_READING_COST)) return false;
    firstReadingIntentHandledRef.current = true;
    setUnlocked(firstReadingKey);
    setFirstReadingUnlocked(true);
    void loadFirstReading(true);
    return true;
  }, [firstReadingKey, firstReadingUnlocked, loadFirstReading]);

  const handleShopBought = useCallback(() => {
    const pendingAction = pendingShopActionRef.current;
    pendingShopActionRef.current = null;
    if (pendingAction) {
      pendingAction();
      return getCookieCount();
    }
    return getCookieCount();
  }, []);

  useEffect(() => {
    if (!name || !year) return;
    const timer = setInterval(() => {
      setLoadingIndex(prev => (prev + 1) % LOADING_COPY.length);
    }, 700);

    const firstUnlocked = isUnlocked(firstReadingKey);
    const unlockTimer = window.setTimeout(() => {
      setFirstReadingUnlocked(firstUnlocked);
      setDeepBundleUnlocked(isUnlocked(deepBundleKey));
    }, 0);

    fetchReport('free')
      .then(data => {
        if (data.error) {
          setError(data.error);
          return;
        }
        if (data.freeReport) {
          setFreeReport(data.freeReport);
          const freeContext: ReportContext = {
            totalReport: {
              coreInsightHeadline: data.freeReport.headline,
              coreInsightBody: data.freeReport.body,
              samsinMessage: data.freeReport.todayAction,
              moneyGraphSummary: `${concernCopy.label}: ${data.freeReport.previewCards.map(card => `${card.title} ${card.body}`).join(' / ')}`,
              careerGraphSummary: data.freeReport.todayAction,
            },
          };
          persistReportContext(freeContext, { firstReading: firstUnlocked });
          saveArchive(
            'free_report',
            data.freeReport.headline,
            data.freeReport.body,
            ['오늘의 흐름', '오늘 할 일'],
          );
          trackEvent('free_report_loaded', { report_id: reportId, concern: concernKey });
          trackEvent('report_loaded', { tier: 'free', report_id: reportId });
        }
        if (data.meta) setMeta(data.meta);
        if (firstUnlocked) {
          firstReadingIntentHandledRef.current = true;
          if (!reportLoadedRef.current) void loadFirstReading(false);
        }
      })
      .catch(() => setError('내용을 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.'));

    return () => {
      clearInterval(timer);
      window.clearTimeout(unlockTimer);
    };
  }, [concernCopy.label, concernKey, deepBundleKey, fetchReport, firstReadingKey, loadFirstReading, name, persistReportContext, reportId, saveArchive, year]);

  const handleFirstReadingUnlock = async () => {
    trackEvent('first_reading_cta_clicked', {
      product_id: 'first_reading',
      required_cookie: FIRST_READING_COST,
      report_id: reportId,
      concern: concernKey,
    });
    if (!runFirstReadingFromBalance()) {
      openProductShop(
        'first_reading_cta',
        'first_reading',
        FIRST_READING_COST,
        () => { runFirstReadingFromBalance(); },
      );
      return;
    }
  };

  const unlockDeepBundle = (
    entryPoint = 'deep_bundle_cta',
    afterBuy?: () => void,
  ): { ok: boolean; charged: boolean } => {
    if (deepBundleUnlocked || isUnlocked(deepBundleKey)) {
      setDeepBundleUnlocked(true);
      return { ok: true, charged: false };
    }
    if (getCookieCount() < DEEP_BUNDLE_COST) {
      openProductShop(entryPoint, 'deep_bundle', DEEP_BUNDLE_COST, afterBuy);
      return { ok: false, charged: false };
    }
    if (!deductCookies(DEEP_BUNDLE_COST)) {
      openProductShop(entryPoint, 'deep_bundle', DEEP_BUNDLE_COST, afterBuy);
      return { ok: false, charged: false };
    }
    setUnlocked(deepBundleKey);
    setDeepBundleUnlocked(true);
    return { ok: true, charged: true };
  };

  const rollbackDeepBundle = () => {
    addCookies(DEEP_BUNDLE_COST);
    clearUnlocked(deepBundleKey);
    setDeepBundleUnlocked(false);
  };

  const handleDeepBundleUnlockOnly = () => {
    trackEvent('deep_bundle_cta_clicked', {
      product_id: 'deep_bundle',
      entry_point: 'bundle_overview',
      required_cookie: DEEP_BUNDLE_COST,
      report_id: reportId,
    });
    const unlock = unlockDeepBundle('deep_bundle_bundle_cta', () => { handleDeepBundleUnlockOnly(); });
    if (unlock.ok && unlock.charged) {
      trackEvent('deep_bundle_unlocked', {
        product_id: 'deep_bundle',
        entry_point: 'bundle_overview',
        required_cookie: DEEP_BUNDLE_COST,
        report_id: reportId,
      });
    }
  };

  const handleDeepUnlock = async (character: (typeof SYSTEMS)[number]['key']) => {
    if (deepData[character]) return;
    const unlock = unlockDeepBundle('deep_bundle_cta', () => { void handleDeepUnlock(character); });
    if (!unlock.ok) return;
    setDeepLoading(prev => ({ ...prev, [character]: true }));
    try {
      const response = await fetch('/api/deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...birthParams, character }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const sections = data.report.sections as DeepSection[];
      setDeepData(prev => ({ ...prev, [character]: sections }));
      if (unlock.charged) {
        trackEvent('deep_bundle_unlocked', {
          product_id: 'deep_bundle',
          entry_point: 'deep_report',
          required_cookie: DEEP_BUNDLE_COST,
          report_id: reportId,
        });
      }
      saveArchive(
        'deep_bundle',
        decisionContext?.headline ?? report?.headline ?? '깊게 보기',
        `${SYSTEMS.find(system => system.key === character)?.name ?? '삼신'} 관점을 깊게 열었어요.`,
        ['깊게 보기', '세 관점', '마지막 정리 포함'],
        { firstReading: true, deepBundle: true },
        decisionContext ?? undefined,
      );
      setReportContext(prev => {
        const nextContext: ReportContext = {
          ...prev,
          deepReports: {
            ...prev.deepReports,
            [character]: sections.map(item => `${item.title}: ${item.content}`).join('\n'),
          },
        };
        persistReportContext(nextContext, { firstReading: true, deepBundle: true });
        return nextContext;
      });
    } catch {
      if (unlock.charged) rollbackDeepBundle();
      setError('자세한 내용을 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.');
    } finally {
      setDeepLoading(prev => ({ ...prev, [character]: false }));
    }
  };

  const handleFinalSynthesis = async () => {
    if (finalSynthesis || finalLoading) return;
    const unlock = unlockDeepBundle('final_synthesis_cta', () => { void handleFinalSynthesis(); });
    if (!unlock.ok) return;
    setFinalLoading(true);
    try {
      const response = await fetch('/api/final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...birthParams, concern: concernKey }),
      });
      const data = await response.json() as FinalResponse;
      if (data.error) throw new Error(data.error);
      if (data.synthesis) setFinalSynthesis(data.synthesis);
      if (data.consensusMetrics) setConsensusMetrics(data.consensusMetrics);
      if (data.oracle) setFinalOraclePayload(data.oracle);
      if (data.decisionContext) setFinalDecisionContext(data.decisionContext);
      if (data.synthesis) {
        if (unlock.charged) {
          trackEvent('deep_bundle_unlocked', {
            product_id: 'deep_bundle',
            entry_point: 'final_judgment',
            required_cookie: DEEP_BUNDLE_COST,
            report_id: reportId,
          });
        }
        saveArchive(
          'deep_bundle',
          data.decisionContext?.headline ?? data.synthesis.verdict,
          data.decisionContext?.mainStrategy ?? data.synthesis.nowAdvice,
          ['마지막 정리', '지금 할 일', CONSENSUS_LABEL[data.synthesis.consensusLevel ?? consensusMetrics?.level ?? 'majority'] ?? '흐름 확인'],
          { firstReading: true, deepBundle: true },
          data.decisionContext ?? decisionContext ?? undefined,
        );
        setReportContext(prev => {
          const nextContext: ReportContext = {
            ...prev,
            decisionContext: data.decisionContext ?? prev.decisionContext,
            finalSynthesis: {
              verdict: data.synthesis?.verdict ?? '',
              consensusLevel: data.synthesis?.consensusLevel ?? 'majority',
              consensusNote: data.synthesis?.consensusNote ?? '',
              nowAdvice: data.synthesis?.nowAdvice ?? '',
              prescription: data.synthesis?.prescription
                ? `색 ${data.synthesis.prescription.luckyColor.name}, 방향 ${data.synthesis.prescription.luckyDirection.name}, 숫자 ${data.synthesis.prescription.luckyNumber.value}`
                : '',
              seal: data.synthesis?.seal ?? '',
            },
          };
          persistReportContext(nextContext, { firstReading: true, deepBundle: true });
          return nextContext;
        });
      }
    } catch {
      if (unlock.charged) rollbackDeepBundle();
      setError('마지막 정리를 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.');
    } finally {
      setFinalLoading(false);
    }
  };

  if (!freeReport && !error) {
    return (
      <main className="min-h-screen">
        <div className="mobile-shell flex min-h-screen items-center">
          <div className="panel-strong w-full p-6">
            <p className="section-label">준비 중</p>
            <h1 className="title-tight mt-2">흐름을 보고 있어요</h1>
            <div className="mt-5 space-y-3">
              {LOADING_COPY.map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${index === loadingIndex ? 'bg-[var(--green)]' : 'bg-[var(--line-strong)]'}`} />
                  <span className={index === loadingIndex ? 'text-sm font-black' : 'text-sm text-[var(--muted)]'}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error && !freeReport) {
    return (
      <main className="min-h-screen">
        <div className="mobile-shell flex min-h-screen items-center">
          <div className="panel-strong w-full p-6">
            <p className="section-label">오류</p>
            <h1 className="title-tight mt-2">{error}</h1>
            <button type="button" onClick={() => router.push('/')} className="btn-primary mt-5 w-full">다시 입력하기</button>
          </div>
        </div>
      </main>
    );
  }

  const consensusLevel = finalSynthesis?.consensusLevel ?? consensusMetrics?.level ?? 'majority';
  const evidenceCount = oraclePayload?.evidenceCards.reduce((total, card) => total + card.evidence.length, 0) ?? 0;

  return (
    <main className="min-h-screen pb-24">
      <div className="mobile-shell space-y-4">
        <header className="panel-strong p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-label">삼신 리포트</p>
              <h1 className="mt-1 text-2xl font-black">{meta?.name ?? name}님의 일과 돈 흐름을 봤어요</h1>
              <p className="muted-copy mt-1">
                {meta?.dayPillar ? `일주 ${meta.dayPillar}` : '무료 흐름'} · {unknownTime ? '출생시간 미상' : `${age}세 기준`}
              </p>
            </div>
            <button type="button" onClick={() => openShop('report_header')} className="chip chip-gold">
              쿠키 충전
            </button>
          </div>
        </header>

        {freeReport && !report && (
          <section className="panel-strong p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-label">일·돈 첫 흐름</p>
                <h2 className="mt-2 text-[30px] font-black leading-tight">{freeReport.headline}</h2>
              </div>
              <span className="chip chip-green">무료</span>
            </div>
            <p className="body-copy mt-4">{freeReport.body}</p>

            <div className="free-bundle-card mt-4">
              <div>
                <p className="section-label text-[var(--green)]">무료 번들이 열렸어요</p>
                <h3>오늘 운세가 보관됐어요</h3>
              </div>
              <div className="free-bundle-list">
                <span>삼신 첫 인사</span>
                <span>보관함 저장</span>
                <span>첫 질문 1회</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
                <p className="text-lg font-black text-[var(--green)]">3</p>
                <p className="mt-1 text-[10px] font-bold text-[var(--muted)]">시스템</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
                <p className="text-lg font-black text-[var(--blue)]">근거</p>
                <p className="mt-1 text-[10px] font-bold text-[var(--muted)]">미리보기</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
                <p className="text-lg font-black text-[var(--gold)]">3쿠키</p>
                <p className="mt-1 text-[10px] font-bold text-[var(--muted)]">세 관점</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--green-soft)] p-3">
              <p className="section-label text-[var(--green)]">오늘 바로 할 일</p>
              <p className="mt-1 text-sm font-bold text-[var(--ink)]">{freeReport.todayAction}</p>
            </div>

            <div className="mt-4 grid gap-2">
              {freeReport.previewCards.map(card => (
                <div key={card.title} className="panel-flat p-3">
                  <p className="text-sm font-black">{card.title}</p>
                  <p className="muted-copy mt-1">{card.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3">
              <p className="text-xs font-black text-[var(--ink)]">아직 남은 질문</p>
              <p className="muted-copy mt-1">{desireCopy.freeTeaser}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => router.push('/archive')} className="btn-secondary">
                보관함 보기
              </button>
              <button
                type="button"
                onClick={() => {
                  trackEvent('ask_opened', {
                    report_id: reportId,
                    entry_point: 'free_report_bundle_cta',
                  });
                  router.push(askHref);
                }}
                className="btn-secondary"
              >
                1회 무료로 묻기
              </button>
            </div>
            <button
              type="button"
              onClick={handleFirstReadingUnlock}
              disabled={firstReadingLoading}
              className="btn-primary mt-5 w-full"
            >
              {firstReadingLoading
                ? '세 관점을 보고 있어요'
                : desireCopy.firstReadingCta}
            </button>
            <p className="muted-copy mt-2 text-center">{desireCopy.firstReadingSubcopy}</p>
            {intent === 'first_reading' && (
              <p className="muted-copy mt-3 text-center">먼저 오늘 흐름을 보여드리고, 이어서 세 관점의 이유를 열어요.</p>
            )}
          </section>
        )}

        {report && (
          <>
            <section className="panel-strong p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="section-label">세 관점 보기</p>
                  <h2 className="mt-1 text-[28px] font-black leading-tight">{decisionContext?.headline ?? report.headline}</h2>
                </div>
                <span className={`consensus-badge ${consensusLevel}`}>
                  {CONSENSUS_LABEL[consensusLevel] ?? '합의'}
                </span>
              </div>
              <p className="body-copy mt-4">{report.summary}</p>
              <DecisionSummaryPanel decisionContext={decisionContext} compact />
              <TrinitySignalPanel report={report} />
              <p className="body-copy mt-4">
                {concernCopy.label}을 결론으로 밀지 않고, 사주·자미·점성이 겹치는 부분과 다르게 보는 부분을 나눠 볼게요.
              </p>
              <SamsinVoicePanel voices={buildCharacterVoicesFromTrinity(trinityAnalysis) ?? legacyReport?.characterVoices} compact />

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
                  <p className="text-lg font-black text-[var(--green)]">{oraclePayload?.evidenceCards.length ?? 0}</p>
                  <p className="mt-1 text-[10px] font-bold text-[var(--muted)]">신호</p>
                </div>
                <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
                  <p className="text-lg font-black text-[var(--blue)]">{evidenceCount}</p>
                  <p className="mt-1 text-[10px] font-bold text-[var(--muted)]">근거</p>
                </div>
                <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
                  <p className="text-lg font-black text-[var(--gold)]">{oraclePayload?.audit?.passed ? '확인' : '대기'}</p>
                  <p className="mt-1 text-[10px] font-bold text-[var(--muted)]">검토</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-[var(--green-soft)] p-3">
                <p className="section-label text-[var(--green)]">오늘 기억할 말</p>
                <p className="mt-1 text-lg font-black text-[var(--green)]">{report.actionPlan.now[0] ?? report.mainStrategy}</p>
              </div>
              {unknownTime && (
                <p className="mt-3 rounded-lg bg-[var(--gold-soft)] px-3 py-2 text-xs font-bold text-[#775514]">
                  출생시간을 몰라서 시간에 민감한 내용은 더 조심스럽게 봤어요.
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    trackEvent('ask_opened', {
                      report_id: reportId,
                      entry_point: 'report_primary_cta',
                    });
                    router.push(askHref);
                  }}
                  className="btn-secondary"
                >
                  {desireCopy.paidAskCta}
                </button>
                <button
                  type="button"
                  onClick={() => deepBundleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="btn-primary"
                >
                  {desireCopy.paidDeepCta}
                </button>
              </div>
            </section>

            <NativeLensPanel analysis={trinityAnalysis} />
            <EvidencePanel payload={oraclePayload} title="이렇게 봤어요" />

            <WuxingMini wuxing={meta?.wuxing} />
            {legacyReportBlocked && (
              <section className="panel p-4">
                <p className="section-label">보조 흐름</p>
                <p className="muted-copy mt-1">일부 보조 흐름표는 근거 검토를 통과하지 못해 이번 화면에서는 숨겼어요.</p>
              </section>
            )}
            <ScoreSection title="금전 흐름" graph={legacyReport?.moneyGraph} activeLabel={currentLabel(legacyReport?.moneyGraph, age)} />
            <ScoreSection title="직업 흐름" graph={legacyReport?.careerGraph} activeLabel={currentLabel(legacyReport?.careerGraph, age)} />
            <MomentList title="힘이 모이는 시기" items={legacyReport?.peakMoments} />
            <MomentList title="속도 조절 시기" items={legacyReport?.hardMoments} />
            <EvidencePanel payload={legacyOraclePayload} title="보조 흐름의 이유" />

            <section ref={deepBundleRef} className="panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="section-label">깊게 보기</p>
                  <h3 className="mt-1 text-base font-black">주의할 패턴과 다음 30일 기준</h3>
                  <p className="muted-copy mt-1">주의할 패턴과 다음 30일 기준까지 더 자세히 봅니다.</p>
                </div>
                <span className="chip chip-gold">{DEEP_BUNDLE_COST}쿠키</span>
              </div>
              <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3">
                <p className="text-xs font-black text-[var(--ink)]">깊게 보기에 포함</p>
                <p className="muted-copy mt-1">청운·태을·루나 세부 이유 + 반론 + 다음 30일 기준 + 마지막 정리</p>
              </div>
              {!deepBundleUnlocked && (
                <button
                  type="button"
                  onClick={handleDeepBundleUnlockOnly}
                  className="btn-primary mt-4 w-full"
                >
                  {DEEP_BUNDLE_COST}쿠키({formatCookieValue(DEEP_BUNDLE_COST)})로 깊게 보기
                </button>
              )}
              <div className="mt-4 space-y-3">
                {SYSTEMS.map(system => (
                  <article key={system.key} className="panel-flat p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <SamsinAvatar character={system} size="sm" />
                        <div>
                          <p className="text-sm font-black" style={{ color: system.color }}>{system.deepLabel}</p>
                          <p className="muted-copy">{system.signature} · {system.archetype}</p>
                        </div>
                      </div>
                      {!deepData[system.key] && (
                        deepBundleUnlocked ? (
                          <button
                            type="button"
                            onClick={() => handleDeepUnlock(system.key)}
                            className="btn-secondary !min-h-9 !px-3 !text-xs"
                            disabled={deepLoading[system.key]}
                          >
                            {deepLoading[system.key] ? '보고 있어요' : `${system.name}에게 더 보기`}
                          </button>
                        ) : (
                          <span className="chip">깊게 보기에 포함</span>
                        )
                      )}
                    </div>
                    {!deepData[system.key] && (
                      <p className="muted-copy mt-3">{system.intro}</p>
                    )}
                    {deepData[system.key] && (
                      <div className="mt-4 space-y-3">
                        {deepData[system.key].map(section => (
                          <div key={section.title} className="border-t border-[var(--line)] pt-3 first:border-t-0 first:pt-0">
                            <p className="text-sm font-black">{section.title}</p>
                            <p className="mt-1 text-sm leading-relaxed text-[var(--ink-soft)]">{section.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className="panel-strong p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="section-label">마지막 정리</p>
                  <h3 className="title-tight mt-1">세 관점으로 한 번 더 정리해요</h3>
                </div>
                <span className={`consensus-badge ${consensusLevel}`}>
                  {CONSENSUS_LABEL[consensusLevel] ?? '합의'}
                </span>
              </div>

              {!finalSynthesis ? (
                <button
                  type="button"
                  onClick={handleFinalSynthesis}
                  disabled={finalLoading}
                  className="btn-primary mt-5 w-full"
                >
                  {finalLoading ? '마지막 정리 중' : deepBundleUnlocked ? '마지막 정리 보기' : `${DEEP_BUNDLE_COST}쿠키로 깊게 보기 열기`}
                </button>
              ) : (
                <div className="mt-5 space-y-4">
                  <DecisionSummaryPanel decisionContext={finalDecisionContext ?? decisionContext} compact />
                  <div className="rounded-lg bg-[var(--surface-2)] p-4">
                    <p className="section-label">한 줄 정리</p>
                    <p className="body-copy mt-2">{finalSynthesis.verdict}</p>
                  </div>
                  <EvidencePanel payload={finalOraclePayload} title="마지막 정리의 이유" />
                  <div className="grid gap-3">
                    {finalSynthesis.pillars.map(item => (
                      <div key={item.title} className="panel-flat p-4">
                        <p className="text-sm font-black">{item.title}</p>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{item.body}</p>
                      </div>
                    ))}
                  </div>
                  <div className="panel-flat p-4">
                    <p className="section-label">지금 해볼 것</p>
                    <p className="body-copy mt-2">{finalSynthesis.nowAdvice}</p>
                  </div>
                  {finalSynthesis.prescription && <PrescriptionCard prescription={finalSynthesis.prescription} />}
                  <div className="rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] p-5 text-center">
                    <p className="section-label">마무리 문장</p>
                    <p className="mt-2 text-2xl font-black">{finalSynthesis.seal}</p>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        <SafetyNotice />

        {error && report && (
          <p className="rounded-lg bg-[var(--red-soft)] px-3 py-2 text-xs font-bold text-[var(--red)]">{error}</p>
        )}
      </div>

      <BottomNav
        active="report"
        reportHref={reportUrl}
        askHref={askHref}
        askDisabled={!freeReport}
      />

      {showShop && <CookieShopModal onClose={closeShop} context={shopContext} onBought={handleShopBought} />}
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportContent />
    </Suspense>
  );
}
