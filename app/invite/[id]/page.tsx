'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import StarsBg from '@/components/StarsBg';
import { decodeInvite } from '@/lib/invite';
import { encodeInvite } from '@/lib/invite';
import { CITIES, DEFAULT_CITY } from '@/lib/cities';

const HOURS = [
  { value: '0',  label: '자시 (23~01시)' },
  { value: '1',  label: '축시 (01~03시)' },
  { value: '3',  label: '인시 (03~05시)' },
  { value: '5',  label: '묘시 (05~07시)' },
  { value: '7',  label: '진시 (07~09시)' },
  { value: '9',  label: '사시 (09~11시)' },
  { value: '11', label: '오시 (11~13시)' },
  { value: '13', label: '미시 (13~15시)' },
  { value: '15', label: '신시 (15~17시)' },
  { value: '17', label: '유시 (17~19시)' },
  { value: '19', label: '술시 (19~21시)' },
  { value: '21', label: '해시 (21~23시)' },
  { value: '12', label: '모름' },
];

export default function InvitePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const personA = decodeInvite(id);

  const [name,   setName]   = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('F');
  const [year,   setYear]   = useState('');
  const [month,  setMonth]  = useState('1');
  const [day,    setDay]    = useState('');
  const [hour,   setHour]   = useState('12');
  const [city,   setCity]   = useState(DEFAULT_CITY);
  const [rel,    setRel]    = useState<'friend' | 'romantic'>('romantic');

  if (!personA) {
    return (
      <main className="relative min-h-screen flex items-center justify-center px-4">
        <StarsBg />
        <div className="relative z-10 text-center space-y-4">
          <p style={{ color: 'var(--text-muted)' }}>유효하지 않은 초대 링크입니다.</p>
          <button onClick={() => router.push('/')} className="text-sm underline" style={{ color: 'var(--gold)' }}>
            홈으로
          </button>
        </div>
      </main>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !year || !day) return;

    const personB = {
      name: name.trim(),
      gender,
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: Number(hour),
      minute: 0,
      city,
    };

    const a = encodeInvite(personA);
    const b = encodeInvite(personB);
    router.push(`/compatibility?a=${a}&b=${b}&rel=${rel}`);
  };

  return (
    <main className="relative min-h-screen px-4 py-12">
      <StarsBg />

      <div className="relative z-10 max-w-sm mx-auto space-y-6">

        {/* 초대 메시지 */}
        <div className="text-center space-y-3 animate-fade-up">
          <p className="text-3xl">🌿 ☁️ ✦</p>
          <h1 className="text-xl font-bold gold-gradient">궁합 초대</h1>
          <div className="card-dark p-4 space-y-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {personA.name}님이 궁합을 보고 싶어합니다
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              당신의 생년월일을 입력하면 세 신이 두 사람의 인연을 읽어드립니다.
            </p>
          </div>
        </div>

        {/* 관계 유형 */}
        <div className="flex gap-2">
          {(['romantic', 'friend'] as const).map(r => (
            <button key={r} onClick={() => setRel(r)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: rel === r ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${rel === r ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: rel === r ? '#c9a84c' : 'var(--text-muted)',
              }}>
              {r === 'romantic' ? '💑 연인·부부' : '🤝 친구·지인'}
            </button>
          ))}
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up"
          style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>

          {/* 이름 */}
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>이름</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="본인 이름 입력"
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* 성별 */}
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>성별</label>
            <div className="flex gap-2">
              {([['M', '남성'], ['F', '여성']] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => setGender(v)}
                  className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    background: gender === v ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${gender === v ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: gender === v ? '#c9a84c' : 'var(--text-muted)',
                  }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* 생년월일 */}
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>생년월일</label>
            <div className="flex gap-2">
              <input value={year} onChange={e => setYear(e.target.value)}
                placeholder="년도" type="number" min="1900" max="2025" required
                className="flex-[2] px-3 py-3 rounded-xl text-sm outline-none text-center"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--text-primary)' }}
              />
              <select value={month} onChange={e => setMonth(e.target.value)}
                className="flex-1 px-2 py-3 rounded-xl text-sm outline-none text-center"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--text-primary)' }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i+1} value={i+1}>{i+1}월</option>
                ))}
              </select>
              <input value={day} onChange={e => setDay(e.target.value)}
                placeholder="일" type="number" min="1" max="31" required
                className="flex-1 px-3 py-3 rounded-xl text-sm outline-none text-center"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* 출생시간 */}
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>출생시간</label>
            <select value={hour} onChange={e => setHour(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--text-primary)' }}>
              {HOURS.map(h => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>

          {/* 출생 지역 */}
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>출생 지역</label>
            <select value={city} onChange={e => setCity(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--text-primary)' }}>
              {Object.entries(CITIES).map(([key, c]) => (
                <option key={key} value={key}>{c.name}</option>
              ))}
            </select>
          </div>

          <button type="submit"
            className="w-full py-4 rounded-xl text-sm font-bold tracking-wide transition-all hover:opacity-90 mt-2"
            style={{
              background: 'linear-gradient(135deg, #b8933e, #e8c97a, #b8933e)',
              color: '#06060f',
            }}>
            🌿 궁합 확인하기
          </button>
        </form>
      </div>
    </main>
  );
}
