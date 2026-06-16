import { useState, useEffect, useCallback, useRef } from 'react';
import { AuctionItem, Bid, BidPlacedEvent, AuctionEndedEvent, SortType, FilterStatus } from '../types';
import {
  connectSocket,
  disconnectSocket,
  getItems,
  getBids,
  placeBid as servicePlaceBid,
  onBidPlaced,
  offBidPlaced,
  onItemCreated,
  offItemCreated,
  onAuctionEnded,
  offAuctionEnded,
} from '../auctionService';

const NICKNAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery'];

function getRandomNickname(): string {
  return NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];
}

export function useAuction() {
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [bids, setBids] = useState<Map<string, Bid[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);
  const nicknameRef = useRef<string>(getRandomNickname());
  const bidsRef = useRef<Map<string, Bid[]>>(new Map());

  useEffect(() => {
    bidsRef.current = bids;
  }, [bids]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        connectSocket();
        const itemsData = await getItems();
        if (mounted) {
          setItems(itemsData);
          setLoading(false);
        }

        for (const item of itemsData) {
          try {
            const bidData = await getBids(item.id);
            if (mounted) {
              setBids((prev) => {
                const next = new Map(prev);
                next.set(item.id, bidData);
                return next;
              });
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (error) {
        console.error('Failed to load items:', error);
        if (mounted) setLoading(false);
      }
    }

    init();

    const handleBidPlaced = (event: BidPlacedEvent) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === event.itemId ? { ...item, currentPrice: event.amount } : item
        )
      );
      setBids((prev) => {
        const next = new Map(prev);
        const itemBids = next.get(event.itemId) || [];
        const newBid: Bid = {
          itemId: event.itemId,
          amount: event.amount,
          bidder: event.bidder,
          timestamp: event.timestamp,
        };
        next.set(event.itemId, [...itemBids, newBid]);
        return next;
      });
    };

    const handleItemCreated = (item: AuctionItem) => {
      setItems((prev) => [item, ...prev]);
      setBids((prev) => {
        const next = new Map(prev);
        next.set(item.id, []);
        return next;
      });
    };

    const handleAuctionEnded = (event: AuctionEndedEvent) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === event.itemId
            ? { ...item, status: 'completed', winner: event.winner, currentPrice: event.finalPrice }
            : item
        )
      );
    };

    onBidPlaced(handleBidPlaced);
    onItemCreated(handleItemCreated);
    onAuctionEnded(handleAuctionEnded);

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
      offBidPlaced(handleBidPlaced);
      offItemCreated(handleItemCreated);
      offAuctionEnded(handleAuctionEnded);
      disconnectSocket();
    };
  }, []);

  const placeBid = useCallback((itemId: string, amount: number) => {
    servicePlaceBid(itemId, amount, nicknameRef.current);
  }, []);

  const getItemBids = useCallback(
    (itemId: string): Bid[] => {
      return bids.get(itemId) || [];
    },
    [bids]
  );

  const sortItems = useCallback(
    (items: AuctionItem[], sortType: SortType): AuctionItem[] => {
      const sorted = [...items];
      switch (sortType) {
        case 'latest':
          return sorted.sort((a, b) => b.startTime - a.startTime);
        case 'endingSoon':
          return sorted.sort((a, b) => a.endTime - b.endTime);
        case 'priceHigh':
          return sorted.sort((a, b) => b.currentPrice - a.currentPrice);
        default:
          return sorted;
      }
    },
    []
  );

  const filterItems = useCallback(
    (items: AuctionItem[], status: FilterStatus): AuctionItem[] => {
      switch (status) {
        case 'active':
          return items.filter((i) => i.status === 'active');
        case 'completed':
          return items.filter((i) => i.status === 'completed');
        default:
          return items;
      }
    },
    []
  );

  return {
    items,
    loading,
    placeBid,
    getItemBids,
    sortItems,
    filterItems,
    nickname: nicknameRef.current,
  };
}
