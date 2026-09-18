import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Button, Card, Text } from '@/components/ui';
import { t } from '@/i18n';
import {
  FREE_LEVELS,
  TOTAL_LEVELS,
  applyShot,
  isCleared,
  levelForIndex,
  type Board,
} from '@/logic/puzzle';
import { noteGameFinished } from '@/monetization/pacing';
import { useLevelStore } from '@/store/useLevelStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { MIN_TOUCH_TARGET, useTheme, withAlpha } from '@/theme';
import { useTabletColumn } from '@/theme/useTabletColumn';

/** Levels offered in the picker. */
const PICKER_SPAN = 24;

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = useTheme();
  const tabletColumn = useTabletColumn();

  const isPremium = usePremiumStore((s) => s.isPremium);
  const isReady = usePremiumStore((s) => s.isReady);
  const hydrate = useLevelStore((s) => s.hydrate);
  const clearLevel = useLevelStore((s) => s.clear);
  const isLevelCleared = useLevelStore((s) => s.isCleared);
  const clearedCount = useLevelStore((s) => s.clearedCount);
  const canPlay = useLevelStore((s) => s.canPlay);

  const [index, setIndex] = useState(0);
  const [board, setBoard] = useState<Board>(() => levelForIndex(0).board);
  const [shotAt, setShotAt] = useState(0);
  // Measured, so the board uses the width it is given rather than a constant.
  const [fieldWidth, setFieldWidth] = useState(0);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const level = levelForIndex(index);
  const cleared = isCleared(board);
  const shotsLeft = level.shots.length - shotAt;
  const spent = shotsLeft <= 0 && !cleared;

  const load = useCallback((target: number) => {
    setIndex(target);
    setBoard(levelForIndex(target).board);
    setShotAt(0);
  }, []);

  const shoot = useCallback(
    (column: number) => {
    if (cleared || spent) return;
    const colour = level.shots[shotAt]!;
    const next = applyShot(board, column, colour);
    setBoard(next);
    setShotAt((s) => s + 1);
    void Haptics.selectionAsync();

    if (isCleared(next)) {
      clearLevel(index);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void noteGameFinished();
    }
    },
    [board, cleared, spent, level.shots, shotAt, index, clearLevel, isPremium, isReady],
  );

  const pickLevel = (target: number) => {
    if (!canPlay(target, isPremium)) {
      router.push('/paywall');
      return;
    }
    load(target);
  };

  const columns = board[0]?.length ?? 5;
  const cellSize = fieldWidth > 0 ? Math.floor((fieldWidth - (columns - 1) * 6) / columns) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.base,
          paddingHorizontal: spacing.base,
          paddingBottom: spacing.xl,
          gap: spacing.base,
        
          ...tabletColumn,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text variant="title" style={styles.grow}>
            {t('appName')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsTitle')}
            onPress={() => router.push('/settings')}
            hitSlop={8}
            style={styles.iconSlot}
          >
            <Feather name="settings" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <Text variant="heading">{t('levelLabel', { n: index + 1 })}</Text>
        <Text variant="caption" tone="muted">
          {t('oneRightAnswer')}
        </Text>
        <Text variant="body">{t('shotsLeft', { n: Math.max(0, shotsLeft) })}</Text>

        <View onLayout={(e) => setFieldWidth(e.nativeEvent.layout.width)} style={styles.board}>
          {board.map((row, r) => (
            <View key={`row-${r}`} style={styles.row}>
              {row.map((cell, c) => (
                <View
                  key={`cell-${r}-${c}`}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      borderRadius: radius.full,
                      // Every bubble used to be drawn in `colors.accent`, so
                      // all four colours were the same colour and the only
                      // thing telling them apart was the code letter. In a game
                      // whose entire mechanic is matching touching same-colour
                      // bubbles, that is the mechanic missing.
                      backgroundColor: cell ? colors.bubble[cell] : colors.surface,
                      // An EMPTY cell is the board: it has to be visible on its own.
                      // `border` is 1.29:1 against the background in the dark theme,
                      // which is why the live iPad screenshot reads as a blank frame
                      // with 76% of it indistinguishable from the background.
                      borderColor: cell ? colors.bubble[cell] : colors.borderStrong,
                    },
                  ]}
                >
                  <Text variant="caption" style={cell ? { color: colors.onBubble[cell] } : undefined}>
                    {cell ?? ''}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.shooters}>
          {Array.from({ length: columns }, (_, c) => (
            <Pressable
              key={`shoot-${c}`}
              accessibilityRole="button"
              accessibilityLabel={t('columnLabel', { n: c + 1 })}
              accessibilityState={{ disabled: cleared || spent }}
              onPress={() => shoot(c)}
              style={[
                styles.shooter,
                {
                  width: cellSize,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name="arrow-up" size={18} color={colors.text} />
            </Pressable>
          ))}
        </View>

        {cleared ? (
          <Card>
            <Text variant="heading">{t('clearedTitle')}</Text>
            <Button
              label={t('nextCta')}
              onPress={() => pickLevel(index + 1)}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        ) : spent ? (
          <Card>
            <Text variant="heading">{t('outOfShots')}</Text>
            <Button
              label={t('retryCta')}
              onPress={() => load(index)}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        ) : null}

        <Text variant="heading" style={{ marginTop: spacing.base }}>
          {t('levelsTitle')}
        </Text>
        <Text variant="caption" tone="muted">
          {t('progressLabel', { done: clearedCount(), total: TOTAL_LEVELS })}
        </Text>
        <View style={[styles.chipRow, { gap: spacing.sm }]}>
          {Array.from({ length: PICKER_SPAN }, (_, i) => i).map((target) => {
            const allowed = canPlay(target, isPremium);
            const done = isLevelCleared(target);
            const chosen = target === index;
            return (
              <Pressable
                key={target}
                accessibilityRole="button"
                accessibilityLabel={
                  allowed ? t('levelLabel', { n: target + 1 }) : t('levelLocked', { n: target + 1 })
                }
                accessibilityState={{ selected: chosen, disabled: !allowed }}
                onPress={() => pickLevel(target)}
                style={[
                  styles.chip,
                  {
                    borderRadius: radius.md,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: chosen ? colors.accent : colors.border,
                    backgroundColor: done ? withAlpha(colors.success, 0.18) : colors.surface,
                  },
                ]}
              >
                {/* The number stays at full contrast whether the level is locked
                    or not — a dimmed number is exactly the defect found on
                    Foldup's level grid. The lock icon carries the state. */}
                <Text variant="body">{target + 1}</Text>
                {allowed ? null : <Feather name="lock" size={12} color={colors.textMuted} />}
              </Pressable>
            );
          })}
        </View>
        {isPremium ? null : (
          <Text variant="caption" tone="muted">
            {t('lockedHint', { n: FREE_LEVELS, total: TOTAL_LEVELS })}
          </Text>
        )}
      </ScrollView>
      <BannerAdSlot />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  iconSlot: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: { gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  cell: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shooters: { flexDirection: 'row', gap: 6 },
  shooter: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
});
