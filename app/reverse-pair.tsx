import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, borderRadius, iconSize } from '../theme';
import { AppIcon } from '../components/ui/AppIcon';
import { api } from '../services/api';
import { settingsStorage } from '../services/settings';
import { getWineAccent, getWineSoftBg } from '../theme/helpers';
import type { FoodSuggestion } from '../types';

const WINE_TYPES = [
  { id: 'rosso', label: 'Rosso' },
  { id: 'bianco', label: 'Bianco' },
  { id: 'rosè', label: 'Rosè' },
  { id: 'spumante', label: 'Spumante' },
  { id: 'dolce', label: 'Dolce' },
];

export default function ReversePairScreen() {
  const [apiUrl, setApiUrl] = useState('http://178.105.49.3:8000');
  const [model, setModel] = useState('openrouter/free');

  useEffect(() => {
    settingsStorage.getAll().then(({ apiUrl: url, model: m }) => {
      setApiUrl(url);
      setModel(m);
    });
  }, []);
  const [wineType, setWineType] = useState('rosso');
  const [wineName, setWineName] = useState('');
  const [region, setRegion] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await api.pairReverse(apiUrl, {
        wine_type: wineType,
        name: wineName.trim() || undefined,
        region: region.trim() || undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
      }, model);
      if (res.suggestions.length === 0) {
        Alert.alert('Nessun suggerimento', 'Il modello non ha trovato abbinamenti validi.');
        return;
      }
      setSuggestions(res.suggestions);
    } catch (e: any) {
      Alert.alert('Errore', e.message || 'Impossibile trovare abbinamenti.');
    } finally {
      setLoading(false);
    }
  };

  const accent = getWineAccent(wineType);
  const softBg = getWineSoftBg(wineType);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.75} style={styles.backRow}>
          <AppIcon name="chevron-left" size={iconSize.sm} color={colors.accentRed} />
          <Text style={styles.backText}>Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vino → Cibo</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: softBg }]}>
            <AppIcon name="wine" size={32} color={accent} />
          </View>
          <Text style={styles.heroTitle}>Ho un vino, cosa ci abbino?</Text>
          <Text style={styles.heroDesc}>
            Seleziona il tipo di vino e scopri i piatti perfetti
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>TIPO DI VINO</Text>
          <View style={styles.typeRow}>
            {WINE_TYPES.map((t) => {
              const selected = wineType === t.id;
              const tAccent = getWineAccent(t.id);
              const tSoft = getWineSoftBg(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.75}
                  onPress={() => setWineType(t.id)}
                  style={[
                    styles.typeBtn,
                    selected && { backgroundColor: tSoft, borderColor: tAccent },
                  ]}
                >
                  <Text style={[styles.typeBtnText, selected && { color: tAccent, fontWeight: '700' }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>NOME (opzionale)</Text>
          <TextInput
            style={styles.input}
            value={wineName}
            onChangeText={setWineName}
            placeholder="es. Barolo, Chianti..."
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.fieldLabel}>REGIONE (opzionale)</Text>
          <TextInput
            style={styles.input}
            value={region}
            onChangeText={setRegion}
            placeholder="es. Piemonte, Toscana..."
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.fieldLabel}>BUDGET MASSIMO (opzionale)</Text>
          <TextInput
            style={styles.input}
            value={maxPrice}
            onChangeText={setMaxPrice}
            placeholder="es. 30"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
          />

          <TouchableOpacity
            style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
            onPress={handleSearch}
            disabled={loading}
            activeOpacity={0.75}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.searchBtnInner}>
                <AppIcon name="search" size={iconSize.sm} color="#fff" />
                <Text style={styles.searchBtnText}>Trova abbinamenti</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {suggestions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Abbinamenti consigliati</Text>
            {suggestions.map((s, i) => (
              <View key={i} style={styles.suggestionCard}>
                <View style={styles.suggestionHeader}>
                  <Text style={styles.suggestionEmoji}>{s.emoji}</Text>
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.suggestionName}>{s.name}</Text>
                    <Text style={styles.suggestionCategory}>
                      {s.category}
                    </Text>
                  </View>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{s.score}/10</Text>
                  </View>
                </View>
                {s.description ? (
                  <Text style={styles.suggestionDesc}>{s.description}</Text>
                ) : null}
                <Text style={styles.suggestionReason}>"{s.pairing_reason}"</Text>
                <View style={styles.principleRow}>
                  <Text style={styles.principleLabel}>Principio</Text>
                  <Text style={styles.principleValue}>{s.pairing_principle}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  backText: {
    color: colors.accentRed,
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  headerSpacer: { width: 80 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    textTransform: 'uppercase',
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    color: colors.textPrimary,
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: colors.accentRed,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.7,
  },
  searchBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  suggestionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  suggestionEmoji: {
    fontSize: 28,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  suggestionCategory: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scoreBadge: {
    backgroundColor: colors.accentYellow,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  scoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  suggestionReason: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: spacing.xs,
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
});
