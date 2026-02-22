'use client';

import type { Prescription } from '@/lib/prescription';

interface Props {
  prescription: Prescription;
}

export default function PrescriptionCard({ prescription }: Props) {
  const { luckyColor, luckyDirection, luckyNumber, talisman, avoidance } = prescription;

  const handleShare = () => {
    const text = `행운 색: ${luckyColor.name}\n행운 방향: ${luckyDirection.name}\n행운 숫자: ${luckyNumber.value}\n부적: ${talisman}`;
    if (navigator.share) {
      navigator.share({ title: '삼신사주 처방전', text });
    } else {
      navigator.clipboard.writeText(text).then(() => alert('처방전이 복사되었습니다.'));
    }
  };

  return (
    <div className="card-dark p-5 space-y-4" style={{ borderColor: 'rgba(201,168,76,0.3)' }}>
      <div className="text-center">
        <p className="text-xs tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>── 처방전 ──</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>오행 분석 기반 — 세 신이 합의한 보충 처방</p>
      </div>

      {/* 4격자 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 색상 */}
        <div className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-full mx-auto mb-2"
            style={{ background: luckyColor.hex, boxShadow: `0 0 12px ${luckyColor.hex}40` }} />
          <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>행운 색</p>
          <p className="text-xs font-semibold" style={{ color: luckyColor.hex }}>{luckyColor.name}</p>
          <p className="text-[9px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>{luckyColor.reason}</p>
        </div>

        {/* 방향 */}
        <div className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-lg"
            style={{ background: 'rgba(201,168,76,0.1)' }}>
            🧭
          </div>
          <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>행운 방향</p>
          <p className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>{luckyDirection.name}</p>
          <p className="text-[9px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>{luckyDirection.reason}</p>
        </div>

        {/* 숫자 */}
        <div className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold"
            style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>
            {luckyNumber.value}
          </div>
          <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>행운 숫자</p>
          <p className="text-xs font-semibold" style={{ color: '#a78bfa' }}>{luckyNumber.value}</p>
          <p className="text-[9px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>{luckyNumber.reason}</p>
        </div>

        {/* 부적 */}
        <div className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-lg"
            style={{ background: 'rgba(76,168,125,0.1)' }}>
            🧿
          </div>
          <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>부적</p>
          <p className="text-[9px] mt-1 leading-snug" style={{ color: 'var(--silver, #a8b4c8)' }}>{talisman}</p>
        </div>
      </div>

      {/* 피해야 할 것 */}
      <div className="rounded-xl px-4 py-3"
        style={{ background: 'rgba(224,82,82,0.05)', border: '1px solid rgba(224,82,82,0.15)' }}>
        <p className="text-[10px] font-semibold mb-1" style={{ color: '#e05252' }}>피해야 할 것</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{avoidance}</p>
      </div>

      {/* 공유 */}
      <button onClick={handleShare}
        className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
        style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--gold)' }}>
        처방전 공유하기
      </button>
    </div>
  );
}
