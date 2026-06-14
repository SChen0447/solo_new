import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { SKILLS, validateCharacterName, Skill } from '@/configs/CharacterConfig';
import { previewSkillEffect } from '@/core/SkillEffect';

interface CharacterPanelProps {
  characterId: 1 | 2;
}

const SkillPreviewModal: React.FC<{ skill: Skill; onClose: () => void }> = ({ skill, onClose }) => {
  const preview = previewSkillEffect(skill);
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating((a) => !a);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="skill-preview-overlay" onClick={onClose}>
      <div className="skill-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="skill-preview-header">
          <span className={`skill-preview-icon ${animating ? 'pulse' : ''}`}>{skill.icon}</span>
          <span className="skill-preview-name">{skill.name}</span>
        </div>
        <div className="skill-preview-desc">{skill.description}</div>

        <div className="skill-preview-stats">
          {preview.minDamage > 0 && (
            <div className="stat-row">
              <span className="stat-label">伤害区间</span>
              <div className="stat-bar-container">
                <div
                  className="stat-bar damage"
                  style={{ width: `${Math.min(100, (preview.maxDamage / 50) * 100)}%` }}
                />
                <span className="stat-value">
                  {preview.minDamage} - {preview.maxDamage}
                </span>
              </div>
            </div>
          )}
          {preview.minHeal > 0 && (
            <div className="stat-row">
              <span className="stat-label">治疗区间</span>
              <div className="stat-bar-container">
                <div
                  className="stat-bar heal"
                  style={{ width: `${Math.min(100, (preview.maxHeal / 50) * 100)}%` }}
                />
                <span className="stat-value">
                  {preview.minHeal} - {preview.maxHeal}
                </span>
              </div>
            </div>
          )}
          {preview.minShield > 0 && (
            <div className="stat-row">
              <span className="stat-label">护盾区间</span>
              <div className="stat-bar-container">
                <div
                  className="stat-bar shield"
                  style={{ width: `${Math.min(100, (preview.maxShield / 50) * 100)}%` }}
                />
                <span className="stat-value">
                  {preview.minShield} - {preview.maxShield}
                </span>
              </div>
            </div>
          )}
          {preview.buffValue && (
            <div className="stat-row">
              <span className="stat-label">效果数值</span>
              <div className="stat-bar-container">
                <div
                  className="stat-bar buff"
                  style={{ width: `${Math.min(100, (preview.buffValue / 20) * 100)}%` }}
                />
                <span className="stat-value">+{preview.buffValue}</span>
              </div>
            </div>
          )}
          {preview.duration && (
            <div className="stat-row">
              <span className="stat-label">持续回合</span>
              <span className="stat-value-inline">{preview.duration} 回合</span>
            </div>
          )}
          <div className="stat-row">
            <span className="stat-label">冷却回合</span>
            <span className="stat-value-inline">{skill.cooldown} 回合</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">触发概率</span>
            <div className="stat-bar-container">
              <div
                className="stat-bar chance"
                style={{ width: `${preview.triggerChance * 100}%` }}
              />
              <span className="stat-value">{Math.round(preview.triggerChance * 100)}%</span>
            </div>
          </div>
        </div>

        <button className="close-preview-btn" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  );
};

const CharacterPanel: React.FC<CharacterPanelProps> = ({ characterId }) => {
  const character = characterId === 1
    ? useGameStore((s) => s.character1)
    : useGameStore((s) => s.character2);

  const setName = characterId === 1
    ? useGameStore((s) => s.setCharacter1Name)
    : useGameStore((s) => s.setCharacter2Name);
  const setStats = characterId === 1
    ? useGameStore((s) => s.setCharacter1Stats)
    : useGameStore((s) => s.setCharacter2Stats);
  const toggleSkill = characterId === 1
    ? useGameStore((s) => s.toggleCharacter1Skill)
    : useGameStore((s) => s.toggleCharacter2Skill);

  const [nameError, setNameError] = useState(false);
  const [previewSkill, setPreviewSkill] = useState<Skill | null>(null);
  const [animatingStats, setAnimatingStats] = useState<Record<string, boolean>>({});

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setNameError(val.length > 0 && !validateCharacterName(val));
  };

  const handleStatChange = (stat: 'attack' | 'defense', value: number) => {
    setStats({ [stat]: value });
    setAnimatingStats((prev) => ({ ...prev, [stat]: true }));
    setTimeout(() => {
      setAnimatingStats((prev) => ({ ...prev, [stat]: false }));
    }, 300);
  };

  const isSelected = (skillId: string) => character.skillIds.includes(skillId);

  return (
    <div className="character-panel">
      <div className="panel-header">
        <h3>角色 {characterId}</h3>
      </div>

      <div className="name-input-group">
        <label>角色名称（2-6个中文字符）</label>
        <input
          type="text"
          value={character.name}
          onChange={handleNameChange}
          className={`name-input ${nameError ? 'error' : ''}`}
          placeholder="请输入名称"
        />
        {nameError && <span className="error-text">名称需为2-6个中文字符</span>}
      </div>

      <div className="stats-group">
        <div className="stat-item">
          <div className="stat-header">
            <span>生命值</span>
            <span className={`stat-value-mono ${animatingStats.maxHp ? 'animate' : ''}`}>
              {character.stats.maxHp}
            </span>
          </div>
          <div className="hp-bar-display">
            <div className="hp-bar-fill" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-header">
            <span>攻击力</span>
            <span className={`stat-value-mono ${animatingStats.attack ? 'animate' : ''}`}>
              {character.stats.attack}
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={30}
            value={character.stats.attack}
            onChange={(e) => handleStatChange('attack', parseInt(e.target.value))}
            className="stat-slider"
          />
          <div className="slider-labels">
            <span>10</span>
            <span>30</span>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-header">
            <span>防御力</span>
            <span className={`stat-value-mono ${animatingStats.defense ? 'animate' : ''}`}>
              {character.stats.defense}
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={15}
            value={character.stats.defense}
            onChange={(e) => handleStatChange('defense', parseInt(e.target.value))}
            className="stat-slider"
          />
          <div className="slider-labels">
            <span>5</span>
            <span>15</span>
          </div>
        </div>
      </div>

      <div className="skills-section">
        <div className="skills-header">
          <span>选择技能 ({character.skillIds.length}/3)</span>
        </div>
        <div className="skills-grid">
          {SKILLS.map((skill) => {
            const selected = isSelected(skill.id);
            const disabled = !selected && character.skillIds.length >= 3;
            return (
              <div
                key={skill.id}
                className={`skill-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && toggleSkill(skill.id)}
              >
                <div className="skill-card-header">
                  <span className="skill-icon">{skill.icon}</span>
                  <span className="skill-name">{skill.name}</span>
                </div>
                <div className="skill-card-desc">{skill.description}</div>
                <div className="skill-card-footer">
                  <span className="skill-cooldown">CD: {skill.cooldown}</span>
                  <button
                    className="preview-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewSkill(skill);
                    }}
                  >
                    预览
                  </button>
                </div>
                {selected && <div className="selected-glow" />}
              </div>
            );
          })}
        </div>
      </div>

      {previewSkill && (
        <SkillPreviewModal skill={previewSkill} onClose={() => setPreviewSkill(null)} />
      )}
    </div>
  );
};

export const BattleSetup: React.FC = () => {
  return (
    <div className="battle-setup">
      <CharacterPanel characterId={1} />
      <div className="vs-divider">
        <span className="vs-text">VS</span>
      </div>
      <CharacterPanel characterId={2} />
    </div>
  );
};

export default BattleSetup;
