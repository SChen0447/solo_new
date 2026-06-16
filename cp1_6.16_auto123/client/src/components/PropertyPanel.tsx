import { useState, useEffect, useCallback } from 'react';
import { SkillNode, SkillType, EffectType, SKILL_COLORS, EFFECT_LABELS } from '../types';

interface PropertyPanelProps {
  node: SkillNode | null;
  onUpdate: (nodeId: string, updates: Partial<SkillNode>) => void;
}

const TYPE_LABELS: Record<SkillType, string> = {
  passive: '基础被动',
  active: '主动技能',
  ultimate: '终极天赋',
};

const EFFECT_TYPES: EffectType[] = ['damage', 'defense', 'heal', 'buff'];

function PropertyPanel({ node, onUpdate }: PropertyPanelProps) {
  const [glowingFields, setGlowingFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    setGlowingFields(new Set());
  }, [node?.id]);

  const triggerGlow = useCallback((field: string) => {
    setGlowingFields(prev => {
      const next = new Set(prev);
      next.add(field);
      return next;
    });
    setTimeout(() => {
      setGlowingFields(prev => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
    }, 200);
  }, []);

  const handleChange = useCallback((field: keyof SkillNode, value: string | number) => {
    if (!node) return;
    triggerGlow(field);
    
    let parsedValue: any = value;
    if (field === 'maxLevel' || field === 'currentLevel' || field === 'costPerLevel') {
      parsedValue = parseInt(value as string) || 1;
    } else if (field === 'baseEffect' || field === 'growthPerLevel') {
      parsedValue = parseFloat(value as string) || 0;
    }

    onUpdate(node.id, { [field]: parsedValue });
  }, [node, onUpdate, triggerGlow]);

  if (!node) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#666',
        fontSize: 13,
        textAlign: 'center',
        padding: 20,
      }}>
        <div>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>⚙</div>
          <div>点击技能节点查看属性</div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#555' }}>
            双击画布空白处创建新节点
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="property-form">
      <div style={{ marginBottom: 8 }}>
        <span className={`type-badge ${node.type}`}>
          {TYPE_LABELS[node.type]}
        </span>
      </div>

      <div className="form-group">
        <label className="form-label">技能名称</label>
        <input
          type="text"
          className={`form-input ${glowingFields.has('name') ? 'glow' : ''}`}
          value={node.name}
          onChange={(e) => handleChange('name', e.target.value.slice(0, 20))}
          maxLength={20}
        />
        <div style={{ fontSize: 11, color: '#666', textAlign: 'right' }}>
          {node.name.length}/20
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">技能描述</label>
        <textarea
          className={`form-textarea ${glowingFields.has('description') ? 'glow' : ''}`}
          value={node.description}
          onChange={(e) => handleChange('description', e.target.value.slice(0, 200))}
          maxLength={200}
          rows={4}
        />
        <div style={{ fontSize: 11, color: '#666', textAlign: 'right' }}>
          {node.description.length}/200
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">技能类型</label>
        <select
          className={`form-select ${glowingFields.has('type') ? 'glow' : ''}`}
          value={node.type}
          onChange={(e) => handleChange('type', e.target.value as SkillType)}
          style={{ color: SKILL_COLORS[node.type as SkillType] }}
        >
          <option value="passive">基础被动</option>
          <option value="active">主动技能</option>
          <option value="ultimate">终极天赋</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">等级上限</label>
          <input
            type="number"
            className={`form-input ${glowingFields.has('maxLevel') ? 'glow' : ''}`}
            value={node.maxLevel}
            onChange={(e) => {
              let val = parseInt(e.target.value) || 1;
              val = Math.max(1, Math.min(10, val));
              handleChange('maxLevel', val);
            }}
            min={1}
            max={10}
          />
        </div>
        <div className="form-group">
          <label className="form-label">每级消耗</label>
          <input
            type="number"
            className={`form-input ${glowingFields.has('costPerLevel') ? 'glow' : ''}`}
            value={node.costPerLevel}
            onChange={(e) => {
              let val = parseInt(e.target.value) || 1;
              val = Math.max(1, Math.min(5, val));
              handleChange('costPerLevel', val);
            }}
            min={1}
            max={5}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">效果类型</label>
        <select
          className={`form-select ${glowingFields.has('effectType') ? 'glow' : ''}`}
          value={node.effectType}
          onChange={(e) => handleChange('effectType', e.target.value as EffectType)}
        >
          {EFFECT_TYPES.map(type => (
            <option key={type} value={type}>
              {EFFECT_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">基础效果值</label>
          <input
            type="number"
            step="0.1"
            className={`form-input ${glowingFields.has('baseEffect') ? 'glow' : ''}`}
            value={node.baseEffect}
            onChange={(e) => handleChange('baseEffect', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">每级成长</label>
          <input
            type="number"
            step="0.1"
            className={`form-input ${glowingFields.has('growthPerLevel') ? 'glow' : ''}`}
            value={node.growthPerLevel}
            onChange={(e) => handleChange('growthPerLevel', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">当前等级</label>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 10,
          background: '#252538',
          padding: '8px 12px',
          borderRadius: 4,
        }}>
          <div style={{ flex: 1, height: 8, background: '#3A3A50', borderRadius: 4, overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${(node.currentLevel / node.maxLevel) * 100}%`,
                background: `linear-gradient(90deg, #42A5F5, #AB47BC)`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{ color: '#42A5F5', fontWeight: 'bold', fontSize: 14, minWidth: 50, textAlign: 'right' }}>
            {node.currentLevel}/{node.maxLevel}
          </span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">总消耗点数</label>
        <div style={{ 
          background: '#252538',
          padding: '8px 12px',
          borderRadius: 4,
          fontSize: 14,
          color: '#FFA726',
          fontWeight: 'bold',
        }}>
          {node.currentLevel * node.costPerLevel} 点
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">当前效果值</label>
        <div style={{ 
          background: '#252538',
          padding: '12px',
          borderRadius: 4,
          fontSize: 16,
          color: '#66BB6A',
          fontWeight: 'bold',
        }}>
          {(node.baseEffect + node.growthPerLevel * node.currentLevel).toFixed(1)}
          <span style={{ fontSize: 12, color: '#666', marginLeft: 6, fontWeight: 'normal' }}>
            ({EFFECT_LABELS[node.effectType]})
          </span>
        </div>
      </div>
    </div>
  );
}

export default PropertyPanel;
