import { useAppStore } from '@/store/useAppStore';
import { ELEMENT_INFO, RARITY_INFO } from '@/scroll/types';

export default function ScrollDetail() {
  const selectedScrollId = useAppStore((s) => s.selectedScrollId);
  const scrolls = useAppStore((s) => s.scrolls);

  const scroll = scrolls.find((s) => s.id === selectedScrollId);

  if (!scroll) {
    return (
      <div className="scroll-detail scroll-detail-empty">
        <div className="scroll-detail-placeholder">
          <span className="placeholder-icon">📜</span>
          <p>选择一个卷轴查看详情</p>
        </div>
      </div>
    );
  }

  const elemInfo = ELEMENT_INFO[scroll.element];
  const rarityInfo = RARITY_INFO[scroll.rarity];

  const fusionPartners = scrolls.filter(
    (s) => s.obtained && s.id !== scroll.id
  );

  return (
    <div className="scroll-detail">
      <div className="scroll-detail-header" style={{ borderColor: elemInfo.color }}>
        <div className="detail-icon-large" style={{ textShadow: `0 0 20px ${elemInfo.color}` }}>
          {scroll.icon}
        </div>
        <h3 className="detail-name">{scroll.name}</h3>
        <div className="detail-badges">
          <span className="detail-element-badge" style={{ background: elemInfo.color, color: '#1a0b2e' }}>
            {elemInfo.icon} {elemInfo.label}
          </span>
          <span className="detail-rarity-badge" style={{ borderColor: rarityInfo.glowColor !== 'transparent' ? rarityInfo.glowColor : '#8b7355', color: rarityInfo.glowColor !== 'transparent' ? rarityInfo.glowColor : '#8b7355' }}>
            {rarityInfo.label}
          </span>
        </div>
      </div>

      <div className="detail-stats">
        <div className="detail-stat">
          <span className="stat-label">等级</span>
          <span className="stat-value">Lv.{scroll.level}</span>
        </div>
        <div className="detail-stat">
          <span className="stat-label">融合配方</span>
          <span className="stat-value">{scroll.fusionRecipe}</span>
        </div>
        <div className="detail-stat">
          <span className="stat-label">稀有度值</span>
          <span className="stat-value">{rarityInfo.value}/5</span>
        </div>
      </div>

      <div className="detail-fusion-partners">
        <h4 className="partners-title">可作为融合材料</h4>
        <div className="partners-list">
          {fusionPartners.slice(0, 6).map((partner) => {
            const pElem = ELEMENT_INFO[partner.element];
            const pRarity = RARITY_INFO[partner.rarity];
            return (
              <div key={partner.id} className="partner-chip" style={{ borderColor: pElem.color }}>
                <span>{partner.icon}</span>
                <span style={{ color: pRarity.glowColor !== 'transparent' ? pRarity.glowColor : '#8b7355' }}>
                  {partner.name}
                </span>
              </div>
            );
          })}
          {fusionPartners.length > 6 && (
            <div className="partner-chip partner-more">+{fusionPartners.length - 6}更多</div>
          )}
        </div>
      </div>
    </div>
  );
}
