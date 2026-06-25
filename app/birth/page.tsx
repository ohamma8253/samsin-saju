'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';
import { CITIES, DEFAULT_CITY } from '@/lib/cities';
import { getConcernCopy, normalizeConcern } from '@/lib/concerns';
import { getConcernDesireCopy } from '@/lib/desire-copy';
import { saveLocalSamsinProfile } from '@/lib/local-profile';

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

type BirthStep = 'name' | 'gender' | 'birthDate' | 'birthTime' | 'city' | 'confirm';

function formatGender(gender: 'M' | 'F') {
  return gender === 'M' ? '남성' : '여성';
}

function isValidBirthDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1920 || year > 2010 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(year, month, 0).getDate();
}

function BirthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedConcern = normalizeConcern(searchParams.get('concern'));
  const initialName = searchParams.get('name') ?? '';
  const [step, setStep] = useState<BirthStep>(initialName ? 'gender' : 'name');
  const [name, setName] = useState(initialName);
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('1');
  const [birthDay, setBirthDay] = useState('');
  const [hour, setHour] = useState('-1');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [city, setCity] = useState(DEFAULT_CITY);
  const [error, setError] = useState('');
  const copy = useMemo(() => getConcernCopy(selectedConcern), [selectedConcern]);
  const desireCopy = useMemo(() => getConcernDesireCopy(selectedConcern), [selectedConcern]);

  const goStep = (nextStep: BirthStep) => {
    setError('');
    trackEvent('birth_onboarding_step', {
      from: step,
      to: nextStep,
      concern: selectedConcern,
    });
    setStep(nextStep);
  };

  const validateName = () => {
    if (!name.trim()) {
      setError('삼신이 부를 이름을 입력해주세요.');
      return;
    }
    goStep('gender');
  };

  const validateBirthDate = () => {
    const year = Number(birthYear);
    const month = Number(birthMonth);
    const day = Number(birthDay);
    if (!isValidBirthDate(year, month, day)) {
      setError('생년월일을 다시 확인해주세요.');
      return;
    }
    goStep('birthTime');
  };

  const handleSubmit = () => {
    trackEvent('birth_form_submit', {
      intent: 'free',
      concern: selectedConcern,
      city,
      hasBirthDate: Boolean(birthYear && birthMonth && birthDay),
      hasName: Boolean(name.trim()),
    });

    const year = Number(birthYear);
    const month = Number(birthMonth);
    const day = Number(birthDay);
    const hourNum = Number(hour);
    if (!isValidBirthDate(year, month, day)) {
      setStep('birthDate');
      setError('생년월일을 다시 확인해주세요.');
      return;
    }
    const unknownTime = hourNum < 0;
    saveLocalSamsinProfile({
      name: name.trim(),
      year: String(year),
      month: String(month),
      day: String(day),
      hour: unknownTime ? '12' : String(hourNum),
      minute: '0',
      gender,
      city,
      unknownTime: unknownTime ? '1' : '0',
      birthTimePrecision: unknownTime ? 'unknown' : 'range',
      concern: selectedConcern,
    });
    trackEvent('local_profile_saved', {
      concern: selectedConcern,
      unknown_time: unknownTime,
    });
    const params = new URLSearchParams({
      name: name.trim(),
      year: String(year),
      month: String(month),
      day: String(day),
      hour: unknownTime ? '12' : String(hourNum),
      minute: '0',
      gender,
      city,
      unknownTime: unknownTime ? '1' : '0',
      birthTimePrecision: unknownTime ? 'unknown' : 'range',
      intent: 'free',
      concern: selectedConcern,
    });
    router.push(`/report?${params.toString()}`);
  };

  const birthSummary = `${birthYear || '----'}년 ${birthMonth || '-'}월 ${birthDay || '-'}일`;
  const timeSummary = hour === '-1' ? '출생시간 모름' : HOURS.find(item => item.value === hour)?.label ?? '출생시간 선택';
  const cityName = CITIES[city]?.name ?? CITIES[DEFAULT_CITY].name;

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
            <p className="section-label">내 사주 등록</p>
            <h1 className="brand-wordmark">한 가지씩만 물어볼게요</h1>
            <p className="brand-tagline">{copy.label} · 무료 번들 준비</p>
          </div>
          <button type="button" onClick={() => router.push(`/start?concern=${selectedConcern}`)} className="chip">
            이전
          </button>
        </header>

        <section
          className="onboarding-modal-card"
          role="dialog"
          aria-modal="true"
          aria-label="사주 정보 입력"
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
          <div className="birth-progress" aria-label="입력 진행 단계">
            {(['name', 'gender', 'birthDate', 'birthTime', 'city', 'confirm'] as BirthStep[]).map((item, index) => (
              <span key={item} className={item === step ? 'birth-progress-dot birth-progress-active' : 'birth-progress-dot'}>
                {index + 1}
              </span>
            ))}
          </div>

          {step === 'name' && (
            <div className="onboarding-step">
              <p className="section-label">이름</p>
              <h2>삼신이 어떻게<br />불러드릴까요?</h2>
              <p className="body-copy">
                본명 대신 닉네임도 괜찮아요. 결과와 보관함에서 부르는 이름으로만 써요.
              </p>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') validateName();
                }}
                className="field"
                maxLength={10}
                placeholder="예: 민준"
                autoFocus
              />
              <button type="button" onClick={validateName} className="btn-primary w-full">
                다음
              </button>
            </div>
          )}

          {step === 'gender' && (
            <div className="onboarding-step">
              <p className="section-label">성별</p>
              <h2>{name.trim()}님,<br />성별을 알려주세요.</h2>
              <p className="body-copy">
                삼신 계산에서 기준이 되는 입력이에요. 이 값은 결과 보정에만 사용합니다.
              </p>
              <div className="segmented segmented-large">
                {(['M', 'F'] as const).map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGender(value)}
                    className={`segment ${gender === value ? 'segment-active' : ''}`}
                  >
                    {formatGender(value)}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => goStep('birthDate')} className="btn-primary w-full">
                다음
              </button>
            </div>
          )}

          {step === 'birthDate' && (
            <div className="onboarding-step">
              <p className="section-label">생년월일</p>
              <h2>태어난 날을<br />알려주세요.</h2>
              <p className="body-copy">
                한 번 입력한 생년월일을 사주는 일간과 월지로, 자미는 명궁과 궁위로, 점성은 행성 위치로 각각 다르게 읽어요.
              </p>
              <div className="grid grid-cols-[1.45fr_1fr_1fr] gap-2">
                <input
                  aria-label="출생년도"
                  value={birthYear}
                  onChange={(event) => setBirthYear(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="년도"
                  className="field text-center"
                />
                <select
                  aria-label="출생월"
                  value={birthMonth}
                  onChange={(event) => setBirthMonth(event.target.value)}
                  className="field text-center"
                >
                  {Array.from({ length: 12 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>{index + 1}월</option>
                  ))}
                </select>
                <input
                  aria-label="출생일"
                  value={birthDay}
                  onChange={(event) => setBirthDay(event.target.value.replace(/\D/g, '').slice(0, 2))}
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="일"
                  className="field text-center"
                />
              </div>
              <button type="button" onClick={validateBirthDate} className="btn-primary w-full">
                다음
              </button>
            </div>
          )}

          {step === 'birthTime' && (
            <div className="onboarding-step">
              <p className="section-label">출생시간</p>
              <h2>태어난 시간을<br />알고 있나요?</h2>
              <p className="body-copy">
                시간을 알면 세부 자리가 선명해지고, 몰라도 괜찮아요. 시간 민감도가 큰 내용은 더 조심스럽게 표시합니다.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <select
                  aria-label="출생시간"
                  value={hour}
                  onChange={(event) => setHour(event.target.value)}
                  className="field"
                >
                  {HOURS.map(item => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={() => goStep('city')} className="btn-primary w-full">
                다음
              </button>
            </div>
          )}

          {step === 'city' && (
            <div className="onboarding-step">
              <p className="section-label">출생지역</p>
              <h2>태어난 지역은<br />어디인가요?</h2>
              <p className="body-copy">
                점성은 지역에 따라 하우스가 달라질 수 있어요. 사주·자미와 함께 맞춰 보기 위한 값이라, 모르면 가장 가까운 도시로 시작하세요.
              </p>
              <select
                aria-label="출생지역"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="field"
              >
                {Object.entries(CITIES).map(([key, item]) => (
                  <option key={key} value={key}>{item.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => goStep('confirm')} className="btn-primary w-full">
                다음
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="onboarding-step">
              <p className="section-label">마지막 확인</p>
              <h2>이 정보로<br />삼신 회의를 열까요?</h2>
              <div className="confirm-list">
                <div>
                  <span>이름</span>
                  <strong>{name.trim()}</strong>
                </div>
                <div>
                  <span>성별</span>
                  <strong>{formatGender(gender)}</strong>
                </div>
                <div>
                  <span>생년월일</span>
                  <strong>{birthSummary}</strong>
                </div>
                <div>
                  <span>시간/지역</span>
                  <strong>{timeSummary} · {cityName}</strong>
                </div>
              </div>
              <div className="save-promise">
                <strong>무료 번들</strong>
                <span>{desireCopy.birthReward} 리포트가 열린 뒤, 다시 볼 수 있게 이 기기에 보관해둘게요.</span>
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
                <button type="button" onClick={() => goStep('birthDate')} className="btn-secondary">
                  수정할래
                </button>
                <button type="button" onClick={handleSubmit} className="btn-primary">
                  응, 맞아!
                </button>
              </div>
            </div>
          )}

          {error && step !== 'confirm' && <p className="form-error mt-4">{error}</p>}
        </section>
      </div>
    </main>
  );
}

export default function BirthPage() {
  return (
    <Suspense>
      <BirthContent />
    </Suspense>
  );
}
