import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Transaction, CATEGORY_COLORS } from '../types';

const ITEM_HEIGHT = 60;
const VISIBLE_COUNT = 15;
const VIRTUAL_THRESHOLD = 30;
const BUFFER = 3;

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#16213e',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    fontSize: '16px',
    fontWeight: 600,
    color: '#e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  count: {
    fontSize: '13px',
    color: '#888',
    fontWeight: 'normal'
  },
  list: {
    maxHeight: `${VISIBLE_COUNT * ITEM_HEIGHT}px`,
    overflowY: 'auto' as const,
    scrollBehavior: 'smooth'
  },
  virtualList: {
    position: 'relative' as const,
    height: '100%',
    overflow: 'auto' as const
  },
  spacer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: -1
  },
  itemsContainer: {
    position: 'relative' as const
  },
  item: {
    height: ITEM_HEIGHT,
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    transition: 'background-color 0.15s'
  },
  itemHover: {
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  categoryTag: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#1a1a2e',
    whiteSpace: 'nowrap' as const
  },
  date: {
    fontSize: '13px',
    color: '#888',
    minWidth: '90px'
  },
  note: {
    flex: 1,
    fontSize: '14px',
    color: '#c0c0c0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const
  },
  amount: {
    fontSize: '15px',
    fontWeight: 600,
    minWidth: '100px',
    textAlign: 'right' as const
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    color: '#888',
    fontSize: '14px'
  }
};

interface TransactionListProps {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: TransactionListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const useVirtual = transactions.length > VIRTUAL_THRESHOLD;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const visibleItems = useMemo(() => {
    if (!useVirtual) {
      return transactions.map((tx, index) => ({ tx, index }));
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
    const endIndex = Math.min(
      transactions.length,
      startIndex + VISIBLE_COUNT + BUFFER * 2
    );

    const items: { tx: Transaction; index: number }[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      items.push({ tx: transactions[i], index: i });
    }
    return items;
  }, [transactions, scrollTop, useVirtual]);

  const totalHeight = useVirtual ? transactions.length * ITEM_HEIGHT : undefined;
  const offsetY = useVirtual
    ? Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER) * ITEM_HEIGHT
    : 0;

  if (transactions.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          交易记录
          <span style={styles.count}>0 条</span>
        </div>
        <div style={styles.empty}>暂无交易记录</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        交易记录
        <span style={styles.count}>{transactions.length} 条</span>
      </div>
      <div
        ref={containerRef}
        style={{
          ...(useVirtual ? styles.virtualList : styles.list),
          height: useVirtual ? VISIBLE_COUNT * ITEM_HEIGHT : undefined,
          maxHeight: useVirtual ? undefined : VISIBLE_COUNT * ITEM_HEIGHT
        }}
        onScroll={handleScroll}
      >
        {useVirtual && (
          <div style={{ ...styles.spacer, height: totalHeight }} />
        )}
        <div
          style={{
            ...styles.itemsContainer,
            transform: useVirtual ? `translateY(${offsetY}px)` : undefined
          }}
        >
          {visibleItems.map(({ tx, index }) => (
            <div
              key={tx.id}
              style={{
                ...styles.item,
                ...(hoveredId === tx.id ? styles.itemHover : {}),
                position: useVirtual ? 'absolute' : 'relative',
                top: useVirtual ? 0 : undefined,
                left: useVirtual ? 0 : undefined,
                right: useVirtual ? 0 : undefined,
                transform: useVirtual ? `translateY(${index * ITEM_HEIGHT - offsetY}px)` : undefined
              }}
              onMouseEnter={() => setHoveredId(tx.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span style={styles.date}>{tx.date}</span>
              <span
                style={{
                  ...styles.categoryTag,
                  backgroundColor: CATEGORY_COLORS[tx.category]
                }}
              >
                {tx.category}
              </span>
              <span style={styles.note} title={tx.note}>
                {tx.note || '-'}
              </span>
              <span
                style={{
                  ...styles.amount,
                  color: tx.amount >= 0 ? '#2ecc71' : '#e94560'
                }}
              >
                {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
