'use client';

import { addCookies, getCookieCount } from '@/lib/cookies';
import { useState } from 'react';

const PACKAGES = [
  { amount: 10, price: '990원', bonus: '' },
  { amount: 50, price: '3,900원', bonus: '인기' },
  { amount: 200, price: '9,900원', bonus: '베스트' },
];

interface Props {
  onClose: () => void;
}

export default function CookieShopModal({ onClose }: Props) {
  const [bought, setBought] = useState<number | null>(null);

  const handleBuy = (amount: number) => {
    // 데모: 실제 결제 없이 바로 지급
    const next = addCookies(amount);
    setBought(next);
    setTimeout(() => { onClose(); setBought(null); }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center pb-0 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 space-y-5"
        style={{ background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {bought !== null ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-3xl">🍪</p>
            <p className="font-bold" style={{ color: '#c9a84c' }}>쿠키가 지급되었습니다!</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>현재 {bought}개 보유</p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>🍪 쿠키 충전</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>토스페이먼츠 · 카카오페이 지원</p>
            </div>

            <div className="space-y-3">
              {PACKAGES.map(pkg => (
                <button
                  key={pkg.amount}
                  onClick={() => handleBuy(pkg.amount)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all hover:opacity-80"
                  style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: '#c9a84c' }}>🍪 {pkg.amount}개</span>
                    {pkg.bonus && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(201,168,76,0.2)', color: '#c9a84c' }}>
                        {pkg.bonus}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pkg.price}</span>
                </button>
              ))}
            </div>

            <p className="text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
              * 데모 버전: 결제 없이 즉시 지급
            </p>

            <button onClick={onClose} className="w-full text-xs py-2" style={{ color: 'var(--text-muted)' }}>
              닫기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
