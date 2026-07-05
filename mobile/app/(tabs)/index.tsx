import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Alert,
  Modal,
  SafeAreaView,
  TextInput,
  ScrollView,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius, iconSize } from '../../theme';
import { AppIcon } from '../../components/ui/AppIcon';
import { api } from '../../services/api';
import { offlineCache } from '../../services/offlineCache';
import { offlinePairing } from '../../services/offlinePairing';
import MenuScanner from '../../components/MenuScanner';
import FoodGrid from '../../components/FoodGrid';
import WineList from '../../components/WineList';
import LoadingWine from '../../components/LoadingWine';
import WineResult from '../../components/WineResult';
import type { MenuData, PairingResult, PairingRecord, Wine } from '../../types';

type Step = 'scan' | 'foods' | 'pairing' | 'result' | 'multi-result';

const STEP_ORDER: Step[] = ['scan', 'foods', 'pairing', 'result'];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('scan');
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [pairingResult, setPairingResult] = useState<PairingResult | null>(null);
  const [multiResults, setMultiResults] = useState<PairingResult[]>([]);
  const [multiResultIdx, setMultiResultIdx] = useState(0);
  const [multiMode, setMultiMode] = useState(false);
  const [budget, setBudget] = useState<number | null>(null);
  const [showBudgetPicker, setShowBudgetPicker] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteRating, setNoteRating] = useState(0);
  const [currentRecord, setCurrentRecord] = useState<PairingRecord | null>(null);
  const [selectedWineIndexes, setSelectedWineIndexes] = useState<number[]>([]);

  const pairBtnY = useRef(new Animated.Value(100)).current;
  const multiCarouselRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (selectedIdx !== null) {
      Animated.spring(pairBtnY, { toValue: 0, useNativeDriver: true, speed: 18 }).start();
    } else {
      Animated.spring(pairBtnY, { toValue: 100, useNativeDriver: true, speed: 18 }).start();
    }
  }, [selectedIdx, pairBtnY]);

  const saveToHistory = async (record: PairingRecord) => {
    const raw = await AsyncStorage.getItem('@winepair/history');
    const history: PairingRecord[] = raw ? JSON.parse(raw) : [];
    const updated = [record, ...history].slice(0, 50);
    await AsyncStorage.setItem('@winepair/history', JSON.stringify(updated));
  };

  const activeWines = useCallback((): Wine[] => {
    if (!menuData) return [];
    if (selectedWineIndexes.length === 0) return menuData.wines;
    return menuData.wines.filter((_, i) => selectedWineIndexes.includes(i));
  }, [menuData, selectedWineIndexes]);

  const pairWine = useCallback(async () => {
    if (!menuData || selectedIdx == null) return;
    const food = menuData.foods[selectedIdx];
    const wines = activeWines();
    if (wines.length === 0) {
      Alert.alert('Nessun vino', 'Seleziona almeno un vino per l\'abbinamento.');
      return;
    }
    setStep('pairing');
    const [freshUrl, freshModel] = await Promise.all([
      AsyncStorage.getItem('@winepair/api_url'),
      AsyncStorage.getItem('@winepair/model'),
    ]);
    const activeUrl = freshUrl || 'http://178.105.49.3:8000';
    const activeModel = freshModel || 'openrouter/free';
    try {
      const result = await api.pairWine(activeUrl, food, wines, activeModel, budget ?? undefined);
      const record: PairingRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        foodName: food.name,
        wineName: result.wine_name,
        score: result.food_match_score || 0,
        result,
        wines,
      };
      await saveToHistory(record);
      setCurrentRecord(record);
      setPairingResult(result);
      setStep('result');
    } catch (e: any) {
      const offline = offlinePairing(food, wines);
      if (offline) {
        const record: PairingRecord = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          foodName: food.name,
          wineName: offline.wine_name,
          score: offline.food_match_score || 0,
          result: offline,
          wines,
        };
        await saveToHistory(record);
        setCurrentRecord(record);
        setPairingResult(offline);
        setStep('result');
      } else {
        Alert.alert('Errore abbinamento', e.message || 'Impossibile completare l\'abbinamento.');
        setStep('foods');
      }
    }
  }, [menuData, selectedIdx, budget, activeWines]);

  const handleMultiPair = useCallback(async () => {
    if (!menuData || selectedIndexes.length === 0) return;
    const wines = activeWines();
    if (wines.length === 0) {
      Alert.alert('Nessun vino', 'Seleziona almeno un vino per l\'abbinamento.');
      return;
    }
    setStep('pairing');
    const [freshUrl, freshModel] = await Promise.all([
      AsyncStorage.getItem('@winepair/api_url'),
      AsyncStorage.getItem('@winepair/model'),
    ]);
    const activeUrl = freshUrl || 'http://178.105.49.3:8000';
    const activeModel = freshModel || 'openrouter/free';
    const results: PairingResult[] = [];
    try {
      for (const idx of selectedIndexes) {
        const food = menuData.foods[idx];
        const result = await api.pairWine(activeUrl, food, wines, activeModel, budget ?? undefined);
        results.push(result);
        const record: PairingRecord = {
          id: Date.now().toString() + idx,
          date: new Date().toISOString(),
          foodName: food.name,
          wineName: result.wine_name,
          score: result.food_match_score || 0,
          result,
          wines,
        };
        await saveToHistory(record);
      }
      setMultiResults(results);
      setMultiResultIdx(0);
      setStep('multi-result');
    } catch (e: any) {
      Alert.alert('Errore abbinamento', e.message || 'Impossibile completare gli abbinamenti.');
      setStep('foods');
    }
  }, [menuData, selectedIndexes, budget, activeWines]);

  const handleNewMenu = useCallback(() => {
    setStep('scan');
    setMenuData(null);
    setSelectedIdx(null);
    setSelectedIndexes([]);
    setSelectedWineIndexes([]);
    setPairingResult(null);
    setMultiResults([]);
    setMultiMode(false);
    setBudget(null);
    setCurrentRecord(null);
  }, []);

  const handleSaveNote = async () => {
    if (!currentRecord) return;
    currentRecord.tastingNote = noteText.trim() || undefined;
    currentRecord.personalRating = noteRating > 0 ? noteRating * 2 : undefined;
    const raw = await AsyncStorage.getItem('@winepair/history');
    const history: PairingRecord[] = raw ? JSON.parse(raw) : [];
    const idx = history.findIndex((r) => r.id === currentRecord.id);
    if (idx !== -1) {
      history[idx] = currentRecord;
      await AsyncStorage.setItem('@winepair/history', JSON.stringify(history));
    }
    setShowNoteModal(false);
    setNoteText('');
    setNoteRating(0);
  };

  const handleSelect = (index: number) => {
    if (multiMode) {
      setSelectedIndexes((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    } else {
      setSelectedIdx(index);
    }
  };

  const handleWineSelect = (index: number) => {
    setSelectedWineIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const stepIndex = STEP_ORDER.indexOf(step as Step);

  const budgetPresets = [0, 15, 25, 35, 50, 100];

  return (
    <View style={styles.root}>
      {step !== 'pairing' && step !== 'multi-result' && (
        <>
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            {step === 'scan' && (
              <View style={styles.headerRow}>
                <View style={styles.logoRow}>
                  <AppIcon name="wine" size={iconSize.lg} color={colors.accentRed} />
                  <Text style={styles.logo}>WinePair</Text>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity onPress={() => router.push('/reverse-pair')} activeOpacity={0.75} style={styles.reverseBtn}>
                    <AppIcon name="refresh" size={iconSize.sm} color={colors.accentRed} />
                    <Text style={styles.reverseText}>Vino → Cibo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/settings')} activeOpacity={0.75}>
                    <AppIcon name="settings" size={iconSize.md} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {step === 'foods' && (
              <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => { setStep('scan'); setSelectedIdx(null); setSelectedIndexes([]); }} activeOpacity={0.75} style={styles.backRow}>
                  <AppIcon name="chevron-left" size={iconSize.sm} color={colors.accentRed} />
                  <Text style={styles.backText}>Indietro</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scegli il piatto</Text>
                <TouchableOpacity onPress={() => setShowBudgetPicker(!showBudgetPicker)} activeOpacity={0.75} style={styles.budgetToggle}>
                  <AppIcon name="dollar-sign" size={iconSize.sm} color={budget ? colors.accentRed : colors.textSecondary} />
                  {budget && <Text style={styles.budgetLabel}>{budget}€</Text>}
                </TouchableOpacity>
              </View>
            )}
            {step === 'result' && (
              <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => setStep('foods')} activeOpacity={0.75} style={styles.backRow}>
                  <AppIcon name="chevron-left" size={iconSize.sm} color={colors.accentRed} />
                  <Text style={styles.backText}>Indietro</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Abbinamento</Text>
                <TouchableOpacity onPress={() => setShowNoteModal(true)} activeOpacity={0.75} style={styles.noteBtn}>
                  <AppIcon name="pencil" size={iconSize.sm} color={colors.accentRed} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          {step !== 'result' && (
            <View style={styles.progressBar}>
              {STEP_ORDER.map((s, i) => (
                <View
                  key={s}
                  style={[
                    styles.progressSegment,
                    { backgroundColor: i <= stepIndex ? colors.accentRed : colors.border },
                  ]}
                />
              ))}
            </View>
          )}
        </>
      )}
      {step === 'scan' && (
        <MenuScanner
          onMenuExtracted={(data) => {
            offlineCache.saveLastMenu(data);
            setMenuData(data);
            setSelectedIdx(null);
            setSelectedIndexes([]);
            setStep('foods');
          }}
        />
      )}
      {step === 'foods' && menuData && (
        <View style={styles.foodsContainer}>
          {showBudgetPicker && (
            <View style={styles.budgetPicker}>
              <Text style={styles.budgetPickerTitle}>Budget massimo per vino</Text>
              <View style={styles.budgetRow}>
                {budgetPresets.map((p) => (
                  <TouchableOpacity
                    key={p}
                    activeOpacity={0.75}
                    onPress={() => setBudget(p === 0 ? null : p)}
                    style={[
                      styles.budgetChip,
                      p > 0 && budget === p && styles.budgetChipSelected,
                      p === 0 && budget === null && styles.budgetChipSelected,
                    ]}
                  >
                    <Text style={[styles.budgetChipText, p > 0 && budget === p && styles.budgetChipTextSelected, p === 0 && budget === null && styles.budgetChipTextSelected]}>
                      {p === 0 ? 'Tutti' : `${p}€`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <ScrollView
            style={styles.foodsScroll}
            contentContainerStyle={styles.foodsScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.counterBar}>
              <View style={styles.counterRow}>
                <Text style={styles.counterText}>
                  {menuData.foods.length} piatti · {menuData.wines.length} vini
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setMultiMode(!multiMode);
                    setSelectedIdx(null);
                    setSelectedIndexes([]);
                  }}
                  activeOpacity={0.75}
                  style={[styles.modeToggle, multiMode && styles.modeToggleActive]}
                >
                  <Text style={[styles.modeToggleText, multiMode && styles.modeToggleTextActive]}>
                    {multiMode ? 'Menu degustazione' : 'Singolo'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <FoodGrid
              foods={menuData.foods}
              selectedIndex={selectedIdx}
              selectedIndexes={selectedIndexes}
              onSelect={handleSelect}
              multiSelect={multiMode}
            />
            <WineList
              wines={menuData.wines}
              selectedIndexes={selectedWineIndexes}
              onSelect={handleWineSelect}
            />
          </ScrollView>
          {multiMode ? (
            <View style={[styles.stickyBtnWrap, { paddingBottom: insets.bottom + 12 }]}>
              <TouchableOpacity
                style={[styles.stickyBtn, selectedIndexes.length === 0 && styles.stickyBtnDisabled]}
                activeOpacity={0.75}
                onPress={handleMultiPair}
                disabled={selectedIndexes.length === 0}
              >
                <View style={styles.stickyBtnInner}>
                  <AppIcon name="wine" size={iconSize.sm} color="#fff" />
                  <Text style={styles.stickyBtnText}>
                    Abbina {selectedIndexes.length} piatti
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View
              style={[
                styles.stickyBtnWrap,
                {
                  paddingBottom: insets.bottom + 12,
                  transform: [{ translateY: pairBtnY }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.stickyBtn}
                activeOpacity={0.75}
                onPress={pairWine}
              >
                <View style={styles.stickyBtnInner}>
                  <AppIcon name="wine" size={iconSize.sm} color="#fff" />
                  <Text style={styles.stickyBtnText}>
                    Abbina vino a '{menuData.foods[selectedIdx ?? 0]?.name ?? ''}'
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      )}
      {step === 'pairing' && <LoadingWine />}
      {step === 'result' && pairingResult && menuData && selectedIdx != null && (
        <WineResult
          result={pairingResult}
          wines={menuData.wines}
          foodName={menuData.foods[selectedIdx].name}
          onBack={() => setStep('foods')}
          onNewMenu={handleNewMenu}
          tastingNote={currentRecord?.tastingNote}
          personalRating={currentRecord?.personalRating}
        />
      )}
      {step === 'multi-result' && multiResults.length > 0 && menuData && (
        <View style={styles.multiResultRoot}>
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => setStep('foods')} activeOpacity={0.75} style={styles.backRow}>
                <AppIcon name="chevron-left" size={iconSize.sm} color={colors.accentRed} />
                <Text style={styles.backText}>Indietro</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Menu degustazione</Text>
              <View style={styles.headerSpacer} />
            </View>
            <View style={styles.multiDots}>
              {multiResults.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    const offset = i * Dimensions.get('window').width;
                    multiCarouselRef.current?.scrollTo({ x: offset, animated: true });
                    setMultiResultIdx(i);
                  }}
                  activeOpacity={0.75}
                  style={styles.multiDotTouch}
                >
                  <View
                    style={[
                      styles.multiDot,
                      { backgroundColor: i === multiResultIdx ? colors.accentRed : colors.border },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <ScrollView
            ref={multiCarouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const page = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
              setMultiResultIdx(page);
            }}
          >
            {multiResults.map((_, i) => (
              <View key={i} style={{ width: Dimensions.get('window').width }}>
                <WineResult
                  result={multiResults[i]}
                  wines={menuData.wines}
                  foodName={menuData.foods[selectedIndexes[i]]?.name ?? ''}
                  onBack={() => setStep('foods')}
                  onNewMenu={handleNewMenu}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <Modal
        animationType="slide"
        visible={showNoteModal}
        onRequestClose={() => setShowNoteModal(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNoteModal(false)} activeOpacity={0.75}>
              <Text style={styles.modalCancel}>Annulla</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>La mia degustazione</Text>
            <TouchableOpacity onPress={handleSaveNote} activeOpacity={0.75}>
              <Text style={styles.modalSave}>Salva</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.noteForm}>
            <Text style={styles.noteFormLabel}>IL MIO VOTO</Text>
            <View style={styles.noteStarRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setNoteRating(n)} activeOpacity={0.75}>
                  <AppIcon
                    name="star"
                    size={32}
                    color={n <= noteRating ? colors.accentYellow : colors.border}
                    strokeWidth={n <= noteRating ? 2.5 : 1.5}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.noteFormLabel}>NOTE DI DEGUSTAZIONE</Text>
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Colore, profumi, gusto, impressioni…"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reverseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
  },
  reverseText: {
    color: colors.accentRed,
    fontSize: 11,
    fontWeight: '600',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logo: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
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
  budgetToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
  },
  budgetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentRed,
  },
  noteBtn: {
    padding: spacing.xs,
  },
  progressBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 99,
  },
  foodsContainer: { flex: 1, position: 'relative' },
  foodsScroll: { flex: 1 },
  foodsScrollContent: { paddingBottom: 100 },
  budgetPicker: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  budgetPickerTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  budgetChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  budgetChipSelected: {
    borderColor: colors.accentRed,
    backgroundColor: '#FBECEE',
  },
  budgetChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  budgetChipTextSelected: {
    color: colors.accentRed,
    fontWeight: '700',
  },
  counterBar: {
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modeToggle: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  modeToggleActive: {
    borderColor: colors.accentRed,
    backgroundColor: '#FBECEE',
  },
  modeToggleText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modeToggleTextActive: {
    color: colors.accentRed,
    fontWeight: '700',
  },
  stickyBtnWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  stickyBtn: {
    backgroundColor: colors.accentRed,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  stickyBtnDisabled: {
    opacity: 0.5,
  },
  stickyBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stickyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  multiResultRoot: { flex: 1, backgroundColor: colors.background },
  multiDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  multiDotTouch: {
    padding: spacing.xs,
  },
  multiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalRoot: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  modalCancel: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  modalSave: {
    color: colors.accentRed,
    fontSize: 16,
    fontWeight: '600',
  },
  noteForm: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  noteFormLabel: {
    textTransform: 'uppercase',
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  noteStarRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  noteInput: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
});
