import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, iconSize } from '../../theme';
import { AppIcon } from '../../components/ui/AppIcon';
import WineResult from '../../components/WineResult';
import type { PairingRecord } from '../../types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function StarRating({ score }: { score: number }) {
  const n = Math.round(score / 2);
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <AppIcon
          key={i}
          name="star"
          size={12}
          color={i < n ? colors.accentYellow : colors.border}
          strokeWidth={i < n ? 2.5 : 1.5}
        />
      ))}
    </View>
  );
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<PairingRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<PairingRecord | null>(null);
  const [showModal, setShowModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem('@winepair/history');
          if (raw) setHistory(JSON.parse(raw));
        } catch {
          // ignore
        }
      })();
    }, []),
  );

  const deleteRecord = useCallback(async (id: string) => {
    const updated = history.filter((r) => r.id !== id);
    setHistory(updated);
    await AsyncStorage.setItem('@winepair/history', JSON.stringify(updated));
  }, [history]);

  const confirmDelete = useCallback(
    (id: string) => {
      Alert.alert('Elimina abbinamento?', 'Non potrai recuperarlo.', [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => deleteRecord(id),
        },
      ]);
    },
    [deleteRecord],
  );

  if (history.length === 0) {
    return (
      <View style={styles.emptyRoot}>
        <View style={styles.emptyIconWrap}>
          <AppIcon name="history" size={40} color={colors.border} />
        </View>
        <Text style={styles.emptyTitle}>Nessun abbinamento ancora</Text>
        <Text style={styles.emptyDesc}>
          Gli abbinamenti appariranno qui dopo aver usato l'app
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              setSelectedRecord(item);
              setShowModal(true);
            }}
            onLongPress={() => confirmDelete(item.id)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardBadge}>
                <AppIcon name="wine" size={14} color={colors.accentRed} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.result.wine_name}
              </Text>
            </View>
            <Text style={styles.cardFood}>Per: {item.foodName}</Text>
            <View style={styles.cardFooter}>
              <StarRating score={item.score} />
              <Text style={styles.cardDate}>
                {formatDate(item.date)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal
        animationType="slide"
        visible={showModal}
        onRequestClose={() => setShowModal(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)} activeOpacity={0.75} style={styles.backRow}>
              <AppIcon name="chevron-left" size={iconSize.sm} color={colors.accentRed} />
              <Text style={styles.modalClose}>Chiudi</Text>
            </TouchableOpacity>
          </View>
          {selectedRecord && (
            <WineResult
              result={selectedRecord.result}
              wines={selectedRecord.wines}
              foodName={selectedRecord.foodName}
              onBack={() => setShowModal(false)}
              onNewMenu={() => {
                setShowModal(false);
                router.push('/');
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  emptyRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.background,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },
  cardFood: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    marginLeft: 36,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginLeft: 36,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  cardDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalRoot: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  modalClose: {
    color: colors.accentRed,
    fontSize: 15,
    fontWeight: '600',
  },
});
