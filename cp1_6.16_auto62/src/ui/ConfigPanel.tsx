import { useState } from 'react';
import { useDataStore } from '../game/dataStore';
import type { Character, CharacterTemplate } from '../game/types';

export default function ConfigPanel() {
  const {
    selectedCharacters,
    availableClasses,
    selectCharacter,
    removeCharacter,
    allocateSkillPoint,
    resetSkillPoints,
    getRemainingPoints,
    isSimulating,
  } = useDataStore();

  const [expandedCharacterId, setExpandedCharacterId] = useState<string | null>(null);
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);

  const validCharacters = selectedCharacters.filter(
    (c): c is Character => c !== undefined && c !== null
  );

  const handleSlotClick = (slotIndex: number) => {
    if (isSimulating) return;
    
    const char = selectedCharacters[slotIndex];
    if (char) {
      setExpandedCharacterId(expandedCharacterId === char.id ? null : char.id);
    } else {
      setSelectingSlot(selectingSlot === slotIndex ? null : slotIndex);
    }
  };

  const handleClassSelect = (template: CharacterTemplate, slotIndex: number) => {
    if (isSimulating) return;
    
    const alreadySelected = validCharacters.some(
      (c) => c.template.class === template.class
    );
    if (alreadySelected) return;

    selectCharacter(template, slotIndex);
    setSelectingSlot(null);
  };

  const handleRemoveCharacter = (e: React.MouseEvent, slotIndex: number) => {
    e.stopPropagation();
    if (isSimulating) return;
    
    removeCharacter(slotIndex);
    if (selectedCharacters[slotIndex]?.id === expandedCharacterId) {
      setExpandedCharacterId(null);
    }
  };

  const handleSkillLevelChange = (
    characterId: string,
    skillId: string,
    newLevel: number
  ) => {
    if (isSimulating) return;
    
    const char = selectedCharacters.find((c) => c?.id === characterId);
    if (!char) return;

    const allocation = char.skillAllocations.find((a) => a.skillId === skillId);
    const currentLevel = allocation?.level || 0;
    
    if (newLevel > currentLevel) {
      const pointsToAdd = newLevel - currentLevel;
      allocateSkillPoint(characterId, skillId, pointsToAdd);
    } else if (newLevel < currentLevel) {
      resetSkillPoints(characterId);
      char.skillAllocations.forEach((alloc) => {
        if (alloc.skillId !== skillId && alloc.level > 0) {
          allocateSkillPoint(characterId, alloc.skillId, alloc.level);
        }
      });
      if (newLevel > 0) {
        allocateSkillPoint(characterId, skillId, newLevel);
      }
    }
  };

  const handleResetPoints = (e: React.MouseEvent, characterId: string) => {
    e.stopPropagation();
    if (isSimulating) return;
    resetSkillPoints(characterId);
  };

  const getSkillStatus = (remainingPoints: number, currentLevel: number) => {
    if (currentLevel > 0) return 'skill-allocated';
    if (remainingPoints > 0) return 'skill-available';
    return 'skill-unavailable';
  };

  const renderCharacterSlots = () => {
    const slots = [];
    for (let i = 0; i < 4; i++) {
      const char = selectedCharacters[i];
      
      if (!char) {
        slots.push(
          <div key={i}>
            <div
              className="empty-slot"
              onClick={() => handleSlotClick(i)}
            >
              {selectingSlot === i ? '选择职业...' : `+ 添加角色 ${i + 1}`}
            </div>
            
            {selectingSlot === i && (
              <div className="card" style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '14px', marginBottom: '8px', color: '#aaa' }}>
                  选择职业：
                </div>
                <div className="class-selector">
                  {availableClasses.map((cls) => {
                    const isSelected = validCharacters.some(
                      (c) => c.template.class === cls.class
                    );
                    return (
                      <div
                        key={cls.class}
                        className={`class-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => !isSelected && handleClassSelect(cls, i)}
                        style={{
                          opacity: isSelected ? 0.5 : 1,
                          cursor: isSelected ? 'not-allowed' : 'pointer',
                          borderColor: cls.color,
                        }}
                      >
                        <div className="class-option-emoji">{cls.emoji}</div>
                        <div
                          className="class-option-name"
                          style={{ color: cls.color }}
                        >
                          {cls.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      } else {
        const remainingPoints = getRemainingPoints(char.id);
        const isExpanded = expandedCharacterId === char.id;
        const usedPoints = char.skillAllocations.reduce(
          (sum, alloc) => sum + alloc.level,
          0
        );

        slots.push(
          <div key={char.id}>
            <div
              className="character-card"
              onClick={() => handleSlotClick(i)}
              style={{ borderColor: char.template.color }}
            >
              <div className="character-header">
                <div className="character-emoji">{char.template.emoji}</div>
                <div className="character-info">
                  <div
                    className="character-name"
                    style={{ color: char.template.color }}
                  >
                    {char.template.name}
                  </div>
                  <div className="character-stats">
                    ❤️{char.template.baseHp} ⚔️{char.template.baseAttack} 🛡️
                    {char.template.baseDefense} ⚡{char.template.baseSpeed}
                  </div>
                </div>
                <div className="points-info">
                  {usedPoints}/20
                </div>
                <button
                  className="remove-btn"
                  onClick={(e) => handleRemoveCharacter(e, i)}
                  title="移除角色"
                >
                  ✕
                </button>
              </div>

              <div className={`skill-list ${isExpanded ? 'expanded' : ''}`}>
                <div className="skill-list-inner">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: '#aaa',
                      marginBottom: '4px',
                    }}
                  >
                    <span>剩余技能点: <span style={{ color: '#FFD700', fontWeight: '600' }}>{remainingPoints}</span></span>
                    <button
                      onClick={(e) => handleResetPoints(e, char.id)}
                      style={{
                        background: 'none',
                        border: '1px solid #e94560',
                        color: '#e94560',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      重置
                    </button>
                  </div>

                  {char.template.skills.map((skill) => {
                    const allocation = char.skillAllocations.find(
                      (a) => a.skillId === skill.id
                    );
                    const currentLevel = allocation?.level || 0;
                    const status = getSkillStatus(remainingPoints, currentLevel);

                    return (
                      <div key={skill.id} className="skill-item">
                        <div className="skill-header">
                          <span className={`skill-name ${status}`}>
                            {skill.name}
                          </span>
                          <span
                            className={`skill-type ${skill.type === 'passive' ? 'passive' : ''}`}
                          >
                            {skill.type === 'active' ? '主动' : '被动'}
                          </span>
                        </div>
                        <div className="skill-desc">
                          {skill.description}
                          {skill.cooldown > 0 && ` (冷却: ${skill.cooldown}回合)`}
                        </div>
                        <div className="skill-level">
                          <input
                            type="range"
                            min="0"
                            max="5"
                            value={currentLevel}
                            onChange={(e) =>
                              handleSkillLevelChange(
                                char.id,
                                skill.id,
                                parseInt(e.target.value)
                              )
                            }
                            className="slider"
                            disabled={isSimulating}
                          />
                          <span className="skill-level-text">
                            Lv.{currentLevel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      }
    }
    return slots;
  };

  return (
    <>
      <h2 className="panel-title">👥 队伍配置</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {renderCharacterSlots()}
      </div>
      
      <div className="card" style={{ marginTop: 'auto' }}>
        <div style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.6' }}>
          <div style={{ marginBottom: '8px', color: '#e94560', fontWeight: '600' }}>
            💡 配置说明：
          </div>
          <div>• 从6个职业中选择最多4名角色</div>
          <div>• 每个角色可分配20个技能点</div>
          <div>• 技能等级1-5级，每级+10%效果</div>
          <div>• 被动技能永久提升属性</div>
          <div>• 主动技能有冷却时间</div>
        </div>
      </div>
    </>
  );
}
