import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { colors, spacing, borderRadius, iconSize } from '../../theme';
import { AppIcon } from '../../components/ui/AppIcon';
import { cellarStorage } from '../../services/cellar';
import { getWineAccent, getWineSoftBg } from '../../theme/helpers';
import type { CellarWine } from '../../types';

const WINE_TYPES: CellarWine['type'][] = ['rosso', 'bianco', 'rosè', 'spumante', 'dolce'];

function AddWineModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (wine: CellarWine) => void;
}) {
  const [name, setName] = useState('');
  const [wineType, setWineType] = useState<CellarWine['type']>('rosso');
  const [region, setRegion] = useState('');
  const [vintage, setVintage] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Nome richiesto', 'Inserisci il nome del vino.');
      return;
    }
    onSave({
      id: Date.now().toString(),
      name: name.trim(),
      type: wineType,
      region: region.trim() || undefined,
      vintage: vintage.trim() || null,
      price: price.trim() || undefined,
      bottleCount: 1,
      note: note.trim() || undefined,
      addedAt: new Date().toISOString(),
    });
    setName('');
    setWineType('rosso');
    setRegion('');
    setVintage('');
    setPrice('');
    setNote('');
  };

  return (
    <Modal
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
            <Text style={styles.modalCancel}>Annulla</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Aggiungi vino</Text>
          <TouchableOpacity onPress={handleSave} activeOpacity={0.75}>
            <Text style={styles.modalSave}>Salva</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>NOME *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="es. Barolo DOCG"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.fieldLabel}>TIPO</Text>
          <View style={styles.typeRow}>
            {WINE_TYPES.map((t) => {
              const selected = wineType === t;
              const accent = getWineAccent(t);
              const softBg = getWineSoftBg(t);
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.75}
                  onPress={() => setWineType(t)}
                  style={[
                    styles.typeBtn,
                    selected && { backgroundColor: softBg, borderColor: accent },
                  ]}
                >
                  <Text style={[styles.typeBtnText, selected && { color: accent, fontWeight: '700' }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.fieldLabel}>REGIONE</Text>
          <TextInput
            style={styles.input}
            value={region}
            onChangeText={setRegion}
            placeholder="es. Piemonte"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.fieldLabel}>ANNATA</Text>
          <TextInput
            style={styles.input}
            value={vintage}
            onChangeText={setVintage}
            placeholder="es. 2018"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
          />
          <Text style={styles.fieldLabel}>PREZZO</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="es. 25€"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.fieldLabel}>NOTE</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={note}
            onChangeText={setNote}
            placeholder="Note personali…"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function CellarScreen() {
  const [cellar, setCellar] = useState<CellarWine[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const data = await cellarStorage.getAll();
        setCellar(data);
      })();
    }, []),
  );

  const handleAdd = async (wine: CellarWine) => {
    await cellarStorage.add(wine);
    const data = await cellarStorage.getAll();
    setCellar(data);
    setShowAdd(false);
  };

  const confirmDelete = (id: string, name: string) => {
    Alert.alert(`Elimina ${name}?`, 'Non potrai recuperarlo.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await cellarStorage.remove(id);
          const data = await cellarStorage.getAll();
          setCellar(data);
        },
      },
    ]);
  };

  if (cellar.length === 0) {
    return (
      <View style={styles.emptyRoot}>
        <View style={styles.emptyIconWrap}>
          <AppIcon name="grape" size={40} color={colors.border} />
        </View>
        <Text style={styles.emptyTitle}>Cantina vuota</Text>
        <Text style={styles.emptyDesc}>
          Aggiungi i tuoi vini per tenerli traccia
        </Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAdd(true)}
          activeOpacity={0.75}
        >
          <AppIcon name="plus" size={iconSize.sm} color="#fff" />
          <Text style={styles.addBtnText}>Aggiungi vino</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={cellar}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const accent = getWineAccent(item.type);
          const softBg = getWineSoftBg(item.type);
          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onLongPress={() => confirmDelete(item.id, item.name)}
              style={styles.card}
            >
              <View style={[styles.cardIcon, { backgroundColor: softBg }]}>
                <AppIcon name="wine" size={20} color={accent} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{item.name}</Text>
                <View style={styles.cardMeta}>
                  <View style={[styles.cardBadge, { backgroundColor: softBg }]}>
                    <Text style={[styles.cardBadgeText, { color: accent }]}>
                      {item.type}
                    </Text>
                  </View>
                  {item.region ? (
                    <Text style={styles.cardRegion}>{item.region}</Text>
                  ) : null}
                  {item.vintage ? (
                    <Text style={styles.cardRegion}>{item.vintage}</Text>
                  ) : null}
                  {item.price ? (
                    <Text style={styles.cardPrice}>{item.price}</Text>
                  ) : null}
                </View>
                {item.note ? (
                  <Text style={styles.cardNote} numberOfLines={1}>{item.note}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.75}
      >
        <AppIcon name="plus" size={24} color="#fff" />
      </TouchableOpacity>
      <AddWineModal visible={showAdd} onClose={() => setShowAdd(false)} onSave={handleAdd} />
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
    marginBottom: spacing.xl,
  },
  addBtn: {
    flexDirection: 'row',
    backgroundColor: colors.accentRed,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  cardBadge: {
    borderRadius: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  cardBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardRegion: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentYellow,
  },
  cardNote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentRed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
  form: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  fieldLabel: {
    textTransform: 'uppercase',
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
});
