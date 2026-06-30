import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
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
  onSelect: (index: number) => void;
}

export default function FoodGrid({ foods, selectedIndex, onSelect }: Props) {
  const scaleValues = useRef<Animated.Value[]>([]);

  const scales = useMemo(() => {
    while (scaleValues.current.length < foods.length) {
      scaleValues.current.push(new Animated.Value(1));
    }
    return scaleValues.current.slice(0, foods.length);
  }, [foods.length]);

  const renderItem = ({ item, index }: { item: Food; index: number }) => {
    const selected = selectedIndex === index;
    const scale = scales[index];

    const handlePress = () => {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.04,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
      onSelect(index);
    };

    return (
      <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handlePress}
          style={[
            styles.card,
            selected && styles.cardSelected,
          ]}
        >
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={[styles.name, selected && styles.nameSelected]}>
            {item.name}
          </Text>
          <Text style={styles.category}>
            {CATEGORY_LABELS[item.category] || item.category}
          </Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <FlatList
      data={foods}
      keyExtractor={(_, i) => String(i)}
      renderItem={renderItem}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#1e1a16',
    borderWidth: 1.5,
    borderColor: '#3a342c',
    borderRadius: 14,
    padding: 14,
  },
  cardSelected: {
    borderColor: '#c4667a',
    backgroundColor: '#3a2028',
  },
  emoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e8e0d4',
    marginBottom: 2,
  },
  nameSelected: {
    color: '#c4667a',
  },
  category: {
    fontSize: 11,
    letterSpacing: 0.6,
    color: '#5c5248',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 11,
    color: '#9a8e7e',
    lineHeight: 16,
  },
});
