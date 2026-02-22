'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StarsBg from '@/components/StarsBg';
import CharacterBadge from '@/components/CharacterBadge';
import { CITIES, DEFAULT_CITY } from '@/lib/cities';

const CHARACTERS = [
  { name: '청운', title: '사주팔자', emoji: '🌿', color: '#4ca87d' },
  { name: '태을', title: '자미두수', emoji: '☁️', color: '#a78bfa' },
  { name: '루나', title: '서양 점성술', emoji: '✦', color: '#c9a84c' },
];

const HOURS = [
  { label: '시간 모름', value: '-1' },
  { label: '자시 (23~01시)', value: '0' },
  { label: '축시 (01~03시)', value: '2' },
  { label: '인시 (03~05시)', value: '4' },
  { label: '묘시 (05~07시)', value: '6' },
  { label: '진시 (07~09시)', value: '8' },
  { label: '사시 (09~11시)', value: '10' },
  { label: '오시 (11~13시)', value: '12' },
  { label: '미시 (13~15시)', value: '14' },
  { label: '신시 (15~17시)', value: '16' },
  { label: '유시 (17~19시)', value: '18' },
  { label: '술시 (19~21시)', value: '20' },
  { label: '해시 (21~23시)', value: '22' },
];

export default function LandingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [hour, setHour] = useState('-1');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [city, setCity] = useState(DEFAULT_CITY);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthDate) {
      setError('이름과 생년월일을 입력해주세요.');
      return;
    }
    setError('');

    const [year, month, day] = birthDate.split('-').map(Number);
    const hourNum = Number(hour);

    const params = new URLSearchParams({
      name: name.trim(),
      year: String(year),
      month: String(month),
      day: String(day),
      hour: hourNum < 0 ? '12' : String(hourNum),
      minute: '0',
      gender,
      city,
    });

    router.push(`/report?${params.toString()}`);
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <StarsBg />

      <div className="relative z-10 w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <div className="flex justify-center gap-8 mb-7 animate-fade-up">
            {CHARACTERS.map(c => (
              <CharacterBadge key={c.name} {...c} size="md" />
            ))}
          </div>

          <h1 className="text-4xl font-bold tracking-widest mb-1 gold-gradient">
            삼신사주
          </h1>
          <p className="text-xs tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            三神四柱
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--silver)' }}>
            청운·태을·루나가 세 가지 천명서로<br />
            당신의 운명을 읽습니다
          </p>
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleSubmit} className="card-dark p-6 space-y-5">
          {/* 이름 */}
          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              이름 또는 닉네임
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="홍길동"
              maxLength={10}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:border-yellow-600"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* 성별 */}
          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              성별
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['M', 'F'] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className="py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: gender === g ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${gender === g ? 'rgba(201,168,76,0.45)' : 'rgba(201,168,76,0.12)'}`,
                    color: gender === g ? '#c9a84c' : 'var(--text-muted)',
                  }}
                >
                  {g === 'M' ? '남성' : '여성'}
                </button>
              ))}
            </div>
          </div>

          {/* 생년월일 */}
          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              생년월일
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              min="1920-01-01"
              max="2010-12-31"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: 'var(--text-primary)',
                colorScheme: 'dark',
              }}
            />
          </div>

          {/* 출생시간 */}
          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              출생시간
              <span className="ml-1" style={{ fontSize: '10px' }}>(모를 경우 건너뛰기)</span>
            </label>
            <select
              value={hour}
              onChange={e => setHour(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'rgba(13,13,26,0.95)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: 'var(--text-primary)',
              }}
            >
              {HOURS.map(h => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>

          {/* 출생 지역 */}
          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              출생 지역
            </label>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'rgba(13,13,26,0.95)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: 'var(--text-primary)',
              }}
            >
              {Object.entries(CITIES).map(([key, c]) => (
                <option key={key} value={key}>{c.name}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-4 rounded-xl text-sm font-bold tracking-widest transition-all hover:opacity-90 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #b8933e, #e8c97a, #b8933e)',
              color: '#06060f',
            }}
          >
            천명서 펼치기
          </button>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          첫 방문 시 쿠키 7개 무료 지급
        </p>
      </div>
    </main>
  );
}
