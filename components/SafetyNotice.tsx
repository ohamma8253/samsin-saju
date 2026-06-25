'use client';

interface SafetyNoticeProps {
  className?: string;
  variant?: 'panel' | 'inline';
}

export default function SafetyNotice({ className = '', variant = 'panel' }: SafetyNoticeProps) {
  const copy = '단정적인 예언보다, 지금 참고할 기준을 정리합니다. 건강·법률·투자 결정은 전문가와 함께 확인해주세요.';

  if (variant === 'inline') {
    return (
      <p className={`text-[11px] font-bold leading-relaxed text-[var(--muted)] ${className}`}>
        {copy}
      </p>
    );
  }

  return (
    <aside className={`panel-flat p-3 ${className}`} aria-label="안전 안내">
      <p className="text-[11px] font-bold leading-relaxed text-[var(--muted)]">
        {copy}
      </p>
    </aside>
  );
}
