import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import { AppIcon } from './ui/AppIcon';
import { getWineAccent, getWineSoftBg } from '../theme/helpers';
import type { Wine } from '../types';

interface Props {
  wines: Wine[];
  selectedIndexes?: number[];
  onSelect?: (index: number) => void;
}

export default function WineList({ wines, selectedIndexes = [], onSelect }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.sectionTitle}>Vini disponibili</Text>
      <Text style={styles.sectionSub}>
        {selectedIndexes.length > 0
          ? `${selectedIndexes.length} selezionati · tocca per scegliere`
          : 'Tocca per selezionare i vini da abbinare (se nessuno selezionato, verranno usati tutti)'}
      </Text>
      <View style={styles.list}>
        {wines.map((wine, i) => {
          const selected = selectedIndexes.includes(i);
          const accent = getWineAccent(wine.type);
          const softBg = getWineSoftBg(wine.type);
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.card,
                {
                  backgroundColor: selected ? softBg : colors.surface,
                  borderColor: selected ? accent + '60' : colors.border,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => onSelect?.(i)}
            >
              <View style={styles.cardLeft}>
                <AppIcon
                  name={selected ? 'circle-check' : 'circle'}
                  size={20}
                  color={selected ? accent : colors.textSecondary}
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.wineName} numberOfLines={1}>{wine.name}</Text>
                <View style={styles.meta}>
                  <View style={[styles.typeBadge, { backgroundColor: softBg }]}>
                    <Text style={[styles.typeText, { color: accent }]}>{wine.type}</Text>
                  </View>
                  {wine.region ? (
                    <Text style={styles.region} numberOfLines={1}>{wine.region}</Text>
                  ) : null}
                  {wine.vintage ? (
                    <Text style={styles.vintage}>{wine.vintage}</Text>
                  ) : null}
                </View>
              </View>
              {wine.menu_price ? (
                <Text style={styles.price}>{wine.menu_price}</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  sectionSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  cardLeft: {
    width: 24,
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    flexShrink: 1,
  },
  wineName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  typeBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  region: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  vintage: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accentYellow,
    flexShrink: 0,
  },
});
