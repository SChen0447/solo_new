import { useState } from 'react';
import { useGameStore } from '../game/store';
import { KILL_CHARGES_REQUIRED, COLORS, KILL_BUTTON_SIZE } from '../game/constants';

export default function KillButton() {
  const { killCharges, useKillSkill } = useGameStore();
  const [isHovered, setIsHovered] = useState(false);

  const canUse = killCharges >= KILL_CHARGES_REQUIRED;

  const handleClick = () => {
    if (canUse) {
      useKillSkill();
    }
  };

  const brightness = isHovered && canUse ? 1.2 : 1;

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '24px',
        transform: 'translateX(-50%)',
        width: KILL_BUTTON_SIZE,
        height: KILL_BUTTON_SIZE,
        borderRadius: '50%',
        backgroundColor: canUse ? COLORS.killButton : '#4a148c',
        filter: `brightness(${brightness})`,
        cursor: canUse ? 'pointer' : 'not-allowed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: 'bold',
        boxShadow: canUse
          ? '0 0 20px rgba(106, 27, 154, 0.6)'
          : '0 2px 8px rgba(0, 0, 0, 0.3)',
        transition: 'filter 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
        userSelect: 'none',
        opacity: canUse ? 1 : 0.6,
      }}
    >
      <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
        <div style={{ fontSize: '10px' }}>释放</div>
        <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>
          {killCharges}/{KILL_CHARGES_REQUIRED}
        </div>
      </div>
    </div>
  );
}
