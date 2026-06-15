import React, { memo, useState } from 'react';
import type { StatusEffect, StatusEffectType } from '@/types';

const ICON_MAP: Record<StatusEffectType, string> = {
  poison: '☠',
  paralyze: '⚡',
  burn: '🔥',
  shield: '🛡',
  stealth: '👁',
};

interface StatusEffectIconProps {
  effect: StatusEffect;
  onRemove?: (id: string) => void;
  exiting?: boolean;
}

function StatusEffectIconBase({ effect, onRemove, exiting }: StatusEffectIconProps) {
  const [hover, setHover] = useState(false);

  const className = `status-icon${exiting ? ' exiting' : ''}`;

  return (
    <div
      className={className}
      style={{ backgroundColor: effect.color }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onRemove?.(effect.id)}
      title={`${effect.name} (${effect.remainingTurns}回合)`}
    >
      <span>{ICON_MAP[effect.type]}</span>
      <div className="turns-badge">{effect.remainingTurns}</div>
      {hover && (
        <div className="status-tooltip">
          {effect.name} · 剩余{effect.remainingTurns}回合
        </div>
      )}
    </div>
  );
}

export const StatusEffectIcon = memo(StatusEffectIconBase);
