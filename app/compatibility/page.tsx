'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import CookieBar from '@/components/CookieBar';
import CookieShopModal, { type CookieShopContext } from '@/components/CookieShopModal';
import SafetyNotice from '@/components/SafetyNotice';
import { trackEvent } from '@/lib/analytics';
import { upsertArchiveItem } from '@/lib/archive';
import { CITIES, DEFAULT_CITY } from '@/lib/cities';
import { addCookies, clearUnlocked, deductCookies, getCookieCount, isUnlocked, setUnlocked } from '@/lib/cookies';
import { buildCompatibilityId, buildEntitlementKey } from '@/lib/entitlements';
import { decodeInvite, encodeInvite } from '@/lib/invite';
import { COMPATIBILITY_COST, formatCookieValue } from '@/lib/pricing';
import type { SamsinInput } from '@/lib/saju';

interface LightReport {
  gijil: { headline: string; body: string };
  sothrough: { headline: string; body: string };
  strength: { headline: string; body: string };
  samsinMessage: string;
}

interface DeepReport {
  emotion: { headline: string; body: string };
  longterm: { headline: string; body: string };
  sokgungham: { headline: string; body: string };
  bestTime: string;
}

interface CompatResult {
  ohaengRelation: string;
  summary: string;
  light: LightReport;
  deep?: DeepReport;
}

const lightSections = [
  ['gijil', '기질 합의'],
  ['sothrough', '대화 방식'],
  ['strength', '관계 강점'],
] as const;

const HOURS = [
  { label: '시간 모름', value: '-1' },
  { label: '자시 23~01', value: '0' },
  { label: '축시 01~03', value: '2' },
  { label: '인시 03~05', value: '4' },
  { label: '묘시 05~07', value: '6' },
  { label: '진시 07~09', value: '8' },
  { label: '사시 09~11', value: '10' },
  { label: '오시 11~13', value: '12' },
  { label: '미시 13~15', value: '14' },
  { label: '신시 15~17', value: '16' },
  { label: '유시 17~19', value: '18' },
  { label: '술시 19~21', value: '20' },
  { label: '해시 21~23', value: '22' },
];

interface PersonDraft {
  name: string;
  gender: 'M' | 'F';
  year: string;
  month: string;
  day: string;
  hour: string;
  city: string;
}

function emptyPersonDraft(gender: 'M' | 'F'): PersonDraft {
  return {
    name: '',
    gender,
    year: '',
    month: '1',
    day: '',
    hour: '-1',
    city: DEFAULT_CITY,
  };
}

function isValidBirthDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1920 || year > 2010 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(year, month, 0).getDate();
}

