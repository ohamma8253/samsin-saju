'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SamsinAvatar } from '@/components/SamsinCharacterCard';
import { trackEvent } from '@/lib/analytics';
import { CONCERN_OPTIONS, getConcernCopy, normalizeConcern, type ConcernKey } from '@/lib/concerns';
import { getConcernDesireCopy } from '@/lib/desire-copy';
import { SAMSIN_CHARACTER_LIST } from '@/lib/samsin-characters';

type StartStep = 'hello' | 'name' | 'nameFinished' | 'concern' | 'bridge';

function StartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawConcern = searchParams.get('concern');
  const initialConcern = normalizeConcern(rawConcern);
  const hasSelectedConcern = Boolean(rawConcern) && initialConcern !== 'general';
  const [step, setStep] = useState<StartStep>('hello');
  const [name, setName] = useState('');
  const [concernKey, setConcernKey] = useState<ConcernKey>(initialConcern);
  const copy = getConcernCopy(concernKey);
  const desireCopy = getConcernDesireCopy(concernKey);
  const birthHref = useMemo(() => {
    const params = new URLSearchParams({ concern: concernKey });
    if (name.trim()) params.set('name', name.trim());
    return `/birth?${params.toString()}`;
  }, [concernKey, name]);

  const proceedToBirth = () => {
    trackEvent('start_birth_cta_clicked', {
      concern: concernKey,
      hasName: Boolean(name.trim()),
    });
    router.push(birthHref);
  };

  const nextStep = (next: StartStep) => {
    trackEvent('start_onboarding_step', {
      from: step,
      to: next,
      concern: concernKey,
    });
    setStep(next);
  };

  const submitName = () => {
    if (!name.trim()) return;
    nextStep('nameFinished');
  };

  const chooseConcern = (nextConcern: ConcernKey) => {
    setConcernKey(nextConcern);
    trackEvent('concern_selected', {
      concern: nextConcern,
      surface: 'start',
    });
  };

  return (
    <main
      className="onboarding-modal-page"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #eef4f2 0%, #f8f5ed 52%, #f6f8fb 100%)',
        padding: 12,
      }}
    >
      <div
        className="onboarding-modal-shell"
        style={{
          display: 'grid',
          gridTemplateRows: 'auto auto',
          alignContent: 'start',
          gap: 14,
          width: 'min(100%, 430px)',
          minHeight: 'calc(100vh - 24px)',
          margin: '0 auto',
        }}
      >
        <header
          className="onboarding-modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '8px 2px 0',
          }}
        >
          <div>
            <p className="section-label">삼신사주</p>
            <h1 className="brand-wordmark">삼신과 시작하기</h1>
            <p className="brand-tagline">오늘 볼 고민을 한 가지씩 정리해요</p>
          </div>
          <button type="button" onClick={() => router.push('/')} className="chip">
            홈
          </button>
        </header>

        <section
          className="onboarding-modal-card"
          role="dialog"
          aria-modal="true"
          aria-label="삼신사주 시작"
          style={{
            alignSelf: 'start',
            width: '100%',
            maxHeight: 'calc(100vh - 98px)',
            overflowY: 'auto',
            border: '1px solid var(--line-strong)',
            borderRadius: 8,
            background: 'linear-gradient(180deg, rgba(255, 253, 248, 0.98), rgba(255, 255, 255, 0.96))',
            boxShadow: '0 24px 58px rgba(23, 32, 39, 0.16)',
            padding: 18,
          }}
        >
          <div className="samsin-chat-row">
            {SAMSIN_CHARACTER_LIST.map(character => (
              <SamsinAvatar key={character.key} character={character} size="md" />
            ))}
          </div>

          {step === 'hello' && (
            <div className="onboarding-step">
              <p className="section-label">{hasSelectedConcern ? '삼신의 응답' : '삼신 첫 인사'}</p>
              <h2>
                {hasSelectedConcern
                  ? <>{copy.label}이군요.<br />세 관점으로 나눠볼게요.</>
                  : <>안녕하세요.<br />우리는 삼신이에요.</>}
              </h2>
              <p className="body-copy">
                {hasSelectedConcern
                  ? desireCopy.startBody
                  : '청운은 현실 기준을, 태을은 일의 자리를, 루나는 마음의 리듬을 봅니다. 오늘은 먼저 어떤 고민이 걸리는지 같이 들어볼게요.'}
              </p>
              <button type="button" onClick={() => nextStep('name')} className="btn-primary w-full">
                {hasSelectedConcern ? '내 이름 입력하기' : '안녕!'}
              </button>
            </div>
          )}

          {step === 'name' && (
            <div className="onboarding-step">
              <p className="section-label">쉬운 개인화</p>
              <h2>어떻게 불러드릴까요?</h2>
              <p className="body-copy">
                본명 대신 닉네임도 괜찮아요. 결과와 보관함에서 부를 이름으로만 써요.
              </p>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitName();
                }}
                className="field"
                maxLength={10}
                placeholder="예: 민준"
                autoFocus
              />
              <button type="button" onClick={submitName} disabled={!name.trim()} className="btn-primary w-full">
                다음
              </button>
            </div>
          )}

          {step === 'nameFinished' && (
            <div className="onboarding-step">
              <p className="section-label">삼신의 응답</p>
              <h2>{name.trim()}님,<br />오늘 운세를 같이 볼게요.</h2>
              <p className="body-copy">
                아직 결론을 말하진 않을게요. 먼저 돈과 일에서 어디가 찜찜한지 하나만 골라요.
              </p>
              <button type="button" onClick={() => nextStep('concern')} className="btn-primary w-full">
                고마워!
              </button>
            </div>
          )}

          {step === 'concern' && (
            <div className="onboarding-step">
              <p className="section-label">오늘 볼 고민</p>
              <h2>지금 가장 걸리는 건<br />무엇인가요?</h2>
              <div className="grid grid-cols-2 gap-2">
                {CONCERN_OPTIONS.slice(0, 6).map(option => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => chooseConcern(option.key)}
                    className={`concern-card ${concernKey === option.key ? 'concern-card-active' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3">
                <p className="text-xs font-black text-[var(--green)]">{copy.label}</p>
                <p className="muted-copy mt-1">{desireCopy.selectedPromise}</p>
              </div>
              <button type="button" onClick={() => nextStep('bridge')} className="btn-primary w-full">
                이 고민으로 볼게요
              </button>
            </div>
          )}

          {step === 'bridge' && (
            <div className="onboarding-step">
              <p className="section-label">왜 생년월일이 필요해요</p>
              <h2>이제 내 흐름에<br />맞춰볼게요.</h2>
              <p className="body-copy">
                {desireCopy.birthReward} 사주·자미·점성은 생년월일과 시간의 민감도가 달라요.
                시간을 모르면 모름으로 시작해도 됩니다.
              </p>
              <div className="save-promise">
                <strong>입력하면 열리는 것</strong>
                <span>오늘 운세 일부 · 삼신 첫 인사 · 첫 질문 1회</span>
                <span>계정 연결과 보관 안내는 결과를 본 뒤에만 보여드릴게요.</span>
              </div>
              <button type="button" onClick={proceedToBirth} className="btn-primary w-full">
                생년월일 입력하고 무료 번들 열기
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function StartPage() {
  return (
    <Suspense>
      <StartContent />
    </Suspense>
  );
}
