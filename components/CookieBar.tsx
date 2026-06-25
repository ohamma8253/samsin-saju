'use client';

import { useSyncExternalStore } from 'react';
import { initCookies, getCookieCount } from '@/lib/cookies';

interface CookieBarProps {
  onShopClick: () => void;
}

function subscribeToCookieChanges(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};

  initCookies();
  onStoreChange();
  window.addEventListener('cookie-change', onStoreChange);
  return () => window.removeEventListener('cookie-change', onStoreChange);
}

export default function CookieBar({ onShopClick }: CookieBarProps) {
  const count = useSyncExternalStore(subscribeToCookieChanges, getCookieCount, () => 0);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-[var(--line)] bg-[rgba(255,250,242,0.92)] px-4 py-2 backdrop-blur"
    >
      <span className="text-xs font-black text-[var(--ink)]">삼신사주</span>
      <button
        onClick={onShopClick}
        className="chip chip-gold"
      >
        <span>{count}쿠키</span>
      </button>
    </div>
  );
}
