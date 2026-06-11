import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Card, CardStatus, CheckItem } from '@/types';

const STORAGE_KEY = 'milestone_kanban_cards';

function loadCards(): Card[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Card[];
    }
  } catch {
    // ignore
  }
  return [];
}

function saveCards(cards: Card[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function useKanban() {
  const [cards, setCards] = useState<Card[]>(loadCards);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      saveCards(cards);
    }, 150);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [cards]);

  const addCard = useCallback((data: { title: string; date: string; assignee: string }) => {
    const now = new Date().toISOString();
    const newCard: Card = {
      id: uuidv4(),
      title: data.title,
      date: data.date,
      assignee: data.assignee,
      status: 'todo',
      checklist: [],
      order: Date.now(),
      createdAt: now,
      updatedAt: now,
    };
    setCards(prev => [...prev, newCard]);
  }, []);

  const updateCard = useCallback((id: string, data: Partial<Omit<Card, 'id' | 'createdAt'>>) => {
    setCards(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, ...data, updatedAt: new Date().toISOString() }
          : c
      )
    );
  }, []);

  const deleteCard = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  }, []);

  const moveCard = useCallback(
    (cardId: string, destStatus: CardStatus, destIndex: number) => {
      setCards(prev => {
        const card = prev.find(c => c.id === cardId);
        if (!card) return prev;

        const without = prev.filter(c => c.id !== cardId);
        const sameStatusCards = without.filter(c => c.status === destStatus);

        const reordered = [...sameStatusCards];
        const insertAt = Math.min(destIndex, reordered.length);
        reordered.splice(insertAt, 0, { ...card, status: destStatus, updatedAt: new Date().toISOString() });

        const otherCards = without.filter(c => c.status !== destStatus);
        return [...otherCards, ...reordered].map((c, i) => ({ ...c, order: i }));
      });
    },
    []
  );

  const reorderInColumn = useCallback(
    (_cardId: string, sourceIndex: number, destIndex: number, status: CardStatus) => {
      setCards(prev => {
        const columnCards = prev.filter(c => c.status === status);
        const otherCards = prev.filter(c => c.status !== status);

        const newColumn = [...columnCards];
        const [moved] = newColumn.splice(sourceIndex, 1);
        if (!moved) return prev;
        newColumn.splice(destIndex, 0, moved);

        return [...otherCards, ...newColumn].map((c, i) => ({ ...c, order: i }));
      });
    },
    []
  );

  const addCheckItem = useCallback((cardId: string, text: string) => {
    const item: CheckItem = { id: uuidv4(), text, done: false };
    setCards(prev =>
      prev.map(c =>
        c.id === cardId
          ? { ...c, checklist: [...c.checklist, item], updatedAt: new Date().toISOString() }
          : c
      )
    );
  }, []);

  const toggleCheckItem = useCallback((cardId: string, itemId: string) => {
    setCards(prev =>
      prev.map(c =>
        c.id === cardId
          ? {
              ...c,
              checklist: c.checklist.map(ci =>
                ci.id === itemId ? { ...ci, done: !ci.done } : ci
              ),
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  }, []);

  const removeCheckItem = useCallback((cardId: string, itemId: string) => {
    setCards(prev =>
      prev.map(c =>
        c.id === cardId
          ? {
              ...c,
              checklist: c.checklist.filter(ci => ci.id !== itemId),
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  }, []);

  return {
    cards,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    reorderInColumn,
    addCheckItem,
    toggleCheckItem,
    removeCheckItem,
  };
}
