import React from 'react';
import {
  Unit,
  HeroClass,
  Skill,
  SkillType,
  EnemyTemplate,
  createHero,
  createEnemy
} from '../engine';
import { v4 as uuidv4 } from 'uuid';

interface EditorPanelProps {
  heroes: Unit[];
  enemies: Unit[];
  simulationCount: number;
  onHeroesChange: (heroes: Unit[]) => void;
  onEnemiesChange: (enemies: Unit[]) => void;
  onSimulationCountChange: (n: number) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
}

const HERO_CLASS_LABELS: Record<HeroClass, string> = {
  warrior: '战士',
  mage: '法师',
  assassin: '刺客',
  priest: '牧师'
};

const SKILL_TYPE_LABELS: Record<SkillType, string> = {
  physical: '物理',
  magic: '魔法',
  heal: '治疗',
  buff: '增益',
  debuff: '减益'
};

const ENEMY_TEMPLATE_LABELS: Record<EnemyTemplate, string> = {
  goblin: '哥布林',
  skeleton: '骷髅',
  dark_elf: '暗精灵',
  golem: '石头人',
  dragon: 'Boss龙'
};

const NumberInput: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
    <span style={{ flex: '0 0 50px', fontSize: 12, color: '#A0A0B8' }}>{label}</span>
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => {
        const v = Math.min(max, Math.max(min, parseInt(e.target.value) || min));
        onChange(v);
      }}
      style={{
        flex: 1,
        background: '#1E1E2E',
        border: '1px solid #3A3A4C',
        borderRadius: 4,
        padding: '4px 8px',
        color: '#E0E0E0',
        fontSize: 12,
        outline: 'none',
        width: '100%'
      }}
    />
    <span style={{ fontSize: 10, color: '#6A6A8A', width: 28, textAlign: 'right' }}>{max}</span>
  </div>
);

const SkillEditor: React.FC<{
  skill: Skill;
  index: number;
  onChange: (s: Skill) => void;
}> = ({ skill, index, onChange }) => (
  <div
    style={{
      background: '#1E1E2E',
      border: '1px solid #3A3A4C',
      borderRadius: 6,
      padding: 8,
      marginBottom: 6
    }}
  >
    <div
      style={{
        fontSize: 11,
        color: '#8A8AAA',
        marginBottom: 6,
        fontWeight: 600
      }}
    >
      技能 {index + 1}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <input
        type="text"
        value={skill.name}
        onChange={(e) => onChange({ ...skill, name: e.target.value })}
        placeholder="技能名称"
        style={{
          flex: 1,
          background: '#2B2B3D',
          border: '1px solid #3A3A4C',
          borderRadius: 4,
          padding: '4px 6px',
          color: '#E0E0E0',
          fontSize: 12,
          outline: 'none'
        }}
      />
      <select
        value={skill.type}
        onChange={(e) => onChange({ ...skill, type: e.target.value as SkillType })}
        style={{
          background: '#2B2B3D',
          border: '1px solid #3A3A4C',
          borderRadius: 4,
          padding: '4px 4px',
          color: '#E0E0E0',
          fontSize: 11,
          outline: 'none'
        }}
      >
        {Object.entries(SKILL_TYPE_LABELS).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, color: '#8A8AAA', width: 20 }}>MP</span>
        <input
          type="number"
          min={0}
          max={30}
          value={skill.mpCost}
          onChange={(e) =>
            onChange({
              ...skill,
              mpCost: Math.min(30, Math.max(0, parseInt(e.target.value) || 0))
            })
          }
          style={{
            flex: 1,
            background: '#2B2B3D',
            border: '1px solid #3A3A4C',
            borderRadius: 3,
            padding: '2px 4px',
            color: '#E0E0E0',
            fontSize: 11,
            outline: 'none',
            width: '100%'
          }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, color: '#8A8AAA', width: 20 }}>CD</span>
        <input
          type="number"
          min={0}
          max={3}
          value={skill.cooldown}
          onChange={(e) =>
            onChange({
              ...skill,
              cooldown: Math.min(3, Math.max(0, parseInt(e.target.value) || 0))
            })
          }
          style={{
            flex: 1,
            background: '#2B2B3D',
            border: '1px solid #3A3A4C',
            borderRadius: 3,
            padding: '2px 4px',
            color: '#E0E0E0',
            fontSize: 11,
            outline: 'none',
            width: '100%'
          }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, color: '#8A8AAA', width: 20 }}>值</span>
        <input
          type="number"
          min={0}
          max={200}
          value={skill.value}
          onChange={(e) =>
            onChange({
              ...skill,
              value: Math.min(200, Math.max(0, parseInt(e.target.value) || 0))
            })
          }
          style={{
            flex: 1,
            background: '#2B2B3D',
            border: '1px solid #3A3A4C',
            borderRadius: 3,
            padding: '2px 4px',
            color: '#E0E0E0',
            fontSize: 11,
            outline: 'none',
            width: '100%'
          }}
        />
      </div>
    </div>
  </div>
);

