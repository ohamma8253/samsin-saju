import type { ReactNode } from 'react';
import Image from 'next/image';
import { SAMSIN_CHARACTER_IMAGE_BY_KEY, type SamsinCharacterProfile } from '@/lib/samsin-characters';

type AvatarSize = 'sm' | 'md' | 'lg';
type CardVariant = 'default' | 'compact' | 'voice';

interface AvatarProps {
  character: SamsinCharacterProfile;
  size?: AvatarSize;
  className?: string;
}

interface CardProps {
  character: SamsinCharacterProfile;
  variant?: CardVariant;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function SamsinAvatar({ character, size = 'md', className = '' }: AvatarProps) {
  return (
    <div
      className={`samsin-avatar samsin-avatar-${character.key} samsin-avatar-${size} ${className}`}
      role="img"
      aria-label={`${character.name} ${character.archetype}`}
    >
      <Image
        src={SAMSIN_CHARACTER_IMAGE_BY_KEY[character.key]}
        alt=""
        width={96}
        height={96}
        className="samsin-avatar-image"
        unoptimized
      />
    </div>
  );
}

export default function SamsinCharacterCard({
  character,
  variant = 'default',
  action,
  children,
  className = '',
}: CardProps) {
  const compact = variant !== 'default';

  return (
    <article className={`samsin-card samsin-card-${character.key} ${compact ? 'samsin-card-compact' : ''} ${className}`}>
      <div className="flex items-start gap-3">
        <SamsinAvatar character={character} size={compact ? 'sm' : 'md'} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black" style={{ color: character.color }}>{character.name}</p>
            <span className={`chip ${character.chipClass} !min-h-6 !px-2 !text-[10px]`}>{character.short}</span>
          </div>
          <p className="mt-1 text-xs font-black text-[var(--ink)]">{compact ? character.signature : character.title}</p>
          {!compact && <p className="muted-copy mt-1">{character.roleLine}</p>}
        </div>
        {action}
      </div>
      {children && (
        <div className={compact ? 'mt-3' : 'mt-4'}>
          {children}
        </div>
      )}
    </article>
  );
}
