import { useGameStore } from '../store/gameStore';

export class TimelineManager {
  private unsubscribe: (() => void) | null = null;
  private lastPlacedCount: number = 0;

  start() {
    this.unsubscribe = useGameStore.subscribe((state) => {
      const placedCount = state.timeline.filter(s => s.fragmentId !== null).length;
      if (placedCount >= 5 && placedCount !== this.lastPlacedCount && placedCount % 5 === 0) {
        this.validateAndTrigger(placedCount);
      }
      this.lastPlacedCount = placedCount;
    });
  }

  stop() {
    if (this.unsubscribe) this.unsubscribe();
  }

  private validateAndTrigger(placedCount: number) {
    const state = useGameStore.getState();
    const placedSlots = state.timeline
      .filter(s => s.fragmentId !== null)
      .sort((a, b) => a.index - b.index);

    if (placedSlots.length < 5) return;

    const firstThree = placedSlots.slice(0, 3);
    let correct = true;
    for (let i = 0; i < firstThree.length; i++) {
      const frag = state.fragments.find(f => f.id === firstThree[i].fragmentId);
      if (!frag || frag.order !== firstThree[i].index + 1) {
        correct = false;
        break;
      }
    }

    if (correct) {
      const storyIndex = state.unlockedStories;
      const storyTexts = placedSlots.slice(0, 5).map(s => {
        const frag = state.fragments.find(f => f.id === s.fragmentId);
        return frag ? frag.story : '';
      }).filter(Boolean);

      const fullStory = storyTexts.length > 0
        ? storyTexts.join('\n\n')
        : `第${storyIndex + 1}段记忆已解锁...往事如潮水般涌来。`;

      useGameStore.setState(s => ({
        unlockedStories: s.unlockedStories + 1,
        storyPopup: { text: fullStory, visible: true },
      }));
      this.playSuccessSound();

      const saved = {
        collectedIds: useGameStore.getState().fragments.filter(f => f.collected).map(f => f.id),
        unlockedStories: useGameStore.getState().unlockedStories,
      };
      localStorage.setItem('memory-fragment-progress', JSON.stringify(saved));
    } else {
      const returnIds = state.timeline
        .filter(slot => slot.fragmentId !== null)
        .map(slot => slot.fragmentId!);

      useGameStore.setState(s => ({
        timeline: Array.from({ length: 15 }, (_, i) => ({ index: i, fragmentId: null as string | null })),
        backpack: [...s.backpack, ...returnIds],
        errorMessage: '顺序错误',
        errorMessageTime: Date.now(),
        shakeBackpack: true,
      }));

      setTimeout(() => useGameStore.setState({ shakeBackpack: false }), 400);
      setTimeout(() => useGameStore.setState({ errorMessage: '' }), 1500);
      this.playErrorSound();
    }
  }

  private playSuccessSound() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 200;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  private playErrorSound() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 400;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }

  getSlotPosition(slotIndex: number): { x: number; y: number } | null {
    const el = document.getElementById('timeline-panel');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const slotWidth = rect.width / 15;
    return {
      x: rect.left + slotIndex * slotWidth + slotWidth / 2,
      y: rect.top + rect.height / 2,
    };
  }
}
