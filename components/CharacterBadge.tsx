interface CharacterBadgeProps {
  name: string;
  title: string;
  emoji: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'hanji' | 'cloud' | 'goldfoil';
}

export default function CharacterBadge({ name, title, emoji, color, size = 'md' }: CharacterBadgeProps) {
  const sizes = {
    sm: { badge: 'h-10 w-10 text-lg', name: 'text-xs', title: 'text-[10px]' },
    md: { badge: 'h-12 w-12 text-xl', name: 'text-sm', title: 'text-xs' },
    lg: { badge: 'h-16 w-16 text-2xl', name: 'text-base', title: 'text-xs' },
  };
  const selected = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${selected.badge} flex shrink-0 items-center justify-center rounded-lg border bg-[var(--surface)] font-black`}
        style={{ borderColor: `${color}55`, color }}
        aria-hidden="true"
      >
        {emoji}
      </div>
      <div className="min-w-0">
        <p className={`${selected.name} truncate font-black text-[var(--ink)]`}>{name}</p>
        <p className={`${selected.title} truncate font-bold text-[var(--muted)]`}>{title}</p>
      </div>
    </div>
  );
}
