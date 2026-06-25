'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { CITIES, DEFAULT_CITY } from '@/lib/cities';
import { decodeInvite, encodeInvite } from '@/lib/invite';

const HOURS = [
  { value: '-1', label: '시간 모름' },
  { value: '0', label: '자시 (23~01시)' },
  { value: '2', label: '축시 (01~03시)' },
  { value: '4', label: '인시 (03~05시)' },
  { value: '6', label: '묘시 (05~07시)' },
  { value: '8', label: '진시 (07~09시)' },
  { value: '10', label: '사시 (09~11시)' },
  { value: '12', label: '오시 (11~13시)' },
  { value: '14', label: '미시 (13~15시)' },
  { value: '16', label: '신시 (15~17시)' },
  { value: '18', label: '유시 (17~19시)' },
  { value: '20', label: '술시 (19~21시)' },
  { value: '22', label: '해시 (21~23시)' },
];

export default function InvitePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const personA = decodeInvite(id);

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('F');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('1');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('-1');
  const [city, setCity] = useState(DEFAULT_CITY);
  const [rel, setRel] = useState<'friend' | 'romantic'>('romantic');

  if (!personA) {
    return (
      <main className="mobile-shell min-h-screen py-16">
        <div className="panel p-6 text-center">
          <p className="section-label">Invalid Link</p>
          <h1 className="title-tight mt-2">유효하지 않은 초대 링크입니다</h1>
          <button type="button" onClick={() => router.push('/')} className="btn-primary mt-5 w-full">
            홈으로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const birthYear = Number(year);
    const birthMonth = Number(month);
    const birthDay = Number(day);
    const birthHour = Number(hour);
    if (
      !name.trim()
      || !Number.isInteger(birthYear)
      || !Number.isInteger(birthMonth)
      || !Number.isInteger(birthDay)
      || birthYear < 1920
      || birthYear > 2010
      || birthMonth < 1
      || birthMonth > 12
      || birthDay < 1
      || birthDay > 31
    ) return;

    const unknownTime = birthHour < 0;

    const personB = {
      name: name.trim(),
      gender,
      year: birthYear,
      month: birthMonth,
      day: birthDay,
      hour: unknownTime ? 12 : birthHour,
      minute: 0,
      city,
      unknownTime,
      birthTimePrecision: unknownTime ? 'unknown' as const : 'range' as const,
    };

    const a = encodeInvite(personA);
    const b = encodeInvite(personB);
    trackEvent('compat_invite_created', {
      relationship: rel,
      host_city: personA.city ?? null,
      guest_city: city,
    });
    router.push(`/compatibility?a=${a}&b=${b}&rel=${rel}`);
  };

  return (
    <main className="mobile-shell min-h-screen py-8">
      <section className="space-y-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-blue">INVITE</span>
            <span className="chip">궁합 입력</span>
          </div>
          <h1 className="display-title !text-[34px]">초대받은 사람의 출생 정보를 입력합니다</h1>
        </div>

        <div className="panel-strong p-5">
          <p className="section-label">From</p>
          <h2 className="title-tight mt-2">{personA.name}님의 궁합 요청</h2>
          <p className="body-copy mt-3">
            입력 후 두 사람의 기질, 소통 방식, 관계 강점을 같은 기준으로 비교합니다.
          </p>
        </div>

        <div className="segmented">
          {(['romantic', 'friend'] as const).map(value => (
            <button
              key={value}
              type="button"
              onClick={() => setRel(value)}
              className={`segment ${rel === value ? 'segment-active' : ''}`}
            >
              {value === 'romantic' ? '연인·부부' : '친구·지인'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="panel p-5">
          <div className="space-y-4">
            <div>
              <label className="field-label">이름</label>
              <input
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="본인 이름"
                required
                className="field"
              />
            </div>

            <div>
              <label className="field-label">성별</label>
              <div className="segmented">
                {([['M', '남성'], ['F', '여성']] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGender(value)}
                    className={`segment ${gender === value ? 'segment-active' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="field-label">생년월일</label>
              <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-2">
                <input
                  value={year}
                  onChange={event => setYear(event.target.value)}
                  placeholder="년도"
                  type="number"
                  min="1920"
                  max="2010"
                  required
                  className="field text-center"
                />
                <select value={month} onChange={event => setMonth(event.target.value)} className="field text-center">
                  {Array.from({ length: 12 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>{index + 1}월</option>
                  ))}
                </select>
                <input
                  value={day}
                  onChange={event => setDay(event.target.value)}
                  placeholder="일"
                  type="number"
                  min="1"
                  max="31"
                  required
                  className="field text-center"
                />
              </div>
            </div>

            <div>
              <label className="field-label">출생시간</label>
              <select value={hour} onChange={event => setHour(event.target.value)} className="field">
                {HOURS.map(item => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">출생 지역</label>
              <select value={city} onChange={event => setCity(event.target.value)} className="field">
                {Object.entries(CITIES).map(([key, item]) => (
                  <option key={key} value={key}>{item.name}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-primary w-full">
              궁합 보기 시작
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
