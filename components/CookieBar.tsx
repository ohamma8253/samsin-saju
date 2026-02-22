'use client';

import { useEffect, useState } from 'react';
import { initCookies, getCookieCount } from '@/lib/cookies';

interface CookieBarProps {
  onShopClick: () => void;
}

export default function CookieBar({ onShopClick }: CookieBarProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(initCookies());
    const handler = () => setCount(getCookieCount());
    window.addEventListener('cookie-change', handler);
    return () => window.removeEventListener('cookie-change', handler);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2"
      style={{ background: 'rgba(6,6,15,0.85)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}
    >
      <span className="text-xs font-semibold tracking-widest gold-gradient">삼신사주</span>
      <button
        onClick={onShopClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:opacity-80"
        style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c' }}
      >
        🍪 <span>{count}개</span>
      </button>
    </div>
  );
}
