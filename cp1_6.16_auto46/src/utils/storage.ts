import type { Idea, Weights, DEFAULT_WEIGHTS } from './scoringEngine';

export interface TimelineEvent {
  id: string;
  type: 'submit' | 'score';
  ideaId: string;
  ideaTitle: string;
  dimension?: string;
  score?: number;
  user: string;
  timestamp: number;
}

const IDEAS_KEY = 'brainstorm_ideas';
const WEIGHTS_KEY = 'brainstorm_weights';
const TIMELINE_KEY = 'brainstorm_timeline';

export function getIdeas(): Idea[] {
  try {
    const data = localStorage.getItem(IDEAS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveIdeas(ideas: Idea[]): void {
  try {
    localStorage.setItem(IDEAS_KEY, JSON.stringify(ideas));
  } catch (e) {
    console.error('Failed to save ideas:', e);
  }
}

export function addIdea(idea: Idea): Idea[] {
  const ideas = getIdeas();
  ideas.push(idea);
  saveIdeas(ideas);
  return ideas;
}

export function updateIdea(id: string, updates: Partial<Idea>): Idea[] {
  const ideas = getIdeas();
  const index = ideas.findIndex((idea) => idea.id === id);
  if (index !== -1) {
    ideas[index] = { ...ideas[index], ...updates };
    saveIdeas(ideas);
  }
  return ideas;
}

export function deleteIdea(id: string): Idea[] {
  const ideas = getIdeas().filter((idea) => idea.id !== id);
  saveIdeas(ideas);
  return ideas;
}

export function getWeights(defaultWeights: Weights): Weights {
  try {
    const data = localStorage.getItem(WEIGHTS_KEY);
    return data ? JSON.parse(data) : defaultWeights;
  } catch {
    return defaultWeights;
  }
}

export function saveWeights(weights: Weights): void {
  try {
    localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
  } catch (e) {
    console.error('Failed to save weights:', e);
  }
}

export function getTimeline(): TimelineEvent[] {
  try {
    const data = localStorage.getItem(TIMELINE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveTimeline(events: TimelineEvent[]): void {
  try {
    localStorage.setItem(TIMELINE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('Failed to save timeline:', e);
  }
}

export function addTimelineEvent(event: TimelineEvent): TimelineEvent[] {
  const events = getTimeline();
  events.push(event);
  if (events.length > 100) {
    events.shift();
  }
  saveTimeline(events);
  return events;
}

export function clearAllData(): void {
  localStorage.removeItem(IDEAS_KEY);
  localStorage.removeItem(WEIGHTS_KEY);
  localStorage.removeItem(TIMELINE_KEY);
}
