import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useMenuStore, TimeSlot, themeColors, MenuItem } from '../../store';
import MenuCard from './MenuCard';

const slotNames: Record<TimeSlot, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐'
};

const MenuBoard: React.FC = () => {
  const {
    menuItems,
    currentTimeSlot,
    selectedItem,
    setSelectedItem,
    createOrder,
    isLoading
  } = useMenuStore();

  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const colors = themeColors[currentTimeSlot];

  const sortedItems = useMemo(() => {
    return [...menuItems].sort((a, b) => {
      const aHasStock = a.stock > 0 ? 1 : 0;
      const bHasStock = b.stock > 0 ? 1 : 0;
      if (aHasStock !== bHasStock) return bHasStock - aHasStock;
      if (a.stock > 0 && b.stock > 0) {
        if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
      }
      return 0;
    });
  }, [menuItems]);

  useEffect(() => {
    if (selectedItem) {
      setPanelVisible(true);
      setOrderQuantity(1);
      setOrderSuccess(false);
    } else {
      setPanelVisible(false);
    }
  }, [selectedItem]);

  const handleCardClick = (item: MenuItem) => {
    setSelectedItem(item);
  };

  const handleClosePanel = () => {
    setPanelVisible(false);
    setTimeout(() => setSelectedItem(null), 300);
  };

  const handleSubmitOrder = async () => {
    if (!selectedItem) return;
    try {
      await createOrder([{ id: selectedItem.id, quantity: orderQuantity }]);
      setOrderSuccess(true);
      setTimeout(() => {
        handleClosePanel();
      }, 1500);
    } catch (e) {
      // 错误已在 store 中处理
    }
  };

  const currentTimePrice = selectedItem ? selectedItem.prices[currentTimeSlot] : 0;
  const timeSlots: TimeSlot[] = ['breakfast', 'lunch', 'dinner'];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.bg,
        transition: 'background-color 0.5s ease-in-out',
        paddingBottom: 40
      }}
    >
      <header
        style={{
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          borderBottom: `1px solid ${colors.primary}40`,
          backgroundColor: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#212121',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <span>🍽️ 智能菜单看板</span>
          </h1>
          <p style={{ fontSize: 13, color: '#757575', marginTop: 4 }}>
            实时库存 · 动态定价 · 智能推荐
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {timeSlots.map((slot) => (
            <div
              key={slot}
              style={{
                padding: '8px 18px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: currentTimeSlot === slot ? 700 : 500,
                backgroundColor: currentTimeSlot === slot ? colors.primary : 'transparent',
                color: currentTimeSlot === slot ? '#fff' : '#616161',
                transition: 'all 0.3s ease-in-out',
                border: currentTimeSlot === slot ? 'none' : '1px solid #e0e0e0'
              }}
            >
              {slotNames[slot]}
            </div>
          ))}
        </div>
      </header>

      {isLoading && menuItems.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            fontSize: 16,
            color: '#757575'
          }}
        >
          正在加载菜单...
        </div>
      ) : (
        <main style={{ padding: '32px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, 220px)',
              gap: 24,
              justifyContent: 'center',
              maxWidth: 1440,
              margin: '0 auto',
              minHeight: 400
            }}
          >
            {sortedItems.map((item, index) => (
              <MenuCard
                key={item.id}
                item={item}
                timeSlot={currentTimeSlot}
                onClick={() => handleCardClick(item)}
                index={index}
              />
            ))}
          </div>
          {sortedItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: 80, color: '#9e9e9e' }}>
              暂无菜品
            </div>
          )}
        </main>
      )}

      {selectedItem && (
        <>
          <div
            onClick={handleClosePanel}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 200,
              opacity: panelVisible ? 1 : 0,
              transition: 'opacity 0.3s ease-out',
              pointerEvents: panelVisible ? 'auto' : 'none'
            }}
          />
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 360,
              maxWidth: '100vw',
              height: '100vh',
              backgroundColor: '#ffffff',
              zIndex: 300,
              boxShadow: '-8px 0 24px rgba(0,0,0,0.15)',
              transform: panelVisible ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.3s ease-out',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {orderSuccess ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16
                }}
              >
                <div style={{ fontSize: 48 }}>✅</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#00c853' }}>
                  下单成功！
                </div>
                <div style={{ fontSize: 14, color: '#757575' }}>
                  订单已提交至后厨
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    position: 'relative',
                    maxHeight: 240,
                    overflow: 'hidden'
                  }}
                >
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.name}
                    style={{
                      width: '100%',
                      maxHeight: 240,
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjZTBlMGUwIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiI+5Zu+54mH5LqG5pWw5o2uPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                  <button
                    onClick={handleClosePanel}
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: '#fff',
                      fontSize: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.2s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.7)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)';
                    }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
                  <h2
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: '#212121',
                      margin: '0 0 12px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    {selectedItem.name}
                    {selectedItem.recommended && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 4,
                          backgroundColor: '#ff9800',
                          color: '#fff',
                          fontWeight: 600
                        }}
                      >
                        推荐
                      </span>
                    )}
                  </h2>

                  <p
                    style={{
                      fontSize: 14,
                      color: '#616161',
                      lineHeight: 1.6,
                      marginBottom: 20
                    }}
                  >
                    {selectedItem.description}
                  </p>

                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#9e9e9e',
                        marginBottom: 10,
                        fontWeight: 500
                      }}
                    >
                      时段价格
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {timeSlots.map((slot) => {
                        const isCurrent = slot === currentTimeSlot;
                        const price = selectedItem.prices[slot];
                        return (
                          <div
                            key={slot}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 14px',
                              borderRadius: 8,
                              backgroundColor: isCurrent ? '#e3f2fd' : '#fafafa',
                              border: isCurrent ? '1px solid #bbdefb' : '1px solid #f0f0f0',
                              transition: 'all 0.2s ease-in-out'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14, color: '#424242' }}>
                                {slotNames[slot]}
                              </span>
                              {isCurrent && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    backgroundColor: '#2979ff',
                                    color: '#fff',
                                    fontWeight: 600
                                  }}
                                >
                                  当前价
                                </span>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: 16,
                                fontWeight: isCurrent ? 700 : 500,
                                color: isCurrent ? '#2979ff' : price > 0 ? '#616161' : '#bdbdbd'
                              }}
                            >
                              {price > 0 ? `¥${price}` : '不供应'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#9e9e9e',
                        marginBottom: 10,
                        fontWeight: 500
                      }}
                    >
                      当前库存
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: selectedItem.stock <= 3 ? '#f44336' : '#424242'
                      }}
                    >
                      {selectedItem.stock} 份
                    </div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#9e9e9e',
                        marginBottom: 10,
                        fontWeight: 500
                      }}
                    >
                      下单数量
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button
                        onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: '#f5f5f5',
                          fontSize: 18,
                          fontWeight: 600,
                          color: '#424242',
                          transition: 'background-color 0.2s ease-in-out'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#eeeeee';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f5f5f5';
                        }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={selectedItem.stock}
                        value={orderQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setOrderQuantity(Math.min(selectedItem.stock, Math.max(1, val)));
                          }
                        }}
                        style={{
                          width: 60,
                          height: 36,
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderRadius: 8,
                          fontSize: 16,
                          fontWeight: 600
                        }}
                      />
                      <button
                        onClick={() =>
                          setOrderQuantity((q) => Math.min(selectedItem.stock, q + 1))
                        }
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: '#f5f5f5',
                          fontSize: 18,
                          fontWeight: 600,
                          color: '#424242',
                          transition: 'background-color 0.2s ease-in-out'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#eeeeee';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f5f5f5';
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px 24px 24px',
                    borderTop: '1px solid #f0f0f0',
                    backgroundColor: '#fff'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16
                    }}
                  >
                    <span style={{ fontSize: 14, color: '#757575' }}>合计金额</span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#ff6f00' }}>
                      ¥{currentTimePrice * orderQuantity}
                    </span>
                  </div>
                  <button
                    onClick={handleSubmitOrder}
                    disabled={isLoading || currentTimePrice <= 0 || selectedItem.stock <= 0}
                    style={{
                      width: '100%',
                      maxWidth: 180,
                      height: 48,
                      display: 'block',
                      margin: '0 auto',
                      backgroundColor: '#ff6f00',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 700,
                      borderRadius: 24,
                      transition: 'background-color 0.2s ease-in-out',
                      opacity: isLoading || currentTimePrice <= 0 || selectedItem.stock <= 0 ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = '#e65100';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = '#ff6f00';
                      }
                    }}
                  >
                    {isLoading ? '处理中...' : '立即下单'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MenuBoard;
