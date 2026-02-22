'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StarsBg from '@/components/StarsBg';
import CookieBar from '@/components/CookieBar';
import CookieShopModal from '@/components/CookieShopModal';
import { decodeInvite } from '@/lib/invite';
import { getCookieCount, deductCookies } from '@/lib/cookies';

const LIGHT_COST = 8;
const DEEP_COST  = 7; // 라이트 이후 추가

interface LightReport {
  gijil:        { headline: string; body: string };
  sothrough:    { headline: string; body: string };
  strength:     { headline: string; body: string };
  samsinMessage: string;
}

interface DeepReport {
  emotion:    { headline: string; body: string };
  longterm:   { headline: string; body: string };
  sokgungham: { headline: string; body: string };
  bestTime:   string;
}

interface CompatResult {
  ohaengRelation: string;
  summary:        string;
  light:          LightReport;
  deep?:          DeepReport;
}

const CHAR_EMOJIS = ['🌿', '☁️', '✦'];

function CompatibilityContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const a   = searchParams.get('a')   ?? '';
  const b   = searchParams.get('b')   ?? '';
  const rel = (searchParams.get('rel') ?? 'romantic') as 'friend' | 'romantic';

  const personA = decodeInvite(a);
  const personB = decodeInvite(b);

  const [phase,     setPhase]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result,    setResult]    = useState<CompatResult | null>(null);
  const [deepPhase, setDeepPhase] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [deepData,  setDeepData]  = useState<DeepReport | null>(null);
  const [showShop,  setShowShop]  = useState(false);
  const [visible,   setVisible]   = useState(0);

  // 섹션 순차 등장
  useEffect(() => {
    if (phase !== 'done') return;
    const timer = setInterval(() => {
      setVisible(prev => { if (prev < 6) return prev + 1; clearInterval(timer); return prev; });
    }, 350);
    return () => clearInterval(timer);
  }, [phase]);

  if (!personA || !personB) {
    return (
      <main className="relative min-h-screen flex items-center justify-center px-4">
        <StarsBg />
        <div className="relative z-10 text-center space-y-4">
          <p style={{ color: 'var(--text-muted)' }}>잘못된 접근입니다.</p>
          <button onClick={() => router.push('/')} className="text-sm underline" style={{ color: 'var(--gold)' }}>홈으로</button>
        </div>
      </main>
    );
  }

  const handleFetchLight = async () => {
    if (getCookieCount() < LIGHT_COST) { setShowShop(true); return; }
    const ok = deductCookies(LIGHT_COST);
    if (!ok) { setShowShop(true); return; }

    setPhase('loading');
    try {
      const res = await fetch('/api/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personA, personB, relationship: rel, includeDeep: false }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.report);
      setPhase('done');
    } catch {
      setPhase('error');
      const { addCookies } = await import('@/lib/cookies');
      addCookies(LIGHT_COST);
    }
  };

  const handleFetchDeep = async () => {
    if (getCookieCount() < DEEP_COST) { setShowShop(true); return; }
    const ok = deductCookies(DEEP_COST);
    if (!ok) { setShowShop(true); return; }

    setDeepPhase('loading');
    try {
      const res = await fetch('/api/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personA, personB, relationship: rel, includeDeep: true }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDeepData(data.report.deep ?? null);
      setDeepPhase('done');
    } catch {
      setDeepPhase('error');
      const { addCookies } = await import('@/lib/cookies');
      addCookies(DEEP_COST);
    }
  };

  return (
    <>
      <CookieBar onShopClick={() => setShowShop(true)} />

      <main className="relative min-h-screen px-4 pt-14 pb-20">
        <StarsBg />

        <div className="relative z-10 max-w-lg mx-auto space-y-6">

          {/* 헤더 */}
          <div className="text-center space-y-3 animate-fade-up">
            <div className="flex justify-center gap-2 text-2xl">
              {CHAR_EMOJIS.map((e, i) => <span key={i}>{e}</span>)}
            </div>
            <h1 className="text-xl font-bold gold-gradient">
              {rel === 'romantic' ? '연인 궁합' : '친구 궁합'}
            </h1>
          </div>

          {/* 두 사람 */}
          <div className="grid grid-cols-2 gap-3">
            {[personA, personB].map((p, i) => (
              <div key={i} className="card-dark p-4 text-center space-y-1">
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {p.year}.{p.month}.{p.day}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {p.gender === 'M' ? '남' : '여'}
                </p>
              </div>
            ))}
          </div>

          {/* 시작 전 */}
          {phase === 'idle' && (
            <div className="card-dark p-6 text-center space-y-4 animate-fade-up">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                세 신이 두 사람의 인연을 읽어드립니다
              </p>
              <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                <p>🍪 {LIGHT_COST}개 — 기질·소통·강점 궁합</p>
                {rel === 'romantic' && <p>🍪 +{DEEP_COST}개 — 감정·미래·속궁합 심층 분석</p>}
              </div>
              <button onClick={handleFetchLight}
                className="w-full py-4 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #b8933e, #e8c97a, #b8933e)', color: '#06060f' }}>
                🍪 {LIGHT_COST}개로 궁합 보기
              </button>
            </div>
          )}

          {/* 로딩 */}
          {phase === 'loading' && (
            <div className="text-center py-16 space-y-4">
              <div className="w-10 h-10 rounded-full border-2 mx-auto animate-spin"
                style={{ borderColor: 'rgba(201,168,76,0.3)', borderTopColor: '#c9a84c' }} />
              <p className="text-sm" style={{ color: 'var(--gold)' }}>두 사람의 인연을 읽는 중...</p>
            </div>
          )}

          {/* 에러 */}
          {phase === 'error' && (
            <div className="card-dark p-5 text-center space-y-3">
              <p className="text-sm text-red-400">오류가 발생했습니다. 다시 시도해주세요.</p>
              <button onClick={handleFetchLight} className="text-xs underline" style={{ color: 'var(--gold)' }}>
                재시도
              </button>
            </div>
          )}

          {/* 결과 */}
          {phase === 'done' && result && (
            <div className="space-y-4">

              {/* 총평 */}
              {visible >= 1 && (
                <div className="card-dark p-5 text-center animate-fade-up" style={{
                  animationFillMode: 'forwards',
                  borderColor: 'rgba(201,168,76,0.35)',
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.06), rgba(13,13,26,1))',
                }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{result.ohaengRelation}</p>
                  <p className="text-xl font-bold gold-gradient">&ldquo;{result.summary}&rdquo;</p>
                </div>
              )}

              {/* 라이트 섹션들 */}
              {([
                { icon: '🌱', title: '기질 궁합',   data: result.light.gijil },
                { icon: '💬', title: '소통 궁합',   data: result.light.sothrough },
                { icon: '✨', title: '이 관계의 강점', data: result.light.strength },
              ] as const).map((s, i) =>
                visible >= i + 2 ? (
                  <div key={s.title} className="card-dark p-5 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span>{s.icon}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.title}</span>
                    </div>
                    <p className="text-base font-semibold mb-2" style={{ color: 'var(--gold)' }}>{s.data.headline}</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--silver)' }}>{s.data.body}</p>
                  </div>
                ) : null
              )}

              {/* 세 신 메시지 */}
              {visible >= 5 && (
                <div className="card-dark p-5 text-center animate-fade-up" style={{
                  animationFillMode: 'forwards',
                  borderColor: 'rgba(201,168,76,0.3)',
                }}>
                  <div className="flex justify-center gap-2 mb-2 text-base">
                    {CHAR_EMOJIS.map((e, i) => <span key={i}>{e}</span>)}
                  </div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>세 신이 전하는 한 마디</p>
                  <p className="text-base font-bold gold-gradient">&ldquo;{result.light.samsinMessage}&rdquo;</p>
                </div>
              )}

              {/* 심층 궁합 (연인만) */}
              {visible >= 6 && rel === 'romantic' && (
                <div className="space-y-3 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
                  <p className="text-xs text-center tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    ── 심층 궁합 ──
                  </p>

                  {deepPhase === 'idle' && (
                    <div className="card-dark p-5 text-center space-y-3"
                      style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        감정의 흐름, 미래, 그리고 속궁합까지 세 신이 더 깊이 읽어드립니다
                      </p>
                      <button onClick={handleFetchDeep}
                        className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                        style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c' }}>
                        🍪 {DEEP_COST}개로 심층 궁합 보기
                      </button>
                    </div>
                  )}

                  {deepPhase === 'loading' && (
                    <div className="card-dark p-6 text-center space-y-3">
                      <div className="w-8 h-8 rounded-full border-2 mx-auto animate-spin"
                        style={{ borderColor: 'rgba(201,168,76,0.3)', borderTopColor: '#c9a84c' }} />
                      <p className="text-xs" style={{ color: 'var(--gold)' }}>깊은 인연을 읽는 중...</p>
                    </div>
                  )}

                  {deepPhase === 'done' && deepData && (
                    <div className="space-y-4">
                      {([
                        { icon: '💗', title: '감정의 결',      data: deepData.emotion },
                        { icon: '🔮', title: '함께하는 미래',   data: deepData.longterm },
                        { icon: '🌙', title: '속궁합',          data: deepData.sokgungham },
                      ] as const).map(s => (
                        <div key={s.title} className="card-dark p-5 animate-fade-up"
                          style={{ animationFillMode: 'forwards', borderColor: 'rgba(201,168,76,0.2)' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <span>{s.icon}</span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.title}</span>
                          </div>
                          <p className="text-base font-semibold mb-2" style={{ color: 'var(--gold)' }}>{s.data.headline}</p>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--silver)' }}>{s.data.body}</p>
                        </div>
                      ))}

                      <div className="card-dark p-4 text-center"
                        style={{ borderColor: 'rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.04)' }}>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>두 사람에게 가장 좋은 시기</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>{deepData.bestTime}</p>
                      </div>
                    </div>
                  )}

                  {deepPhase === 'error' && (
                    <div className="card-dark p-4 text-center space-y-2">
                      <p className="text-xs text-red-400">오류가 발생했습니다.</p>
                      <button onClick={handleFetchDeep} className="text-xs underline" style={{ color: 'var(--gold)' }}>재시도</button>
                    </div>
                  )}
                </div>
              )}

              {/* 다시 하기 */}
              {visible >= 6 && (
                <button onClick={() => router.push('/')}
                  className="w-full py-3 rounded-xl text-xs transition-all hover:opacity-60"
                  style={{ color: 'var(--text-muted)' }}>
                  ← 내 사주 보기
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {showShop && <CookieShopModal onClose={() => setShowShop(false)} />}
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
