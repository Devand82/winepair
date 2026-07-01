import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Share,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius, iconSize } from '../theme';
import { AppIcon } from './ui/AppIcon';
import { getWineAccent, getWineSoftBg } from '../theme/helpers';
import type { PairingResult, Wine } from '../types';

interface Props {
  result: PairingResult;
  wines: Wine[];
  foodName: string;
  onBack: () => void;
  onNewMenu: () => void;
}

function StarRating({ score }: { score?: number }) {
  const n = Math.round((score ?? 0) / 2);
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <AppIcon
          key={i}
          name="star"
          size={14}
          color={i < n ? colors.accentYellow : colors.border}
          strokeWidth={i < n ? 2.5 : 1.5}
        />
      ))}
    </View>
  );
}

export default function WineResult({
  result,
  wines,
  foodName,
  onBack,
  onNewMenu,
}: Props) {
  const slideY = useRef(new Animated.Value(-30)).current;
  const wineAccent = getWineAccent(result.wine_type);
  const wineSoftBg = getWineSoftBg(result.wine_type);
  const altWine =
    result.alternative_wine_index != null
      ? wines[result.alternative_wine_index]
      : null;

  useEffect(() => {
    Animated.spring(slideY, {
      toValue: 0,
      useNativeDriver: true,
      delay: 100,
      speed: 14,
    }).start();
  }, [slideY]);

  const shareResult = () => {
    const starsDisplay = '★'.repeat(Math.round((result.food_match_score || 0) / 2)) +
      '☆'.repeat(5 - Math.round((result.food_match_score || 0) / 2));
    const message = [
      `WinePair — Abbinamento per "${foodName}"`,
      '',
      `${result.wine_name}`,
      result.region ? `${result.region}${result.vintage ? ' · ' + result.vintage : ''}` : '',
      result.menu_price ? `💰 ${result.menu_price} nel menù` : '',
      result.avg_market_price ? `   Mercato: ~${result.avg_market_price}` : '',
      '',
      result.pairing_reason ? `"${result.pairing_reason}"` : '',
      '',
      `Score: ${result.food_match_score || '–'}/10  ${starsDisplay}`,
    ]
      .filter(Boolean)
      .join('\n');
    Share.share({ title: 'Il mio abbinamento vino', message });
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <AppIcon name="utensils" size={14} color={colors.textSecondary} />
          <Text style={styles.headerLabel}>{foodName}</Text>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={shareResult} activeOpacity={0.75}>
          <AppIcon name="share" size={14} color={colors.accentRed} />
          <Text style={styles.shareBtnText}>Condividi</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[styles.wineCard, { transform: [{ translateY: slideY }] }]}
      >
        <View style={[styles.wineIconWrap, { backgroundColor: wineSoftBg }]}>
          <AppIcon name="wine" size={28} color={wineAccent} />
        </View>
        <Text style={styles.wineName}>{result.wine_name}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: wineSoftBg }]}>
            <Text style={[styles.badgeText, { color: wineAccent }]}>
              {result.wine_type}
            </Text>
          </View>
          {result.region ? (
            <View style={[styles.badge, { backgroundColor: colors.surfaceSoft }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {result.region}
              </Text>
            </View>
          ) : null}
          {result.vintage ? (
            <View style={[styles.badge, { backgroundColor: colors.surfaceSoft }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {result.vintage}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.priceRow}>
          {result.menu_price ? (
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>Nel menù</Text>
              <Text style={styles.priceValue}>{result.menu_price}</Text>
            </View>
          ) : null}
          {result.avg_market_price ? (
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>Mercato</Text>
              <Text style={styles.marketValue}>{result.avg_market_price}</Text>
            </View>
          ) : null}
          {result.food_match_score ? (
            <View style={styles.scoreBlock}>
              <Text style={styles.scoreNum}>{result.food_match_score}/10</Text>
              <StarRating score={result.food_match_score} />
            </View>
          ) : null}
        </View>
      </Animated.View>

      <View style={styles.detailGrid}>
        <View style={styles.detailRow}>
          <DetailMiniCard icon="search" label="Colore" value={result.color} />
          <DetailMiniCard icon="sparkle" label="Profumi" value={result.nose} />
        </View>
        <View style={styles.detailRow}>
          <DetailMiniCard icon="wine" label="Gusto" value={result.palate} />
          <DetailMiniCard icon="search" label="Servizio" value={result.temperature} />
        </View>
      </View>

      {result.pairing_reason ? (
        <View style={styles.reasonCard}>
          <View style={styles.reasonHeader}>
            <AppIcon name="sparkle" size={14} color={colors.accentRed} />
            <Text style={styles.reasonLabel}>Perché questo abbinamento</Text>
          </View>
          <Text style={styles.reasonText}>{result.pairing_reason}</Text>
          {result.pairing_principle ? (
            <View style={styles.principleRow}>
              <Text style={styles.principleLabel}>Principio</Text>
              <Text style={styles.principleValue}>{result.pairing_principle}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {altWine ? (
        <View style={styles.altCard}>
          <Text style={styles.altLabel}>Alternativa disponibile</Text>
          <Text style={styles.altName}>{altWine.name}</Text>
          <Text style={styles.altDesc}>
            {altWine.type}{altWine.region ? ` · ${altWine.region}` : ''}
          </Text>
          {altWine.menu_price ? (
            <Text style={styles.altPrice}>{altWine.menu_price}</Text>
          ) : null}
          {result.alternative_note ? (
            <Text style={styles.altNote}>{result.alternative_note}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.75}>
          <View style={styles.backBtnInner}>
            <AppIcon name="chevron-left" size={iconSize.sm} color={colors.textPrimary} />
            <Text style={styles.backBtnText}>Cambia piatto</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.newMenuBtn} onPress={onNewMenu} activeOpacity={0.75}>
          <View style={styles.backBtnInner}>
            <AppIcon name="search" size={iconSize.sm} color="#fff" />
            <Text style={styles.newMenuBtnText}>Nuovo menù</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function DetailMiniCard({
  icon,
  label,
  value,
}: {
  icon: 'search' | 'sparkle' | 'wine';
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <View style={styles.detailBlock}>
      <View style={styles.detailHeader}>
        <AppIcon name={icon} size={12} color={colors.textSecondary} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  headerLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
  },
  shareBtnText: {
    color: colors.accentRed,
    fontSize: 13,
    fontWeight: '600',
  },
  wineCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  wineIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  wineName: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  priceBlock: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.accentYellow,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  marketValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  scoreBlock: {
    alignItems: 'center',
  },
  scoreNum: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  detailGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detailBlock: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.xs,
  },
  detailLabel: {
    textTransform: 'uppercase',
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  detailValue: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  reasonCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  reasonLabel: {
    textTransform: 'uppercase',
    color: colors.accentRed,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reasonText: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  principleRow: {
    flexDirection: 'row',
    gap: spacing.xxs,
    alignItems: 'center',
  },
  principleLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  principleValue: {
    color: colors.accentRed,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  altCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  altLabel: {
    textTransform: 'uppercase',
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  altName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  altDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  altPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accentYellow,
    marginBottom: spacing.xxs,
  },
  altNote: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  backBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  backBtnText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  newMenuBtn: {
    flex: 1,
    backgroundColor: colors.accentRed,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newMenuBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
