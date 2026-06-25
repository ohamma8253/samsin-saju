'use client';

import { useRouter } from 'next/navigation';

type BottomNavItem = 'today' | 'report' | 'ask' | 'compatibility' | 'archive';

interface BottomNavProps {
  active: BottomNavItem;
  reportHref?: string;
  askHref?: string;
  onAsk?: () => void;
  askDisabled?: boolean;
}

const ITEMS: Array<{ key: BottomNavItem; label: string }> = [
  { key: 'today', label: '오늘' },
  { key: 'report', label: '리포트' },
  { key: 'ask', label: '묻기' },
  { key: 'compatibility', label: '궁합' },
  { key: 'archive', label: '보관함' },
];

export default function BottomNav({ active, reportHref, askHref, onAsk, askDisabled = false }: BottomNavProps) {
  const router = useRouter();

  const handleSelect = (key: BottomNavItem) => {
    if (key === active) return;
    if (key === 'today') router.push('/');
    if (key === 'report' && reportHref) router.push(reportHref);
    if (key === 'ask' && !askDisabled) {
      if (askHref) router.push(askHref);
      else if (onAsk) onAsk();
    }
    if (key === 'compatibility') router.push('/compatibility');
    if (key === 'archive') router.push('/archive');
  };

  return (
    <nav className="bottom-nav">
      <div className="mobile-shell grid grid-cols-5 gap-1 py-2">
        {ITEMS.map(item => {
          const disabled =
            (item.key === 'report' && !reportHref && active !== 'report') ||
            (item.key === 'ask' && ((!askHref && !onAsk) || askDisabled) && active !== 'ask');
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleSelect(item.key)}
              disabled={disabled}
              className={`bottom-nav-item ${active === item.key ? 'bottom-nav-active' : ''}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
