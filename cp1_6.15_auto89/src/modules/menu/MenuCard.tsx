import React, { useRef, useEffect } from 'react';
import { MenuItem, TimeSlot, themeColors } from '../../store';

interface MenuCardProps {
  item: MenuItem;
  timeSlot: TimeSlot;
  onClick: () => void;
  index: number;
}

const MenuCard: React.FC<MenuCardProps> = React.memo(({ item, timeSlot, onClick, index }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const prevPos = useRef<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();

    if (prevPos.current) {
      const deltaX = prevPos.current.left - rect.left;
      const deltaY = prevPos.current.top - rect.top;

      if (deltaX !== 0 || deltaY !== 0) {
        cardRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        cardRef.current.style.transition = 'transform 0s';

        requestAnimationFrame(() => {
          if (cardRef.current) {
            cardRef.current.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s ease-in-out';
            cardRef.current.style.transform = '';
          }
        });
      }
    }

    prevPos.current = { top: rect.top, left: rect.left };
  }, [index]);

  const colors = themeColors[timeSlot];
  const isSoldOut = item.stock <= 0;
  const currentPrice = item.prices[timeSlot];
  const isAvailable = currentPrice > 0;

  return (
    <div
      ref={cardRef}
      onClick={() => !isSoldOut && isAvailable && onClick()}
      style={{
        width: 220,
        height: 300,
        borderRadius: 12,
        backgroundColor: colors.cardBg,
        position: 'relative',
        overflow: 'hidden',
        cursor: isSoldOut || !isAvailable ? 'not-allowed' : 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s ease-in-out',
        willChange: 'transform',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        if (!isSoldOut && isAvailable) {
          e.currentTarget.style.transform = 'translateY(-8px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      }}
    >
      <div
        style={{
          width: '100%',
          height: 160,
          overflow: 'hidden'
        }}
      >
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjIwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjZTBlMGUwIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+5Zu+54mH5LqG5pWw5o2uPC90ZXh0Pjwvc3ZnPg==';
          }}
        />
      </div>

      <div style={{ padding: '12px 14px', position: 'relative', height: 140, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#212121',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                margin: 0
              }}
            >
              {item.name}
            </h3>
            {item.recommended && !isSoldOut && (
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 4,
                  backgroundColor: '#ff9800',
                  color: '#fff',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
              >
                推荐
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: 12,
              color: '#757575',
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              margin: 0
            }}
          >
            {item.description}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div>
            {isAvailable ? (
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: colors.priceColor,
                  transition: 'color 0.5s ease-in-out'
                }}
              >
                ¥{currentPrice}
              </span>
            ) : (
              <span style={{ fontSize: 13, color: '#bdbdbd' }}>本时段不供应</span>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: 12,
                color: item.stock <= 3 ? '#f44336' : '#616161',
                fontWeight: 500
              }}
            >
              库存: {item.stock}
            </span>
          </div>
        </div>
      </div>

      {isSoldOut && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#ff1744',
              backgroundColor: '#fff',
              padding: '8px 20px',
              borderRadius: 20,
              letterSpacing: 2
            }}
          >
            售 罄
          </span>
        </div>
      )}
    </div>
  );
});

MenuCard.displayName = 'MenuCard';

export default MenuCard;