const HeroCard: React.FC<{
  hero: Unit;
  index: number;
  onChange: (h: Unit) => void;
  onRemove: () => void;
}> = ({ hero, index, onChange, onRemove }) => {
  const [expanded, setExpanded] = React.useState(index === 0);

  return (
    <div
      style={{
        background: '#2B2B3D',
        border: '1px solid #3A3A4C',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 10
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(162,155,254,0.08))'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C63FF, #A29BFE)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: '#FFF',
              flexShrink: 0
            }}
          >
            {hero.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#E0E0E0' }}>
              {hero.name}
            </div>
            <div style={{ fontSize: 11, color: '#8A8AAA' }}>
              {HERO_CLASS_LABELS[hero.class!]} | HP {hero.maxHp} | SPD {hero.spd}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            style={{
              background: 'rgba(255,68,68,0.15)',
              border: '1px solid rgba(255,68,68,0.3)',
              color: '#FF6666',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            删除
          </button>
          <span style={{ fontSize: 14, color: '#8A8AAA' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              value={hero.name}
              onChange={(e) => onChange({ ...hero, name: e.target.value })}
              placeholder="角色名称"
              style={{
                flex: 1,
                background: '#1E1E2E',
                border: '1px solid #3A3A4C',
                borderRadius: 4,
                padding: '5px 10px',
                color: '#E0E0E0',
                fontSize: 13,
                outline: 'none'
              }}
            />
            <select
              value={hero.class}
              onChange={(e) => {
                const klass = e.target.value as HeroClass;
                onChange(
                  createHero({
                    id: hero.id,
                    name: hero.name,
                    class: klass,
                    skills: hero.skills,
                    maxHp: hero.maxHp,
                    maxMp: hero.maxMp,
                    atk: hero.atk,
                    def: hero.def,
                    spd: hero.spd
                  })
                );
              }}
              style={{
                background: '#1E1E2E',
                border: '1px solid #3A3A4C',
                borderRadius: 4,
                padding: '5px 8px',
                color: '#E0E0E0',
                fontSize: 13,
                outline: 'none'
              }}
            >
              {Object.entries(HERO_CLASS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
            <div>
              <NumberInput label="生命" value={hero.maxHp} min={100} max={500} onChange={(v) => onChange({ ...hero, maxHp: v, hp: v })} />
              <NumberInput label="攻击" value={hero.atk} min={10} max={50} onChange={(v) => onChange({ ...hero, atk: v })} />
            </div>
            <div>
              <NumberInput label="防御" value={hero.def} min={5} max={30} onChange={(v) => onChange({ ...hero, def: v })} />
              <NumberInput label="速度" value={hero.spd} min={1} max={10} onChange={(v) => onChange({ ...hero, spd: v })} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#8A8AAA', marginBottom: 6, fontWeight: 600 }}>
            技能配置
          </div>
          {hero.skills.map((s, i) => (
            <SkillEditor
              key={s.id}
              skill={s}
              index={i}
              onChange={(ns) => {
                const skills = [...hero.skills];
                skills[i] = ns;
                onChange({ ...hero, skills });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EnemyCard: React.FC<{
  enemy: Unit;
  index: number;
  onChange: (e: Unit) => void;
  onRemove: () => void;
}> = ({ enemy, index, onChange, onRemove }) => (
  <div
    style={{
      background: '#2B2B3D',
      border: '1px solid #3A3A4C',
      borderRadius: 8,
      padding: 10,
      marginBottom: 8
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            color: '#FFF',
            flexShrink: 0
          }}
        >
          {enemy.name.charAt(0)}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#E0E0E0' }}>
            #{index + 1} {enemy.name}
          </div>
        </div>
      </div>
      <button
        onClick={onRemove}
        style={{
          background: 'rgba(255,68,68,0.15)',
          border: '1px solid rgba(255,68,68,0.3)',
          color: '#FF6666',
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 4,
          cursor: 'pointer'
        }}
      >
        移除
      </button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      <NumberInput label="HP" value={enemy.maxHp} min={30} max={1000} onChange={(v) => onChange({ ...enemy, maxHp: v, hp: v })} />
      <NumberInput label="ATK" value={enemy.atk} min={5} max={80} onChange={(v) => onChange({ ...enemy, atk: v })} />
      <NumberInput label="DEF" value={enemy.def} min={0} max={50} onChange={(v) => onChange({ ...enemy, def: v })} />
      <NumberInput label="SPD" value={enemy.spd} min={1} max={10} onChange={(v) => onChange({ ...enemy, spd: v })} />
    </div>
  </div>
);

const EditorPanel: React.FC<EditorPanelProps> = ({
  heroes,
  enemies,
  simulationCount,
  onHeroesChange,
  onEnemiesChange,
  onSimulationCountChange,
  collapsed,
  onToggleCollapse,
  isMobile
}) => {
  const addHero = () => {
    if (heroes.length >= 4) return;
    const classes: HeroClass[] = ['warrior', 'mage', 'assassin', 'priest'];
    const existingClasses = heroes.map((h) => h.class);
    const available = classes.find((c) => !existingClasses.includes(c)) || classes[heroes.length % 4];
    const names = ['英雄' + (heroes.length + 1), '战士', '法师', '刺客', '牧师'];
    const newHero = createHero({
      name: names[heroes.length] || '英雄' + (heroes.length + 1),
      class: available
    });
    onHeroesChange([...heroes, newHero]);
  };

  const updateHero = (index: number, hero: Unit) => {
    const arr = [...heroes];
    arr[index] = hero;
    onHeroesChange(arr);
  };

  const removeHero = (index: number) => {
    if (heroes.length <= 1) return;
    onHeroesChange(heroes.filter((_, i) => i !== index));
  };

  const addEnemy = (tpl: EnemyTemplate) => {
    if (enemies.length >= 5) return;
    onEnemiesChange([...enemies, createEnemy(tpl)]);
  };

  const updateEnemy = (index: number, enemy: Unit) => {
    const arr = [...enemies];
    arr[index] = enemy;
    onEnemiesChange(arr);
  };

  const removeEnemy = (index: number) => {
    if (enemies.length <= 1) return;
    onEnemiesChange(enemies.filter((_, i) => i !== index));
  };

  return (
    <div
      className={`editor-panel ${collapsed ? 'collapsed' : ''}`}
      style={{
        width: isMobile ? '320px' : collapsed ? 0 : '320px',
        flexShrink: 0,
        height: '100%',
        background: '#1A1A2A',
        borderRight: '1px solid #3A3A4C',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        position: isMobile ? 'fixed' : 'relative',
        left: 0,
        top: 0,
        zIndex: 50
      }}
    >
      <div
        style={{
          width: 320,
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid #3A3A4C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: '#E0E0E0' }}>
            ⚔ 阵容编辑
          </div>
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'transparent',
              border: '1px solid #3A3A4C',
              color: '#8A8AAA',
              fontSize: 12,
              padding: '3px 8px',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            {collapsed ? '›' : '‹ 收起'}
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#A29BFE' }}>
              英雄阵容 ({heroes.length}/4)
            </span>
            <button
              onClick={addHero}
              disabled={heroes.length >= 4}
              style={{
                background: heroes.length >= 4 ? '#2B2B3D' : 'linear-gradient(135deg, #6C63FF, #A29BFE)',
                border: 'none',
                color: heroes.length >= 4 ? '#6A6A8A' : '#FFF',
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 4,
                cursor: heroes.length >= 4 ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              + 添加英雄
            </button>
          </div>
          {heroes.map((h, i) => (
            <HeroCard key={h.id} hero={h} index={i} onChange={(nh) => updateHero(i, nh)} onRemove={() => removeHero(i)} />
          ))}

          <div style={{ height: 1, background: '#3A3A4C', margin: '14px 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#FF8E53' }}>
              敌方编队 ({enemies.length}/5)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
            {(Object.keys(ENEMY_TEMPLATE_LABELS) as EnemyTemplate[]).map((tpl) => (
              <button
                key={tpl}
                onClick={() => addEnemy(tpl)}
                disabled={enemies.length >= 5}
                style={{
                  background: enemies.length >= 5 ? '#2B2B3D' : 'linear-gradient(135deg, rgba(255,107,107,0.2), rgba(255,142,83,0.15))',
                  border: '1px solid #3A3A4C',
                  color: enemies.length >= 5 ? '#6A6A8A' : '#FFB0B0',
                  fontSize: 11,
                  padding: '6px 4px',
                  borderRadius: 6,
                  cursor: enemies.length >= 5 ? 'not-allowed' : 'pointer',
                  fontWeight: 500
                }}
              >
                + {ENEMY_TEMPLATE_LABELS[tpl]}
              </button>
            ))}
          </div>

          {enemies.map((e, i) => (
            <EnemyCard key={e.id} enemy={e} index={i} onChange={(ne) => updateEnemy(i, ne)} onRemove={() => removeEnemy(i)} />
          ))}

          <div style={{ height: 1, background: '#3A3A4C', margin: '14px 0' }} />

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#A0A0B8', marginBottom: 8 }}>
              模拟设置
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#8A8AAA', flexShrink: 0 }}>模拟次数</span>
              <input
                type="number"
                min={1}
                max={100}
                value={simulationCount}
                onChange={(e) =>
                  onSimulationCountChange(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))
                }
                style={{
                  flex: 1,
                  background: '#1E1E2E',
                  border: '1px solid #3A3A4C',
                  borderRadius: 4,
                  padding: '5px 10px',
                  color: '#E0E0E0',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: 11, color: '#6A6A8A' }}>次</span>
            </div>
          </div>

          <div style={{ height: 30 }} />
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;
