import { useState, useEffect, useCallback } from 'react';
import type { Requirement, ParseResult } from '../types';
import { renumberRequirements } from './useParseEngine';

export function checkCircularDependencies(requirements: Requirement[]): Requirement[] {
  const idToReq = new Map(requirements.map(r => [r.id, r]));
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const circularIds = new Set<string>();

  function dfs(id: string): boolean {
    visited.add(id);
    recursionStack.add(id);
    const req = idToReq.get(id);
    if (!req) return false;

    for (const depId of req.dependencies) {
      if (!idToReq.has(depId)) continue;
      if (!visited.has(depId)) {
        if (dfs(depId)) {
          circularIds.add(id);
          return true;
        }
      } else if (recursionStack.has(depId)) {
        circularIds.add(id);
        circularIds.add(depId);
        return true;
      }
    }
    recursionStack.delete(id);
    return false;
  }

  for (const req of requirements) {
    if (!visited.has(req.id)) {
      dfs(req.id);
    }
  }

  return requirements.filter(r => circularIds.has(r.id));
}

const STORAGE_KEYS = {
  REQUIREMENTS: 'rqg_requirements',
  HISTORY: 'rqg_history',
  BACKUP: 'rqg_backup'
};

const MAX_HISTORY = 10;

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('localStorage写入失败:', err);
  }
}

export function useLocalStorage() {
  const [requirements, setRequirementsState] = useState<Requirement[]>(() =>
    safeGet<Requirement[]>(STORAGE_KEYS.REQUIREMENTS, [])
  );

  const [history, setHistoryState] = useState<ParseResult[]>(() =>
    safeGet<ParseResult[]>(STORAGE_KEYS.HISTORY, [])
  );

  useEffect(() => {
    safeSet(STORAGE_KEYS.REQUIREMENTS, requirements);
  }, [requirements]);

  useEffect(() => {
    safeSet(STORAGE_KEYS.HISTORY, history);
  }, [history]);

  const setRequirements = useCallback((items: Requirement[]) => {
    setRequirementsState(renumberRequirements(items));
  }, []);

  const addRequirement = useCallback((req: Omit<Requirement, 'id' | 'number'>) => {
    setRequirementsState(prev => {
      const newReq: Requirement = {
        ...req,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        number: prev.length + 1
      };
      return [...prev, newReq];
    });
  }, []);

  const updateRequirement = useCallback((id: string, updates: Partial<Requirement>) => {
    setRequirementsState(prev =>
      renumberRequirements(prev.map(r => (r.id === id ? { ...r, ...updates } : r)))
    );
  }, []);

  const deleteRequirement = useCallback((id: string) => {
    setRequirementsState(prev => {
      const filtered = prev.filter(r => r.id !== id);
      return renumberRequirements(filtered.map(r => ({
        ...r,
        dependencies: r.dependencies.filter(depId => depId !== id)
      })));
    });
  }, []);

  const reorderRequirements = useCallback((fromIndex: number, toIndex: number) => {
    setRequirementsState(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return renumberRequirements(result);
    });
  }, []);

  const addToHistory = useCallback((result: ParseResult) => {
    setHistoryState(prev => {
      const next = [result, ...prev];
      if (next.length > MAX_HISTORY) {
        return next.slice(0, MAX_HISTORY);
      }
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistoryState([]);
  }, []);

  const getHistoryById = useCallback((id: string): ParseResult | undefined => {
    return history.find(h => h.id === id);
  }, [history]);

  const backup = useCallback(() => {
    const data = {
      requirements,
      history,
      timestamp: Date.now()
    };
    safeSet(STORAGE_KEYS.BACKUP, data);
    return data;
  }, [requirements, history]);

  const restore = useCallback(() => {
    const data = safeGet<{ requirements: Requirement[]; history: ParseResult[] } | null>(
      STORAGE_KEYS.BACKUP,
      null
    );
    if (data) {
      setRequirementsState(data.requirements);
      setHistoryState(data.history);
    }
    return data;
  }, []);

  const clearAll = useCallback(() => {
    setRequirementsState([]);
  }, []);

  return {
    requirements,
    setRequirements,
    addRequirement,
    updateRequirement,
    deleteRequirement,
    reorderRequirements,
    history,
    addToHistory,
    clearHistory,
    getHistoryById,
    backup,
    restore,
    clearAll,
    checkCircularDeps: checkCircularDependencies
  };
}
