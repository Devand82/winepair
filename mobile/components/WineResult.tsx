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
import type { PairingResult, Wine } from '../types';

const TYPE_EMOJI: Record<string, string> = {
  rosso: '🍷',
  bianco: '🥂',
  'rosè': '🌸',
  spumante: '🍾',
  dolce: '🍯',
};

function stars(score: number | undefined): string {
  const n = Math.round((score ?? 0) / 2);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

interface Props {
  result: PairingResult;
  wines: Wine[];
  foodName: string;
  onBack: () => void;
  onNewMenu: () => void;
}

export default function WineResult({
  result,
  wines,
  foodName,
  onBack,
  onNewMenu,
}: Props) {
  const slideY = useRef(new Animated.Value(-30)).current;
  const icon = TYPE_EMOJI[result.wine_type] || '🍷';
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
    const message = [
      `🍷 WinePair — Abbinamento per "${foodName}"`,
      '',
      `${icon} ${result.wine_name}`,
      result.region
        ? `📍 ${result.region}${result.vintage ? ' · ' + result.vintage : ''}`
        : '',
      result.menu_price ? `💰 ${result.menu_price} nel menù` : '',
      result.avg_market_price ? `   Mercato: ~${result.avg_market_price}` : '',
      '',
      result.pairing_reason ? `"${result.pairing_reason}"` : '',
      '',
      `Score: ${result.food_match_score || '–'}/10  ${stars(result.food_match_score)}`,
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
        <Text style={styles.headerLabel}>Per · {foodName}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={shareResult} activeOpacity={0.75}>
          <Text style={styles.shareBtnText}>↑ Condividi</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[styles.wineCard, { transform: [{ translateY: slideY }] }]}
      >
        <Text style={styles.wineEmoji}>{icon}</Text>
        <Text style={styles.wineName}>{result.wine_name}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.badgeType}>
            <Text style={styles.badgeTypeText}>{result.wine_type}</Text>
          </View>
          {result.region ? (
            <View style={styles.badgeRegion}>
              <Text style={styles.badgeRegionText}>{result.region}</Text>
            </View>
          ) : null}
          {result.vintage ? (
            <View style={styles.badgeVintage}>
              <Text style={styles.badgeVintageText}>{result.vintage}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.priceRow}>
          {result.menu_price ? (
            <View>
              <Text style={styles.priceLabel}>NEL MENÙ</Text>
              <Text style={styles.priceValue}>{result.menu_price}</Text>
            </View>
          ) : null}
          {result.avg_market_price ? (
            <View>
              <Text style={styles.priceLabel}>MERCATO ~</Text>
              <Text style={styles.marketValue}>{result.avg_market_price}</Text>
            </View>
          ) : null}
          <View style={styles.scoreBlock}>
            <Text style={styles.stars}>
              {stars(result.food_match_score)}
            </Text>
            <Text style={styles.scoreNum}>
              {result.food_match_score || '–'}/10
            </Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.detailGrid}>
        <View style={styles.detailRow}>
          {result.color ? (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>🎨 COLORE</Text>
              <Text style={styles.detailValue}>{result.color}</Text>
            </View>
          ) : null}
          {result.nose ? (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>👃 PROFUMI</Text>
              <Text style={styles.detailValue}>{result.nose}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.detailRow}>
          {result.palate ? (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>👅 GUSTO</Text>
              <Text style={styles.detailValue}>{result.palate}</Text>
            </View>
          ) : null}
          {result.temperature ? (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>🌡️ SERVIZIO</Text>
              <Text style={styles.detailValue}>{result.temperature}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {result.pairing_reason ? (
        <View style={styles.reasonCard}>
          <Text style={styles.reasonLabel}>
            🎯 PERCHÉ QUESTO ABBINAMENTO
          </Text>
          <Text style={styles.reasonText}>{result.pairing_reason}</Text>
          {result.pairing_principle ? (
            <Text style={styles.principle}>
              Principio: {result.pairing_principle}
            </Text>
          ) : null}
        </View>
      ) : null}

      {altWine ? (
        <View style={styles.altCard}>
          <Text style={styles.altLabel}>ALTERNATIVA DISPONIBILE</Text>
          <Text style={styles.altName}>{altWine.name}</Text>
          <Text style={styles.altDesc}>
            {altWine.type} · {altWine.region}
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
          <Text style={styles.backBtnText}>← Cambia piatto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.newMenuBtn} onPress={onNewMenu} activeOpacity={0.75}>
          <Text style={styles.newMenuBtnText}>🔄 Nuovo menù</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#13100d',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLabel: {
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '600',
    color: '#5c5248',
    flex: 1,
  },
  shareBtn: {
    backgroundColor: '#28231d',
    borderWidth: 1,
    borderColor: '#3a342c',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  shareBtnText: {
    color: '#c4667a',
    fontSize: 13,
    fontWeight: '600',
  },
  wineCard: {
    backgroundColor: '#1e1a16',
    borderWidth: 1,
    borderColor: 'rgba(196,102,122,0.3)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  wineEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  wineName: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#e8e0d4',
    lineHeight: 28,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badgeType: {
    backgroundColor: '#3a2028',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTypeText: {
    color: '#c4667a',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeRegion: {
    backgroundColor: '#3d3018',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeRegionText: {
    color: '#e8a832',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeVintage: {
    backgroundColor: '#28231d',
    borderWidth: 1,
    borderColor: '#3a342c',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeVintageText: {
    color: '#9a8e7e',
    fontSize: 12,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-end',
  },
  priceLabel: {
    textTransform: 'uppercase',
    fontSize: 11,
    color: '#5c5248',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#e8a832',
    fontFamily: 'serif',
  },
  marketValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9a8e7e',
  },
  scoreBlock: {},
  stars: {
    fontSize: 16,
    color: '#e8a832',
    letterSpacing: 2,
  },
  scoreNum: {
    fontSize: 12,
    color: '#9a8e7e',
    marginTop: 2,
  },
  detailGrid: {
    gap: 10,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailBlock: {
    flex: 1,
    backgroundColor: '#1e1a16',
    borderWidth: 1,
    borderColor: '#2c271f',
    borderRadius: 12,
    padding: 14,
  },
  detailLabel: {
    textTransform: 'uppercase',
    fontSize: 11,
    color: '#5c5248',
    fontWeight: '600',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 14,
    color: '#e8e0d4',
    lineHeight: 20,
  },
  reasonCard: {
    backgroundColor: '#3a2028',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  reasonLabel: {
    textTransform: 'uppercase',
    color: '#c4667a',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  reasonText: {
    fontFamily: 'serif',
    fontSize: 15,
    color: '#e8e0d4',
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  principle: {
    color: '#c4667a',
    fontSize: 12,
    fontWeight: '600',
  },
  altCard: {
    backgroundColor: '#1e1a16',
    borderWidth: 1,
    borderColor: '#3a342c',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  altLabel: {
    textTransform: 'uppercase',
    color: '#5c5248',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  altName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e8e0d4',
    marginBottom: 4,
  },
  altDesc: {
    fontSize: 12,
    color: '#9a8e7e',
    marginBottom: 4,
  },
  altPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e8a832',
    marginBottom: 4,
  },
  altNote: {
    fontSize: 13,
    color: '#9a8e7e',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backBtn: {
    flex: 1,
    backgroundColor: '#28231d',
    borderWidth: 1,
    borderColor: '#3a342c',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#e8e0d4',
    fontWeight: '600',
    fontSize: 14,
  },
  newMenuBtn: {
    flex: 1,
    backgroundColor: '#c4667a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  newMenuBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
