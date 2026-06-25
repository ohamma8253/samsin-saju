'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import SafetyNotice from '@/components/SafetyNotice';
import SamsinCharacterCard, { SamsinAvatar } from '@/components/SamsinCharacterCard';
import { trackEvent } from '@/lib/analytics';
import { CONCERN_OPTIONS, type ConcernKey } from '@/lib/concerns';
import { buildReportHrefFromProfile, readLocalSamsinProfile, type LocalSamsinProfile } from '@/lib/local-profile';
import { FIRST_READING_COST, formatCookieValue } from '@/lib/pricing';
import { buildAskHref, readReportContextSnapshots } from '@/lib/report-context';
import { SAMSIN_CHARACTER_LIST } from '@/lib/samsin-characters';

const PRIMARY_CONCERNS = CONCERN_OPTIONS.slice(0, 6);

function todayLabel(date = new Date()) {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`;
}

export default function HomePage() {
  const router = useRouter();
  const [selectedConcern, setSelectedConcern] = useState<ConcernKey>('money_leak');
  const [savedProfile, setSavedProfile] = useState<LocalSamsinProfile | null>(null);
  const [latestReportHref, setLatestReportHref] = useState<string | undefined>();
  const [latestAskHref, setLatestAskHref] = useState<string | undefined>();
  const today = useMemo(() => todayLabel(), []);
  const selectedLabel = CONCERN_OPTIONS.find(option => option.key === selectedConcern)?.label ?? '오늘 걸리는 일';
  const hasSavedProfile = Boolean(savedProfile);

  useEffect(() => {
    trackEvent('home_first_cta_viewed', {
      default_concern: 'money_leak',
    });
  }, []);

  useEffect(() => {
    const syncSavedState = () => {
      const profile = readLocalSamsinProfile();
      const latestContext = readReportContextSnapshots()[0];
      setSavedProfile(profile);
      setLatestReportHref(latestContext?.reportUrl);
      setLatestAskHref(latestContext ? buildAskHref(latestContext.reportId) : undefined);
      if (profile?.concern) setSelectedConcern(profile.concern);
    };

    syncSavedState();
    window.addEventListener('samsin-local-profile-change', syncSavedState);
    window.addEventListener('samsin-report-context-change', syncSavedState);
    window.addEventListener('samsin-archive-change', syncSavedState);
    return () => {
      window.removeEventListener('samsin-local-profile-change', syncSavedState);
      window.removeEventListener('samsin-report-context-change', syncSavedState);
      window.removeEventListener('samsin-archive-change', syncSavedState);
    };
  }, []);

  const selectConcern = (concern: ConcernKey) => {
    setSelectedConcern(concern);
    trackEvent('concern_selected', {
      concern,
      surface: 'home',
    });
  };

  const startConcern = () => {
    trackEvent('concern_selected', {
      concern: selectedConcern,
      surface: 'home_cta',
    });
    if (savedProfile) {
      router.push(buildReportHrefFromProfile(savedProfile, selectedConcern));
      return;
    }
    router.push(`/start?concern=${encodeURIComponent(selectedConcern)}`);
  };

  const openSavedToday = () => {
    if (!savedProfile) {
      startConcern();
      return;
    }
    trackEvent('concern_selected', {
      concern: selectedConcern,
      surface: 'home_saved_profile',
    });
    router.push(buildReportHrefFromProfile(savedProfile, selectedConcern));
  };

  return (
    <main className="min-h-screen pb-24">
      <div className="mobile-shell space-y-4">
        <header className="brand-header">
          <div>
            <p className="section-label">Samsin Saju</p>
            <h1 className="brand-wordmark">삼신사주</h1>
            <p className="brand-tagline">돈과 일의 불안을 세 관점으로 번역합니다</p>
          </div>
          <span className="chip chip-gold">첫 리포트 {formatCookieValue(FIRST_READING_COST)}</span>
        </header>

        <section className="hero-panel">
          <div className="hero-band">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-[var(--ink)]">{today}</p>
              <span className="chip chip-green">오늘 기준부터</span>
            </div>
            <div className="hero-character-strip mt-3">
              {SAMSIN_CHARACTER_LIST.map(character => (
                <div key={character.key} className="hero-character-pill">
                  <SamsinAvatar character={character} size="md" />
                  <p className="mt-2 text-xs font-black" style={{ color: character.color }}>
                    {character.name}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-[var(--muted)]">{character.archetype}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5">
            <p className="section-label">오늘의 삼신 회의</p>
            <h2 className="mt-2 text-[32px] font-black leading-tight">
              오늘 뭐가 제일
              <br />
              마음에 걸려요?
            </h2>
            <p className="body-copy mt-4">
              청운은 돈의 기준을, 태을은 일의 자리를, 루나는 지금의 압박과 리듬을 봐요.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {PRIMARY_CONCERNS.map(option => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => selectConcern(option.key)}
                  className={`concern-card ${selectedConcern === option.key ? 'concern-card-active' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3">
              <p className="text-xs font-black text-[var(--green)]">고른 고민</p>
              <p className="mt-1 text-lg font-black text-[var(--ink)]">{selectedLabel}</p>
              <p className="muted-copy mt-1">
                다음 화면에서 세 신이 이 고민을 어떻게 나눠 볼지 먼저 말하고, 그 다음 생년월일을 입력해요.
              </p>
            </div>

            <button type="button" onClick={hasSavedProfile ? openSavedToday : startConcern} className="btn-primary mt-4 w-full">
              오늘 걸리는 것 고르기
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <div className="px-1">
            <p className="section-label">세 관점</p>
            <h2 className="title-tight mt-1">같은 고민도 맡는 역할이 달라요</h2>
          </div>
          <div className="samsin-character-rail" aria-label="삼신 세 관점 캐릭터">
            {SAMSIN_CHARACTER_LIST.map(character => (
              <article key={character.key} className={`samsin-rail-card samsin-rail-card-${character.key}`}>
                <div className="samsin-rail-portrait-shell" aria-hidden="true">
                  <span className="samsin-rail-aura" />
                  <SamsinAvatar character={character} size="md" className="samsin-rail-portrait" />
                </div>
                <div className="min-w-0">
                  <p className="samsin-rail-name">{character.name}</p>
                  <p className="samsin-rail-role">{character.archetype.replace('의 신', '')}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          {SAMSIN_CHARACTER_LIST.map(character => (
            <SamsinCharacterCard key={character.key} character={character}>
              <div className="flex flex-wrap gap-2">
                <span className="chip">{character.method}</span>
                <span className="chip">{character.visualCue}</span>
              </div>
              <p className="muted-copy mt-3">{character.lens}</p>
            </SamsinCharacterCard>
          ))}
        </section>

        <SafetyNotice />
      </div>

      <BottomNav active="today" reportHref={latestReportHref} askHref={latestAskHref} />
    </main>
  );
}
