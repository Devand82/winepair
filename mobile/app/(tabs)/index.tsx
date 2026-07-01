import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, iconSize } from '../../theme';
import { AppIcon } from '../../components/ui/AppIcon';
import { useSettings } from '../../hooks/useSettings';
import { api } from '../../services/api';
import { offlineCache } from '../../services/offlineCache';
import { offlinePairing } from '../../services/offlinePairing';
import MenuScanner from '../../components/MenuScanner';
import FoodGrid from '../../components/FoodGrid';
import LoadingWine from '../../components/LoadingWine';
import WineResult from '../../components/WineResult';
import type { MenuData, PairingResult, PairingRecord } from '../../types';

type Step = 'scan' | 'foods' | 'pairing' | 'result';

const STEP_ORDER: Step[] = ['scan', 'foods', 'pairing', 'result'];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { apiUrl, model } = useSettings();

  const [step, setStep] = useState<Step>('scan');
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [pairingResult, setPairingResult] = useState<PairingResult | null>(null);

  const pairBtnY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (selectedIdx !== null) {
      Animated.spring(pairBtnY, { toValue: 0, useNativeDriver: true, speed: 18 }).start();
    } else {
      Animated.spring(pairBtnY, { toValue: 100, useNativeDriver: true, speed: 18 }).start();
    }
  }, [selectedIdx, pairBtnY]);

  const pairWine = useCallback(async () => {
    if (!menuData || selectedIdx == null) return;
    const food = menuData.foods[selectedIdx];
    setStep('pairing');
    try {
      const result = await api.pairWine(apiUrl, food, menuData.wines, model);
      const record: PairingRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        foodName: food.name,
        wineName: result.wine_name,
        score: result.food_match_score || 0,
        result,
        wines: menuData.wines,
      };
      const raw = await AsyncStorage.getItem('@winepair/history');
      const history: PairingRecord[] = raw ? JSON.parse(raw) : [];
      const updated = [record, ...history].slice(0, 50);
      await AsyncStorage.setItem('@winepair/history', JSON.stringify(updated));
      setPairingResult(result);
      setStep('result');
    } catch (e: any) {
      const offline = offlinePairing(food, menuData.wines);
      if (offline) {
        const record: PairingRecord = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          foodName: food.name,
          wineName: offline.wine_name,
          score: offline.food_match_score || 0,
          result: offline,
          wines: menuData.wines,
        };
        const raw = await AsyncStorage.getItem('@winepair/history');
        const history: PairingRecord[] = raw ? JSON.parse(raw) : [];
        const updated = [record, ...history].slice(0, 50);
        await AsyncStorage.setItem('@winepair/history', JSON.stringify(updated));
        setPairingResult(offline);
        setStep('result');
      } else {
        Alert.alert('Errore abbinamento', e.message || 'Impossibile completare l\'abbinamento.');
        setStep('foods');
      }
    }
  }, [menuData, selectedIdx, apiUrl, model]);

  const handleNewMenu = useCallback(() => {
    setStep('scan');
    setMenuData(null);
    setSelectedIdx(null);
    setPairingResult(null);
  }, []);

  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <View style={styles.root}>
      {step !== 'pairing' && (
        <>
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            {step === 'scan' && (
              <View style={styles.headerRow}>
                <View style={styles.logoRow}>
                  <AppIcon name="wine" size={iconSize.lg} color={colors.accentRed} />
                  <Text style={styles.logo}>WinePair</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/settings')} activeOpacity={0.75}>
                  <AppIcon name="settings" size={iconSize.md} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            {step === 'foods' && (
              <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => { setStep('scan'); setSelectedIdx(null); }} activeOpacity={0.75} style={styles.backRow}>
                <AppIcon name="chevron-left" size={iconSize.sm} color={colors.accentRed} />
                <Text style={styles.backText}>Indietro</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scegli il piatto</Text>
                <View style={styles.headerSpacer} />
              </View>
            )}
            {step === 'result' && (
              <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => setStep('foods')} activeOpacity={0.75} style={styles.backRow}>
                <AppIcon name="chevron-left" size={iconSize.sm} color={colors.accentRed} />
                <Text style={styles.backText}>Indietro</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Abbinamento</Text>
                <View style={styles.headerSpacer} />
              </View>
            )}
          </View>
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
        </>
      )}
      {step === 'scan' && (
        <MenuScanner
          onMenuExtracted={(data) => {
            offlineCache.saveLastMenu(data);
            setMenuData(data);
            setSelectedIdx(null);
            setStep('foods');
          }}
        />
      )}
      {step === 'foods' && menuData && (
        <View style={styles.foodsContainer}>
          <View style={styles.counterBar}>
            <Text style={styles.counterText}>
              {menuData.foods.length} piatti trovati · {menuData.wines.length} vini
            </Text>
          </View>
          <FoodGrid
            foods={menuData.foods}
            selectedIndex={selectedIdx}
            onSelect={setSelectedIdx}
          />
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
        />
      )}
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
  counterBar: {
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  counterText: {
    fontSize: 13,
    color: colors.textSecondary,
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
});
