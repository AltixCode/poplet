/**
 * Which levels are cleared, and which are open.
 *
 * The paid claim enforced here is the level range: the first levels are free and
 * the rest come with the purchase. `isPremium` is passed explicitly at the call
 * site rather than read from another store.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { FREE_LEVELS, TOTAL_LEVELS } from '@/logic/puzzle';

export const LEVEL_CACHE_KEY = 'poplet.state.v1';

interface LevelState {
  cleared: number[];

  clear: (index: number) => void;
  isCleared: (index: number) => boolean;
  clearedCount: () => number;
  canPlay: (index: number, isPremium: boolean) => boolean;
  persist: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useLevelStore = create<LevelState>((set, get) => ({
  cleared: [],

  clear(index) {
    if (get().cleared.includes(index)) return;
    set((s) => ({ cleared: [...s.cleared, index].sort((a, b) => a - b) }));
    void get().persist();
  },

  isCleared(index) {
    return get().cleared.includes(index);
  },

  clearedCount() {
    return get().cleared.length;
  },

  canPlay(index, isPremium) {
    // A level outside the range is refused whatever the entitlement: an index
    // past the end would generate a level nobody can reach from the list.
    if (index < 0 || index >= TOTAL_LEVELS) return false;
    return isPremium || index < FREE_LEVELS;
  },

  async persist() {
    try {
      await AsyncStorage.setItem(LEVEL_CACHE_KEY, JSON.stringify({ cleared: get().cleared }));
    } catch {
      // Lost progress is survivable; a failed launch is not.
    }
  },

  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(LEVEL_CACHE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      const stored = (parsed as Record<string, unknown>).cleared;
      if (!Array.isArray(stored)) return;
      set({
        cleared: stored.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)),
      });
    } catch {
      // Unreadable storage starts empty rather than preventing launch.
    }
  },
}));
