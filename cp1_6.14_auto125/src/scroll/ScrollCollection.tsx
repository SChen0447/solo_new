import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { ScrollData, Element } from '@/scroll/types';
import { ELEMENT_INFO, RARITY_INFO, ELEMENT_ORDER } from '@/scroll/types';

interface DragData {
  scroll: ScrollData;
}

function ScrollCard({ scroll, onSelect }: { scroll: ScrollData; onSelect: (id: string) => void }) {
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/scroll', JSON.stringify({ scroll }));
    e.dataTransfer.effectAllowed = 'move';
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  }, [scroll]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
  }, []);

  const rarityInfo = RARITY_INFO[scroll.rarity];
  const elemInfo = ELEMENT_INFO[scroll.element];

  if (!scroll.obtained) {
    return (
      <div className="scroll-card scroll-card-locked">
        <div className="scroll-card-icon-locked">?</div>
        <div className="scroll-card-name-locked">未获得</div>
        <div className="scroll-card-rarity-locked">{rarityInfo.label}</div>
      </div>
    );
  }

  return (
    <div
      className={`scroll-card scroll-card-obtained ${rarityInfo.glowClass}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onSelect(scroll.id)}
      style={{ '--glow-color': rarityInfo.glowColor, '--element-color': elemInfo.color } as React.CSSProperties}
    >
      <div className="scroll-card-element-badge" style={{ background: elemInfo.color }}>
        {elemInfo.icon}
      </div>
      <div className="scroll-card-icon">{scroll.icon}</div>
      <div className="scroll-card-name">{scroll.name}</div>
      <div className="scroll-card-rarity" style={{ color: rarityInfo.glowColor !== 'transparent' ? rarityInfo.glowColor : '#8b7355' }}>
        {rarityInfo.label}
      </div>
      <div className="scroll-card-level">Lv.{scroll.level}</div>
    </div>
  );
}

export default function ScrollCollection() {
  const scrolls = useAppStore((s) => s.scrolls);
  const selectScroll = useAppStore((s) => s.selectScroll);

  const scrollsByElement = ELEMENT_ORDER.map((element) => ({
    element,
    label: ELEMENT_INFO[element].label,
    icon: ELEMENT_INFO[element].icon,
    color: ELEMENT_INFO[element].color,
    scrolls: scrolls.filter((s) => s.element === element),
  }));

  return (
    <div className="scroll-collection">
      <h2 className="scroll-collection-title">
        <span className="title-rune">📜</span> 卷轴图鉴 <span className="title-rune">📜</span>
      </h2>
      <div className="scroll-collection-groups">
        {scrollsByElement.map((group) => (
          <div key={group.element} className="scroll-element-group">
            <div className="element-group-header" style={{ borderColor: group.color }}>
              <span className="element-icon">{group.icon}</span>
              <span className="element-label" style={{ color: group.color }}>{group.label}</span>
              <span className="element-count">
                {group.scrolls.filter(s => s.obtained).length}/{group.scrolls.length}
              </span>
            </div>
            <div className="scroll-grid">
              {group.scrolls.map((scroll) => (
                <ScrollCard key={scroll.id} scroll={scroll} onSelect={selectScroll} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
