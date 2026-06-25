'use client';

import type { Prescription } from '@/lib/prescription';

interface Props {
  prescription: Prescription;
}

export default function PrescriptionCard({ prescription }: Props) {
  const { luckyColor, luckyDirection, luckyNumber, talisman, avoidance } = prescription;

  const handleShare = () => {
    const text = `색: ${luckyColor.name}\n방향: ${luckyDirection.name}\n숫자: ${luckyNumber.value}\n기억할 말: ${talisman}`;
    if (navigator.share) {
      navigator.share({ title: '삼신사주 오늘의 제안', text });
    } else {
      navigator.clipboard.writeText(text).then(() => alert('오늘의 제안이 복사됐어요.'));
    }
  };

  const items = [
    { label: '색', value: luckyColor.name, detail: luckyColor.reason, swatch: luckyColor.hex },
    { label: '방향', value: luckyDirection.name, detail: luckyDirection.reason },
    { label: '숫자', value: String(luckyNumber.value), detail: luckyNumber.reason },
    { label: '기억할 말', value: talisman, detail: '짧게 기억할 문장' },
  ];

  return (
    <section className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label">오늘의 제안</p>
          <h3 className="mt-1 text-base font-black">지금 해볼 것</h3>
          <p className="muted-copy mt-1">오행 균형을 참고한 작은 제안이에요.</p>
        </div>
        <button type="button" onClick={handleShare} className="btn-secondary !min-h-9 !px-3 !text-xs">공유</button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.label} className="panel-flat p-3">
            <div className="flex items-center gap-2">
              {item.swatch && (
                <span className="h-4 w-4 rounded-full border border-[var(--line-strong)]" style={{ background: item.swatch }} />
              )}
              <p className="text-xs font-black text-[var(--muted)]">{item.label}</p>
            </div>
            <p className="mt-2 text-sm font-black">{item.value}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-[rgba(166,79,57,0.2)] bg-[var(--red-soft)] p-3">
        <p className="text-xs font-black text-[var(--red)]">조심해 볼 것</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--ink-soft)]">{avoidance}</p>
      </div>
    </section>
  );
}
