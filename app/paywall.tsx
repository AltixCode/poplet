import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, Text } from "@/components/ui";
import { t } from "@/i18n";
import { PRIVACY_POLICY_URL, TERMS_URL } from "@/monetization/config";
import { usePremiumStore } from "@/store/usePremiumStore";
import { useTheme } from "@/theme";
import { useTabletColumn } from "../src/theme/useTabletColumn";

/**
 * The one purchase this app sells: a lifetime non-consumable that removes the ads and unlocks
 * everything. There is deliberately no plan picker — a second option would be a subscription,
 * and the portfolio does not sell those.
 */
const BENEFIT_KEYS = [
  { title: "feat1Title", desc: "feat1Desc", icon: "feather" },
  { title: "feat2Title", desc: "feat2Desc", icon: "compass" },
  { title: "feat3Title", desc: "feat3Desc", icon: "sun" },
  { title: "feat4Title", desc: "feat4Desc", icon: "moon" },
] as const;

/**
 * A bento "L": one tall tile carries the strongest claim, the rest stack beside it. Every
 * app in this batch shares the same "icon-led tiles" brief but not the same shape — this one
 * is the only one built as an L, and the only one where tapping a tile leaves a mark.
 *
 * The mark is a pure `useState` toggle local to this screen: no store write, no effect on
 * `purchase`/`restore`, nothing persisted. It exists so the grid is a screen a person does
 * something on rather than just reads, without touching the one real interaction that matters
 * (buying, or restoring, the lifetime unlock).
 */
function BenefitTile({
  title,
  desc,
  icon,
  tall,
  acknowledged,
  onToggle,
}: {
  title: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
  tall: boolean;
  acknowledged: boolean;
  onToggle: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: acknowledged }}
      onPress={onToggle}
      style={({ pressed }) => [
        {
          flex: 1,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: acknowledged ? colors.accent : colors.border,
          backgroundColor: acknowledged ? colors.surfaceAlt : colors.surface,
          padding: spacing.lg,
          justifyContent: tall ? "flex-end" : "center",
          opacity: pressed ? 0.85 : 1,
        },
        tall ? { minHeight: 220 } : { minHeight: 96 },
      ]}
    >
      <View
        style={{
          position: "absolute",
          top: spacing.md,
          right: spacing.md,
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: acknowledged ? colors.accent : "transparent",
          borderWidth: acknowledged ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        {acknowledged ? (
          <Feather name="check" size={13} color={colors.onAccent} />
        ) : null}
      </View>
      <Feather name={icon} size={tall ? 30 : 20} color={colors.accent} />
      <Text
        variant={tall ? "heading" : "bodyStrong"}
        style={{ marginTop: spacing.sm }}
      >
        {title}
      </Text>
      <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
        {desc}
      </Text>
    </Pressable>
  );
}

