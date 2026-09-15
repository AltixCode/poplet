import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import Home from '../index';
import { testRouter } from './testRouter';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { t } from '@/i18n';
import { FREE_LEVELS, TOTAL_LEVELS, countSolutions, levelForIndex } from '@/logic/puzzle';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { useLevelStore } from '@/store/useLevelStore';
import { usePremiumStore } from '@/store/usePremiumStore';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  useAdsConsentStore.setState({ consent: { canServeAds: true, offerPrivacyOptions: false } });
  useLevelStore.setState({ cleared: [] });
});

describe('Home', () => {
  it('renders the app name and routes to settings', async () => {
    const { getByText, getByLabelText } = await renderWithProviders(<Home />);
    expect(getByText(t('appName'))).toBeTruthy();
    await fireEvent.press(getByLabelText(t('settingsTitle')));
    expect(testRouter.push).toHaveBeenCalledWith('/settings');
  });

  it('shows a banner to a free user and none to a premium one', async () => {
    const free = await renderWithProviders(<Home />);
    expect(free.queryByTestId('banner-ad')).not.toBeNull();
    usePremiumStore.setState({ isPremium: true });
    const paid = await renderWithProviders(<Home />);
    expect(paid.queryByTestId('banner-ad')).toBeNull();
  });

  it('opens on the first level with its shot budget', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('levelLabel', { n: 1 }))).toBeTruthy();
    expect(getByText(t('shotsLeft', { n: levelForIndex(0).shots.length }))).toBeTruthy();
  });

  // The tagline is a claim, so the screen states it and a test holds it there.
  it('tells the player each level has exactly one solution', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('oneRightAnswer'))).toBeTruthy();
  });

  it('spends a shot when a column is fired', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(<Home />);
    const before = levelForIndex(0).shots.length;
    await fireEvent.press(getByLabelText(t('columnLabel', { n: 1 })));
    await waitFor(() => expect(getByText(t('shotsLeft', { n: before - 1 }))).toBeTruthy());
  });

  it('shows progress across the level set', async () => {
    useLevelStore.setState({ cleared: [0, 1] });
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('progressLabel', { done: 2, total: TOTAL_LEVELS }))).toBeTruthy();
  });

  // The paid claim: levels beyond the free set.
  it('sends a free player picking a locked level to the paywall', async () => {
    const { getByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('levelLocked', { n: FREE_LEVELS + 1 })));
    expect(testRouter.push).toHaveBeenCalledWith('/paywall');
  });

  it('lets a premium player open one', async () => {
    usePremiumStore.setState({ isPremium: true, isReady: true });
    const { getByLabelText, getByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('levelLabel', { n: FREE_LEVELS + 1 })));
    await waitFor(() =>
      expect(getByText(t('levelLabel', { n: FREE_LEVELS + 1 }))).toBeTruthy(),
    );
  });

  it('tells a free player how many levels are free', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('lockedHint', { n: FREE_LEVELS, total: TOTAL_LEVELS }))).toBeTruthy();
  });

  // The level the screen actually opens must satisfy the claim, not just the
  // ones the logic test sampled.
  it('opens a level that genuinely has exactly one solution', () => {
    const level = levelForIndex(0);
    expect(countSolutions(level.board, level.shots, level.shots.length)).toBe(1);
  });
});
