import type { FixSuggestion } from '@/types';

export class SuggestionCache {
  private static instance: SuggestionCache | null = null;
  private cache: Map<string, FixSuggestion[]>;
  private readonly MAX_SIZE: number = 500;
  private accessOrder: string[] = [];

  static getInstance(): SuggestionCache {
    if (!SuggestionCache.instance) {
      SuggestionCache.instance = new SuggestionCache();
    }
    return SuggestionCache.instance;
  }

  private constructor() {
    this.cache = new Map();
  }

  private generateKey(issueType: string, selector: string, currentValue?: string): string {
    const base = `${issueType}|${selector}`;
    return currentValue ? `${base}|${currentValue}` : base;
  }

  get(issueType: string, selector: string, currentValue?: string): FixSuggestion[] | null {
    const key = this.generateKey(issueType, selector, currentValue);
    const suggestions = this.cache.get(key);
    
    if (suggestions) {
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      this.accessOrder.unshift(key);
      return suggestions;
    }
    
    return null;
  }

  set(
    issueType: string,
    selector: string,
    suggestions: FixSuggestion[],
    currentValue?: string
  ): void {
    const key = this.generateKey(issueType, selector, currentValue);
    
    if (this.cache.size >= this.MAX_SIZE && !this.cache.has(key)) {
      const oldestKey = this.accessOrder.pop();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, suggestions);
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    this.accessOrder.unshift(key);
  }

  has(issueType: string, selector: string, currentValue?: string): boolean {
    const key = this.generateKey(issueType, selector, currentValue);
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  get size(): number {
    return this.cache.size;
  }

  destroy(): void {
    this.clear();
    SuggestionCache.instance = null;
  }
}

export const suggestionCache = SuggestionCache.getInstance();
export default suggestionCache;
