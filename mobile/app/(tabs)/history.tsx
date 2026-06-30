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
import WineResult from '../../components/WineResult';
import type { PairingRecord } from '../../types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function stars(score: number): string {
  const n = Math.round(score / 2);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
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
        <Text style={styles.emptyEmoji}>📋</Text>
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
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.result.wine_name}
            </Text>
            <Text style={styles.cardFood}>Per: {item.foodName}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardStars}>
                {stars(item.score)}
              </Text>
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
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)} activeOpacity={0.75}>
              <Text style={styles.modalClose}>← Chiudi</Text>
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
  root: { flex: 1, backgroundColor: '#13100d' },
  emptyRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#13100d',
  },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: {
    fontFamily: 'serif',
    fontSize: 20,
    color: '#e8e0d4',
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9a8e7e',
    textAlign: 'center',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#191512',
    borderWidth: 1,
    borderColor: '#3a342c',
    borderRadius: 14,
    padding: 16,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: '#e8e0d4',
  },
  cardFood: {
    fontSize: 13,
    color: '#9a8e7e',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  cardStars: {
    color: '#e8a832',
    letterSpacing: 2,
    fontSize: 12,
  },
  cardDate: {
    fontSize: 12,
    color: '#5c5248',
  },
  modalRoot: { flex: 1, backgroundColor: '#13100d' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c271f',
  },
  modalClose: {
    color: '#c4667a',
    fontSize: 15,
    fontWeight: '600',
  },
});