function draftToInput(draft: PersonDraft): SamsinInput | null {
  const year = Number(draft.year);
  const month = Number(draft.month);
  const day = Number(draft.day);
  const hour = Number(draft.hour);
  if (!draft.name.trim() || !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (!isValidBirthDate(year, month, day)) return null;
  const unknownTime = hour < 0;
  return {
    name: draft.name.trim(),
    gender: draft.gender,
    year,
    month,
    day,
    hour: unknownTime ? 12 : hour,
    minute: 0,
    city: draft.city,
    unknownTime,
    birthTimePrecision: unknownTime ? 'unknown' : 'range',
  };
}

function PersonForm({
  title,
  draft,
  onChange,
}: {
  title: string;
  draft: PersonDraft;
  onChange: (next: PersonDraft) => void;
}) {
  return (
    <section className="panel p-4">
      <p className="section-label">{title}</p>
      <div className="mt-4 space-y-4">
        <div>
          <label className="field-label">이름</label>
          <input
            value={draft.name}
            onChange={event => onChange({ ...draft, name: event.target.value })}
            maxLength={10}
            placeholder={title === '나' ? '내 이름' : '상대 이름'}
            className="field"
          />
        </div>

        <div>
          <p className="field-label">성별</p>
          <div className="segmented">
            {(['M', 'F'] as const).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...draft, gender: value })}
                className={`segment ${draft.gender === value ? 'segment-active' : ''}`}
              >
                {value === 'M' ? '남성' : '여성'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label">생년월일</p>
          <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-2">
            <input
              value={draft.year}
              onChange={event => onChange({ ...draft, year: event.target.value })}
              inputMode="numeric"
              maxLength={4}
              placeholder="년도"
              className="field text-center"
            />
            <select
              value={draft.month}
              onChange={event => onChange({ ...draft, month: event.target.value })}
              className="field text-center"
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>{index + 1}월</option>
              ))}
            </select>
            <input
              value={draft.day}
              onChange={event => onChange({ ...draft, day: event.target.value })}
              inputMode="numeric"
              maxLength={2}
              placeholder="일"
              className="field text-center"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">출생시간</label>
            <select
              value={draft.hour}
              onChange={event => onChange({ ...draft, hour: event.target.value })}
              className="field"
            >
              {HOURS.map(item => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">출생지역</label>
            <select
              value={draft.city}
              onChange={event => onChange({ ...draft, city: event.target.value })}
              className="field"
            >
              {Object.entries(CITIES).map(([key, item]) => (
                <option key={key} value={key}>{item.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

function CompatibilityContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const a = searchParams.get('a') ?? '';
  const b = searchParams.get('b') ?? '';
  const rel = (searchParams.get('rel') ?? 'romantic') as 'friend' | 'romantic';

  const personA = decodeInvite(a);
  const personB = decodeInvite(b);

  const [phase, setPhase] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<CompatResult | null>(null);
  const [deepData, setDeepData] = useState<DeepReport | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [shopContext, setShopContext] = useState<CookieShopContext | undefined>();
  const [shopAutoContinue, setShopAutoContinue] = useState(false);
  const [visible, setVisible] = useState(0);
  const [directA, setDirectA] = useState<PersonDraft>(() => emptyPersonDraft('M'));
  const [directB, setDirectB] = useState<PersonDraft>(() => emptyPersonDraft('F'));
  const [directRel, setDirectRel] = useState<'friend' | 'romantic'>('romantic');
  const [directError, setDirectError] = useState('');
  const compatibilityId = personA && personB ? buildCompatibilityId(personA, personB, rel) : '';
  const compatibilityKey = compatibilityId ? buildEntitlementKey('compatibility', compatibilityId) : '';

  const openShop = (entryPoint: string) => {
    const currentCookie = getCookieCount();
    trackEvent('shop_opened', {
      entry_point: entryPoint,
      product_id: 'compatibility',
      required_cookie: COMPATIBILITY_COST,
      current_cookie: currentCookie,
    });
    trackEvent('paywall_viewed', {
      product_id: 'compatibility',
      required_cookie: COMPATIBILITY_COST,
      current_cookie: currentCookie,
      entry_point: entryPoint,
    });
    setShopContext({ productId: 'compatibility', requiredCookie: COMPATIBILITY_COST });
    setShopAutoContinue(entryPoint === 'compatibility_cta');
    setShowShop(true);
  };

  const closeShop = () => {
    setShowShop(false);
    setShopContext(undefined);
    setShopAutoContinue(false);
  };

  useEffect(() => {
    if (phase !== 'done') return;
    const timer = setInterval(() => {
      setVisible(prev => {
        if (prev < 6) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, 220);
    return () => clearInterval(timer);
  }, [phase]);

  const hasEncodedPair = Boolean(a || b);
  if ((!personA || !personB) && hasEncodedPair) {
    return (
      <main className="min-h-screen pb-24">
        <div className="mobile-shell flex min-h-screen items-center">
          <div className="panel p-6 text-center">
            <p className="section-label">링크 오류</p>
            <h1 className="title-tight mt-2">궁합 정보를 읽지 못했어요</h1>
            <button type="button" onClick={() => router.push('/compatibility')} className="btn-primary mt-5 w-full">
              직접 입력하기
            </button>
          </div>
        </div>
        <BottomNav active="compatibility" />
      </main>
    );
  }

  if (!personA || !personB) {
    const startCompatibility = () => {
      const nextA = draftToInput(directA);
      const nextB = draftToInput(directB);
      if (!nextA || !nextB) {
        setDirectError('두 사람의 이름과 생년월일을 확인해주세요.');
        return;
      }
      trackEvent('compat_direct_started', {
        relationship: directRel,
        a_unknown_time: Boolean(nextA.unknownTime),
        b_unknown_time: Boolean(nextB.unknownTime),
      });
      const nextParams = new URLSearchParams({
        a: encodeInvite(nextA),
        b: encodeInvite(nextB),
        rel: directRel,
      });
      router.push(`/compatibility?${nextParams.toString()}`);
    };

    return (
      <main className="min-h-screen pb-24">
        <div className="mobile-shell space-y-4">
          <header className="panel-strong p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-label">궁합</p>
                <h1 className="mt-1 text-2xl font-black">두 사람의 흐름을 볼게요</h1>
                <p className="muted-copy mt-2">
                  두 사람의 기질, 소통 방식, 장기 흐름을 같은 기준으로 비교해요.
                </p>
              </div>
              <span className="chip chip-gold">{formatCookieValue(COMPATIBILITY_COST)}</span>
            </div>
          </header>

          <div className="segmented">
            {(['romantic', 'friend'] as const).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => setDirectRel(value)}
                className={`segment ${directRel === value ? 'segment-active' : ''}`}
              >
                {value === 'romantic' ? '연인·부부' : '친구·지인'}
              </button>
            ))}
          </div>

          <PersonForm title="나" draft={directA} onChange={setDirectA} />
          <PersonForm title="상대" draft={directB} onChange={setDirectB} />

          {directError && (
            <p className="rounded-lg bg-[var(--red-soft)] px-3 py-2 text-xs font-bold text-[var(--red)]">
              {directError}
            </p>
          )}

          <button type="button" onClick={startCompatibility} className="btn-primary w-full">
            궁합 보러 가기
          </button>
          <SafetyNotice />
        </div>
        <BottomNav active="compatibility" />
      </main>
    );
  }

  const handleFetchCompatibility = async () => {
    let charged = false;
    if (!isUnlocked(compatibilityKey)) {
      if (getCookieCount() < COMPATIBILITY_COST) {
        openShop('compatibility_cta');
        return;
      }
      const ok = deductCookies(COMPATIBILITY_COST);
      if (!ok) {
        openShop('compatibility_cta');
        return;
      }
      setUnlocked(compatibilityKey);
      charged = true;
    }

    setPhase('loading');
    try {
      const res = await fetch('/api/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personA, personB, relationship: rel, includeDeep: true }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.report);
      setDeepData(data.report.deep ?? null);
      upsertArchiveItem({
        id: compatibilityId,
        kind: 'compatibility',
        name: `${personA.name} · ${personB.name}`,
        headline: data.report.summary,
        summary: data.report.light?.samsinMessage ?? '두 사람의 관계 신호를 비교했습니다.',
        reportUrl: `/compatibility?${searchParams.toString()}`,
        badges: ['궁합 보기', `${COMPATIBILITY_COST}쿠키`, rel === 'romantic' ? '연인·부부' : '친구·지인'],
        firstReadingUnlocked: true,
        deepBundleUnlocked: true,
      });
      trackEvent('result_saved', {
        kind: 'compatibility',
        report_id: compatibilityId,
        charged,
      });
      setPhase('done');
    } catch {
      setPhase('error');
      if (charged) {
        addCookies(COMPATIBILITY_COST);
        clearUnlocked(compatibilityKey);
      }
    }
  };

  const handleShopBought = () => {
    if (shopAutoContinue) void handleFetchCompatibility();
    return getCookieCount();
  };

  return (
    <>
      <CookieBar onShopClick={() => openShop('compatibility_cookie_bar')} />

      <main className="mobile-shell min-h-screen pt-16 pb-24">
        <section className="space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip chip-blue">궁합</span>
              <span className="chip">{rel === 'romantic' ? '연인·부부' : '친구·지인'}</span>
              <span className="chip chip-gold">{formatCookieValue(COMPATIBILITY_COST)}</span>
            </div>
            <h1 className="display-title !text-[34px]">두 사람의 관계 신호를 비교해요</h1>
            <p className="body-copy">
              사주 기반의 기질, 대화 방식, 장기 흐름을 나눠서 보여드려요. 같은 점과 다른 점은 따로 정리해요.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[personA, personB].map((person, index) => (
              <div key={`${person.name}-${index}`} className="panel p-4">
                <p className="section-label">{index === 0 ? '나' : '상대'}</p>
                <p className="mt-2 text-lg font-black text-[var(--ink)]">{person.name}</p>
                <p className="muted-copy mt-1">
                  {person.year}.{person.month}.{person.day} · {person.gender === 'M' ? '남' : '여'}
                </p>
              </div>
            ))}
          </div>

          {phase === 'idle' && (
            <div className="panel-strong p-5">
              <p className="section-label">궁합 보기</p>
              <h2 className="title-tight mt-2">두 사람의 흐름을 한 번에 볼게요</h2>
              <div className="mt-4 grid gap-2">
                {['기질 차이', '대화 방식', '관계 강점', '오래 가는 리듬'].map(item => (
                  <div key={item} className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
                    <span className="evidence-dot" />
                    <span className="text-sm font-bold text-[var(--ink-soft)]">{item}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleFetchCompatibility} className="btn-primary mt-5 w-full">
                {COMPATIBILITY_COST}쿠키로 궁합 보기
              </button>
            </div>
          )}

          {phase === 'loading' && (
            <div className="panel p-8 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--green)]" />
              <p className="body-copy mt-4">두 사람의 관계 신호를 비교하는 중이에요.</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="panel p-5 text-center">
              <p className="font-bold text-[var(--red)]">궁합 내용을 불러오지 못했어요.</p>
              <button type="button" onClick={handleFetchCompatibility} className="btn-secondary mt-4 w-full">
                다시 시도
              </button>
            </div>
          )}

          {phase === 'done' && result && (
            <div className="space-y-4">
              {visible >= 1 && (
                <div className="panel-strong p-5">
                  <p className="section-label">{result.ohaengRelation}</p>
                  <h2 className="title-tight mt-2">{result.summary}</h2>
                </div>
              )}

              {lightSections.map(([key, title], index) => {
                const section = result.light[key];
                return visible >= index + 2 ? (
                  <div key={key} className="panel p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="section-label">{title}</p>
                      <span className="chip chip-green">근거 {index + 1}</span>
                    </div>
                    <h3 className="mt-3 text-base font-black text-[var(--ink)]">{section.headline}</h3>
                    <p className="body-copy mt-2">{section.body}</p>
                  </div>
                ) : null;
              })}

              {visible >= 5 && (
                <div className="panel p-5">
                  <p className="section-label">삼신 한마디</p>
                  <p className="mt-3 text-lg font-black leading-snug text-[var(--ink)]">{result.light.samsinMessage}</p>
                </div>
              )}

              {visible >= 6 && rel === 'romantic' && deepData && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="section-label">더 깊게 본 내용</p>
                    <span className="chip chip-blue">포함됨</span>
                  </div>
                  {([
                    ['emotion', '감정의 결'],
                    ['longterm', '장기 흐름'],
                    ['sokgungham', '친밀감 패턴'],
                  ] as const).map(([key, title]) => {
                    const section = deepData[key];
                    return (
                      <div key={key} className="panel p-5">
                        <p className="section-label">{title}</p>
                        <h3 className="mt-3 text-base font-black text-[var(--ink)]">{section.headline}</h3>
                        <p className="body-copy mt-2">{section.body}</p>
                      </div>
                    );
                  })}
                  <div className="panel-flat p-4">
                    <p className="section-label">좋은 타이밍</p>
                    <p className="mt-2 text-sm font-black text-[var(--ink)]">{deepData.bestTime}</p>
                  </div>
                </div>
              )}

              {visible >= 6 && (
                <button type="button" onClick={() => router.push('/')} className="btn-secondary w-full">
                  내 사주 보기
                </button>
              )}
              {visible >= 6 && <SafetyNotice />}
            </div>
          )}
        </section>
      </main>

      {showShop && <CookieShopModal onClose={closeShop} context={shopContext} onBought={handleShopBought} />}
      <BottomNav active="compatibility" />
    </>
  );
}

export default function CompatibilityPage() {
  return (
    <Suspense>
      <CompatibilityContent />
    </Suspense>
  );
}
