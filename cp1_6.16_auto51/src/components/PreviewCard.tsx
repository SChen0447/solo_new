import React from 'react';
import type { Weapon, Enemy } from '../data/definitions';
import { WEAPON_TYPE_COLORS, WEAPON_TYPE_NAMES, EFFECT_TYPE_NAMES } from '../data/definitions';

interface WeaponPreviewCardProps {
  weapon: Weapon;
}

export const WeaponPreviewCard: React.FC<WeaponPreviewCardProps> = ({ weapon }) => {
  const bgColor = WEAPON_TYPE_COLORS[weapon.type];
  const typeName = WEAPON_TYPE_NAMES[weapon.type];

  return (
    <div 
      className="preview-card weapon-card"
      style={{ 
        background: `linear-gradient(135deg, ${bgColor}33 0%, ${bgColor}11 100%)`,
        borderLeft: `3px solid ${bgColor}`,
        transition: 'all 0.3s ease'
      }}
    >
      <div className="card-header">
        <span className="card-title" style={{ color: bgColor }}>{weapon.name}</span>
        <span className="card-type">{typeName}</span>
      </div>
      <div className="card-stats">
        <div className="stat-row">
          <span className="stat-label">伤害</span>
          <span className="stat-value">{weapon.damage}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">攻速</span>
          <span className="stat-value">{weapon.attackSpeed.toFixed(1)}/s</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">射程</span>
          <span className="stat-value">{weapon.range.toFixed(1)}m</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">暴击率</span>
          <span className="stat-value">{(weapon.critRate * 100).toFixed(0)}%</span>
        </div>
      </div>
      {weapon.specialEffect && (
        <div className="special-effect">
          <span className="effect-name" style={{ color: bgColor }}>
            {EFFECT_TYPE_NAMES[weapon.specialEffect.type]}
          </span>
          <span className="effect-desc">{weapon.specialEffect.description}</span>
        </div>
      )}
    </div>
  );
};

interface EnemyPreviewCardProps {
  enemy: Enemy;
}

export const EnemyPreviewCard: React.FC<EnemyPreviewCardProps> = ({ enemy }) => {
  return (
    <div 
      className="preview-card enemy-card"
      style={{ 
        background: 'linear-gradient(135deg, #e74c3c22 0%, #e74c3c08 100%)',
        borderLeft: '3px solid #e74c3c',
        transition: 'all 0.3s ease'
      }}
    >
      <div className="card-header">
        <span className="card-title" style={{ color: '#e74c3c' }}>{enemy.name}</span>
      </div>
      <div className="card-stats">
        <div className="stat-row">
          <span className="stat-label">生命</span>
          <span className="stat-value">{enemy.maxHealth}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">护甲</span>
          <span className="stat-value">{enemy.armor}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">闪避</span>
          <span className="stat-value">{(enemy.dodgeRate * 100).toFixed(0)}%</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">抗性</span>
          <span className="stat-value">{(enemy.resistance * 100).toFixed(0)}%</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">移速</span>
          <span className="stat-value">{enemy.moveSpeed.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};

export default { WeaponPreviewCard, EnemyPreviewCard };