export default function Paywall() {
  /**
   * Only the claims this app can actually make.
   *
   * Four slots is what this template offers, not a quota to fill. An app whose
   * purchase removes the ads and nothing else has one honest thing to say about
   * it, and padding to four is how "Everything unlocked -- every level, every
   * mode and the full archive" ends up on a paywall for an app with no levels,
   * no modes and no archive.
   *
   * A benefit whose title is blank is dropped, so cutting a claim is a one-line
   * edit in `i18n` rather than a component change. Computed per render, not at
   * module load, so it follows the active locale.
   */
  const benefits = BENEFIT_KEYS.filter((b) => t(b.title).trim().length > 0);
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const tabletColumn = useTabletColumn(640);
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();

  const lifetime = usePremiumStore((s) => s.lifetime);
  const offeringsResolved = usePremiumStore((s) => s.offeringsResolved);
  const isPremium = usePremiumStore((s) => s.isPremium);
  const isPurchasing = usePremiumStore((s) => s.isPurchasing);
  const error = usePremiumStore((s) => s.error);
  const purchase = usePremiumStore((s) => s.purchase);
  const restore = usePremiumStore((s) => s.restore);
  // A restore that finds nothing must SAY so.
  // `restore()` returned 'none' and the screen rendered nothing at all, so
  // the button read as broken -- and App Review taps Restore on every
  // submission. The string already existed in all fourteen locales; it was
  // simply never shown on this paywall shape.
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);
  const refreshOfferings = usePremiumStore((s) => s.refreshOfferings);

  useEffect(() => {
    void refreshOfferings();
  }, [refreshOfferings]);

  // A user who already owns it must never be left staring at a buy button.
  useEffect(() => {
    if (isPremium) router.back();
  }, [isPremium, router]);

  const price = lifetime?.product.priceString;
  const [featured, ...rest] = benefits;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      <View style={{ alignItems: "flex-end", padding: spacing.base }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("close")}
          hitSlop={12}
          onPress={() => router.back()}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <Text variant="body" tone="muted">
            {t("close")}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: spacing["3xl"],
          ...tabletColumn,
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        <Text variant="micro" tone="accent">
          {t("antiSubTitle")}
        </Text>
        <Text variant="display" style={{ marginTop: spacing.xs }}>
          {t("paywallTitle")}
        </Text>
        <Text variant="body" tone="muted" style={{ marginTop: spacing.sm }}>
          {t("antiSubHeadline")}
        </Text>

        {/* The bento L: a tall tile for the strongest claim, a stacked column for the rest.
            Degrades on its own — one benefit is just the tall tile, two is tall-plus-one. */}
        {featured ? (
          <View
            style={{
              marginTop: spacing["2xl"],
              flexDirection: "row",
              gap: spacing.md,
            }}
          >
            <View style={{ flex: 5 }}>
              <BenefitTile
                title={t(featured.title)}
                desc={t(featured.desc)}
                icon={featured.icon}
                tall
                acknowledged={!!acknowledged[featured.title]}
                onToggle={() =>
                  setAcknowledged((prev) => ({
                    ...prev,
                    [featured.title]: !prev[featured.title],
                  }))
                }
              />
            </View>
            {rest.length > 0 ? (
              <View style={{ flex: 4, gap: spacing.md }}>
                {rest.map((benefit) => (
                  <BenefitTile
                    key={benefit.title}
                    title={t(benefit.title)}
                    desc={t(benefit.desc)}
                    icon={benefit.icon}
                    tall={false}
                    acknowledged={!!acknowledged[benefit.title]}
                    onToggle={() =>
                      setAcknowledged((prev) => ({
                        ...prev,
                        [benefit.title]: !prev[benefit.title],
                      }))
                    }
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <Card style={{ marginTop: spacing["2xl"] }}>
          {lifetime ? (
            <Button
              label={
                price
                  ? t("lifetimeAccess", { price })
                  : t("lifetimeAccessPlain")
              }
              size="lg"
              fullWidth
              loading={isPurchasing}
              onPress={() => void purchase(lifetime)}
            />
          ) : offeringsResolved ? (
            // Resolved, with no package: the store is genuinely unreachable or carries no
            // product yet. Say that, and keep Restore reachable below — a user who already
            // paid must still be able to get their purchase back.
            <View style={{ padding: spacing.md, alignItems: "center" }}>
              <Text variant="caption" tone="muted" align="center">
                {t("storeUnavailable")}
              </Text>
            </View>
          ) : (
            <View style={{ padding: spacing.md, alignItems: "center" }}>
              <ActivityIndicator color={colors.textMuted} />
              <Text
                variant="caption"
                tone="muted"
                style={{ marginTop: spacing.md }}
              >
                {t("loadingPrice")}
              </Text>
            </View>
          )}
          <Text
            variant="caption"
            tone="muted"
            align="center"
            style={{ marginTop: spacing.md }}
          >
            {t("oneTimePayment")}
          </Text>
        </Card>

        {error ? (
          <Text
            variant="caption"
            tone="danger"
            align="center"
            style={{ marginTop: spacing.base }}
          >
            {error}
          </Text>
        ) : null}

        {restoreNotice ? (
          <Text
            accessibilityRole="alert"
            variant="caption"
            tone="muted"
            align="center"
            style={{ marginTop: spacing.base }}
          >
            {restoreNotice}
          </Text>
        ) : null}

        <Button
          label={t("restorePurchases")}
          variant="ghost"
          fullWidth
          onPress={() => {
            setRestoreNotice(null);
            void restore().then((outcome) => {
              if (outcome === "none") setRestoreNotice(t("noPriorPurchases"));
            });
          }}
          style={{ marginTop: spacing.lg }}
        />

        <Text
          variant="micro"
          tone="faint"
          align="center"
          style={{ marginTop: spacing.xl }}
        >
          {t("adsDisclosure")}
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: spacing.lg,
            marginTop: spacing.md,
          }}
        >
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t("termsOfUse")}
            hitSlop={12}
            onPress={() => void Linking.openURL(TERMS_URL)}
          >
            <Text variant="micro" tone="faint">
              {t("termsOfUse")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t("privacyPolicy")}
            hitSlop={12}
            onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
          >
            <Text variant="micro" tone="faint">
              {t("privacyPolicy")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
