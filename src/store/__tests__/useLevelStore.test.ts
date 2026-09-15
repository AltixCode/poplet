import AsyncStorage from '@react-native-async-storage/async-storage';

import { FREE_LEVELS, TOTAL_LEVELS } from '@/logic/puzzle';
import { LEVEL_CACHE_KEY, useLevelStore } from '../useLevelStore';

const reset = () => useLevelStore.setState({ cleared: [] });

beforeEach(async () => {
  await AsyncStorage.clear();
  reset();
});

describe('progress', () => {
  it('records a cleared level once', () => {
    useLevelStore.getState().clear(3);
    useLevelStore.getState().clear(3);
    expect(useLevelStore.getState().cleared).toEqual([3]);
  });

  it('knows which levels are done', () => {
    useLevelStore.getState().clear(0);
    expect(useLevelStore.getState().isCleared(0)).toBe(true);
    expect(useLevelStore.getState().isCleared(1)).toBe(false);
  });

  it('counts how many are cleared', () => {
    useLevelStore.getState().clear(0);
    useLevelStore.getState().clear(5);
    expect(useLevelStore.getState().clearedCount()).toBe(2);
  });
});

describe('what is open', () => {
  it('opens the free levels to everyone', () => {
    expect(useLevelStore.getState().canPlay(0, false)).toBe(true);
    expect(useLevelStore.getState().canPlay(FREE_LEVELS - 1, false)).toBe(true);
  });

  it('gates the rest behind the purchase', () => {
    expect(useLevelStore.getState().canPlay(FREE_LEVELS, false)).toBe(false);
    expect(useLevelStore.getState().canPlay(FREE_LEVELS, true)).toBe(true);
  });

  it('never opens a level that does not exist', () => {
    expect(useLevelStore.getState().canPlay(TOTAL_LEVELS, true)).toBe(false);
    expect(useLevelStore.getState().canPlay(-1, true)).toBe(false);
  });
});

describe('hydrate', () => {
  it('restores progress', async () => {
    useLevelStore.getState().clear(2);
    await useLevelStore.getState().persist();
    reset();
    await useLevelStore.getState().hydrate();
    expect(useLevelStore.getState().isCleared(2)).toBe(true);
  });

  it('starts empty rather than throwing on unreadable storage', async () => {
    await AsyncStorage.setItem(LEVEL_CACHE_KEY, 'nope');
    await useLevelStore.getState().hydrate();
    expect(useLevelStore.getState().cleared).toEqual([]);
  });

  it('drops entries that are not level numbers', async () => {
    await AsyncStorage.setItem(LEVEL_CACHE_KEY, JSON.stringify({ cleared: ['x', 4, null] }));
    await useLevelStore.getState().hydrate();
    expect(useLevelStore.getState().cleared).toEqual([4]);
  });
});
