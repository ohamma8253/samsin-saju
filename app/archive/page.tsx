'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { readAnalyticsEvents } from '@/lib/analytics';
import { readArchiveItems, type ArchiveItem } from '@/lib/archive';
import { getConcernCopy, normalizeConcern } from '@/lib/concerns';
import { buildReportHrefFromProfile, readLocalSamsinProfile, type LocalSamsinProfile } from '@/lib/local-profile';

const KIND_LABEL: Record<ArchiveItem['kind'], string> = {
  free_report: '오늘의 흐름',
  first_reading: '세 관점 보기',
  deep_bundle: '깊게 보기',
  compatibility: '삼신 궁합',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

function formatConcern(value: string | undefined): string | null {
  if (!value) return null;
  return getConcernCopy(normalizeConcern(value)).label;
}

export default function ArchivePage() {
  const router = useRouter();
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [profile, setProfile] = useState<LocalSamsinProfile | null>(null);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    const sync = () => {
      setItems(readArchiveItems());
      setProfile(readLocalSamsinProfile());
      setEventCount(readAnalyticsEvents().length);
    };
    sync();
    window.addEventListener('samsin-archive-change', sync);
    window.addEventListener('samsin-analytics', sync);
    window.addEventListener('samsin-local-profile-change', sync);
    return () => {
      window.removeEventListener('samsin-archive-change', sync);
      window.removeEventListener('samsin-analytics', sync);
      window.removeEventListener('samsin-local-profile-change', sync);
    };
  }, []);

  return (
    <main className="min-h-screen pb-24">
      <div className="mobile-shell space-y-4">
        <header className="panel-strong p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-label">보관함</p>
              <h1 className="mt-1 text-2xl font-black">내 기록 보관함</h1>
            <p className="muted-copy mt-2">
                오늘의 흐름, 깊게 본 내용, 궁합 결과를 다시 볼 수 있어요.
                {profile ? ` ${profile.name}님의 사주 정보도 이 기기에 저장돼 있어요.` : ''}
              </p>
            </div>
            <span className="chip chip-blue">{items.length}개</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="section-label">저장된 기록</p>
              <p className="mt-1 text-xl font-black text-[var(--green)]">{items.length}</p>
            </div>
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="section-label">이용 기록</p>
              <p className="mt-1 text-xl font-black text-[var(--blue)]">{eventCount}</p>
            </div>
          </div>
        </header>

        {items.length === 0 ? (
          <section className="panel p-6 text-center">
            <p className="section-label">비어 있어요</p>
            <h2 className="title-tight mt-2">아직 저장된 내용이 없어요</h2>
            <p className="body-copy mt-3">
              오늘의 흐름을 보면 보관함에 자동으로 저장돼요. 깊게 본 내용도 함께 남아요.
            </p>
            {profile ? (
              <button
                type="button"
                onClick={() => router.push(buildReportHrefFromProfile(profile))}
                className="btn-primary mt-5 w-full"
              >
                저장된 사주로 오늘 운세 보기
              </button>
            ) : (
              <button type="button" onClick={() => router.push('/')} className="btn-primary mt-5 w-full">
                오늘운세 보기
              </button>
            )}
          </section>
        ) : (
          <section className="space-y-3">
            {items.map(item => (
              <article key={`${item.kind}-${item.id}`} className="panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip chip-green">{KIND_LABEL[item.kind]}</span>
                      {formatConcern(item.concern) && <span className="chip">{formatConcern(item.concern)}</span>}
                    </div>
                    <h2 className="mt-3 text-lg font-black leading-snug">{item.decisionContext?.headline ?? item.headline}</h2>
                  </div>
                  <span className="text-xs font-bold text-[var(--muted)]">{formatDate(item.updatedAt)}</span>
                </div>
                <p className="body-copy mt-3">{item.decisionContext?.mainStrategy ?? item.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.badges.map(badge => (
                    <span key={badge} className="chip">{badge}</span>
                  ))}
                </div>
                <button type="button" onClick={() => router.push(item.reportUrl)} className="btn-secondary mt-4 w-full">
                  다시 열기
                </button>
              </article>
            ))}
          </section>
        )}
      </div>

      <BottomNav active="archive" />
    </main>
  );
}
