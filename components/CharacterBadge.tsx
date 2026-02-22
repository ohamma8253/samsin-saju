interface CharacterBadgeProps {
  name: string;
  title: string;
  emoji: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function CharacterBadge({ name, title, emoji, color, size = 'md' }: CharacterBadgeProps) {
  const sizes = {
    sm: { outer: 'w-10 h-10 text-xl', name: 'text-xs', title: 'text-[10px]' },
    md: { outer: 'w-14 h-14 text-2xl', name: 'text-sm', title: 'text-xs' },
    lg: { outer: 'w-20 h-20 text-4xl', name: 'text-base', title: 'text-xs' },
  };
  const s = sizes[size];

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${s.outer} rounded-full flex items-center justify-center border`}
        style={{
          background: `radial-gradient(circle at 40% 35%, ${color}22, ${color}08)`,
          borderColor: `${color}40`,
          boxShadow: `0 0 16px ${color}20`,
        }}
      >
        <span>{emoji}</span>
      </div>
      <span className={`${s.name} font-semibold`} style={{ color }}>{name}</span>
      <span className={`${s.title} text-center`} style={{ color: 'var(--text-muted)' }}>{title}</span>
    </div>
  );
}
