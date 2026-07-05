import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import { AppIcon } from './ui/AppIcon';
import type { Food } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  antipasto: 'Antipasto',
  primo: 'Primo',
  secondo: 'Secondo',
  dolce: 'Dolce',
  altro: 'Altro',
};

interface Props {
  foods: Food[];
  selectedIndex: number | null;
  selectedIndexes?: number[];
  onSelect: (index: number) => void;
  multiSelect?: boolean;
}

export default function FoodGrid({ foods, selectedIndex, selectedIndexes, onSelect, multiSelect }: Props) {
  const scaleValues = useRef<Animated.Value[]>([]);

  const scales = useMemo(() => {
    while (scaleValues.current.length < foods.length) {
      scaleValues.current.push(new Animated.Value(1));
    }
    return scaleValues.current.slice(0, foods.length);
  }, [foods.length]);

  const isSelected = (index: number) => {
    if (multiSelect) {
      return selectedIndexes?.includes(index) ?? false;
    }
    return selectedIndex === index;
  };

  return (
    <View style={styles.grid}>
      {foods.map((item, index) => {
        const selected = isSelected(index);
        const scale = scales[index];

        const handlePress = () => {
          Animated.sequence([
            Animated.spring(scale, {
              toValue: 1.03,
              useNativeDriver: true,
              speed: 30,
            }),
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
              speed: 30,
            }),
          ]).start();
          onSelect(index);
        };

        return (
          <View key={index} style={styles.cell}>
            <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handlePress}
                style={[styles.card, selected && styles.cardSelected]}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={[styles.name, selected && styles.nameSelected]}>
                  {item.name}
                </Text>
                <View style={[styles.categoryPill, selected && styles.categoryPillSelected]}>
                  <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>
                    {CATEGORY_LABELS[item.category] || item.category}
                  </Text>
                </View>
                {item.description ? (
                  <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                {item.menu_price ? (
                  <Text style={styles.price}>{item.menu_price}</Text>
                ) : null}
                {selected && (
                  <View style={styles.checkBadge}>
                    <AppIcon name="check" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  cell: {
    width: '48%',
    marginBottom: spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    position: 'relative',
  },
  cardSelected: {
    borderColor: colors.accentRed,
    backgroundColor: '#FBECEE',
  },
  emoji: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  nameSelected: {
    color: colors.accentRed,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    marginBottom: spacing.xxs,
  },
  categoryPillSelected: {
    backgroundColor: colors.accentRed,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryTextSelected: {
    color: '#fff',
  },
  description: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accentYellow,
    marginTop: spacing.xxs,
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accentRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
