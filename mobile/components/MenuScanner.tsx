import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius, iconSize } from '../theme';
import { AppIcon } from './ui/AppIcon';
import { api } from '../services/api';
import { cellarStorage } from '../services/cellar';
import QRScanner from './QRScanner';
import type { MenuData, IdentifiedWine, CellarWine } from '../types';

const SAMPLE_MENU = `ANTIPASTI
Bruschetta al pomodoro fresco - 8€
Tagliere di salumi misti (prosciutto, mortadella) - 16€
Burrata pugliese con pomodorini confit - 14€
Carpaccio di manzo con rucola e parmigiano - 18€

PRIMI
Spaghetti alla carbonara - 16€
Risotto ai funghi porcini e tartufo nero - 22€
Pappardelle al ragù di cinghiale - 18€
Linguine alle vongole in bianco - 20€

SECONDI
Bistecca di Chianina alla brace 350g - 38€
Filetto di branzino al forno con erbe aromatiche - 26€
Agnello al forno con rosmarino e patate - 28€

CARTA VINI
Barolo DOCG Giacomo Conterno 2018 - 95€
Chianti Classico Riserva Antinori 2019 - 48€
Brunello di Montalcino Banfi 2016 - 110€
Soave Classico Pieropan 2021 - 35€
Vermentino di Sardegna Argiolas 2022 - 28€
Pinot Grigio Alto Adige Elena Walch 2022 - 32€
Franciacorta Brut DOCG Ca del Bosco - 55€
Prosecco Valdobbiadene Superiore - 22€`;

const LOADING_TEXTS = [
  'Riconoscendo i piatti…',
  'Identificando la carta vini…',
  'Strutturando il menù…',
];

interface Props {
  onMenuExtracted: (data: MenuData) => void;
}

export default function MenuScanner({ onMenuExtracted }: Props) {
  const insets = useSafeAreaInsets();
  const [menuText, setMenuText] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loadingText, setLoadingText] = useState(LOADING_TEXTS[0]);
  const [currentModel, setCurrentModel] = useState('openrouter/free');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [menuUrl, setMenuUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@winepair/model').then((m) => {
      if (m) setCurrentModel(m);
    });
  }, []);

  const visionUnsupported = currentModel === 'anthropic/claude-3.5-haiku';
  const loadingInterval = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    return () => {
      if (loadingInterval.current) clearInterval(loadingInterval.current);
    };
  }, []);

  const requestCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permesso necessario',
        'Autorizza l\'accesso alla fotocamera nelle impostazioni per scattare foto del menù.',
      );
      return false;
    }
    return true;
  };

  const requestGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permesso necessario',
        'Autorizza l\'accesso alla galleria nelle impostazioni per selezionare foto del menù.',
      );
      return false;
    }
    return true;
  };

  const pickCamera = async () => {
    const ok = await requestCamera();
    if (!ok) return;
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setImageUris((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (e: any) {
      Alert.alert('Errore fotocamera', e?.message || 'Impossibile aprire la fotocamera.');
    }
  };

  const pickGallery = async () => {
    const ok = await requestGallery();
    if (!ok) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
      });
      if (!result.canceled && result.assets?.length) {
        const uris = result.assets.map((a) => a.uri);
        setImageUris((prev) => [...prev, ...uris]);
      }
    } catch (e: any) {
      Alert.alert('Errore galleria', e?.message || 'Impossibile aprire la galleria.');
    }
  };

  const removeImage = (uri: string) => {
    setImageUris((prev) => prev.filter((u) => u !== uri));
  };

  const handleAnalyze = async () => {
    if (!menuText.trim() && imageUris.length === 0) {
      Alert.alert('Inserisci il menù', 'Scatta una foto o incolla il testo del menù.');
      return;
    }
    // Legge impostazioni fresche da AsyncStorage (potrebbero essere state cambiate in Settings)
    const [storedUrl, storedModel] = await Promise.all([
      AsyncStorage.getItem('@winepair/api_url'),
      AsyncStorage.getItem('@winepair/model'),
    ]);
    const apiUrl = storedUrl || 'http://178.105.49.3:8000';
    const model = storedModel || 'openrouter/free';
    setCurrentModel(model);

    setLoading(true);
    let idx = 0;
    loadingInterval.current = setInterval(() => {
      idx = (idx + 1) % LOADING_TEXTS.length;
      setLoadingText(LOADING_TEXTS[idx]);
    }, 2000);

    try {
      let data: MenuData;
      if (imageUris.length > 0) {
        const imageModel = model === 'anthropic/claude-3.5-haiku' ? 'openrouter/free' : model;
        data = await api.extractImage(
          apiUrl,
          imageUris,
          'image/jpeg',
          imageModel,
          menuText || undefined,
        );
      } else {
        data = await api.extractText(apiUrl, menuText, model);
      }
      if (data.foods.length === 0) {
        Alert.alert('Nessun piatto trovato', 'Nessun piatto trovato nel menù.');
        return;
      }
      if (data.wines.length === 0) {
        Alert.alert(
          'Nessun vino trovato',
          'Assicurati di includere la carta vini nel testo.',
        );
        return;
      }
      if (data.raw_text) {
        setMenuText(data.raw_text);
      }
      onMenuExtracted(data);
    } catch (e: any) {
      const msg = e.message || 'Impossibile analizzare il menù.';
      const detail = imageUris.length > 0
        ? 'Errore durante l\'analisi dell\'immagine. Verifica che il server sia raggiungibile e riprova.'
        : 'Verifica che il server sia raggiungibile e riprova.';
      Alert.alert('Errore', `${msg}\n\n${detail}`);
    } finally {
      clearInterval(loadingInterval.current);
      setLoading(false);
    }
  };

  const handleFetchUrl = async () => {
    const url = menuUrl.trim();
    if (!url) {
      Alert.alert('Inserisci URL', 'Incolla l\'URL del menù digitale.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert('URL non valido', 'L\'URL deve iniziare con http:// o https://');
      return;
    }
    const [storedUrl, storedModel] = await Promise.all([
      AsyncStorage.getItem('@winepair/api_url'),
      AsyncStorage.getItem('@winepair/model'),
    ]);
    const apiUrl = storedUrl || 'http://178.105.49.3:8000';
    const model = storedModel || 'openrouter/free';
    setUrlLoading(true);
    try {
      const data = await api.fetchMenu(apiUrl, url, model);
      if (data.foods.length === 0) {
        Alert.alert('Nessun piatto trovato', 'Nessun piatto trovato nel menù scaricato.');
        return;
      }
      if (data.wines.length === 0) {
        Alert.alert('Nessun vino trovato', 'Assicurati che il menù includa la carta vini.');
        return;
      }
      if (data.raw_text) {
        setMenuText(data.raw_text);
      }
      onMenuExtracted(data);
    } catch (e: any) {
      Alert.alert('Errore', e.message || 'Impossibile scaricare il menù dall\'URL.');
    } finally {
      setUrlLoading(false);
    }
  };

  const handleScanLabel = async () => {
    const ok = await requestCamera();
    if (!ok) return;
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setLoading(true);
      const storedUrl = await AsyncStorage.getItem('@winepair/api_url');
      const apiUrl = storedUrl || 'http://178.105.49.3:8000';
      const wineData: IdentifiedWine = await api.identifyWine(
        apiUrl,
        result.assets[0].uri,
        'openai/gpt-4o',
      );
      const cellarWine: CellarWine = {
        id: Date.now().toString(),
        name: wineData.name,
        type: (wineData.type as CellarWine['type']) || 'rosso',
        region: wineData.region,
        vintage: wineData.vintage,
        bottleCount: 1,
        addedAt: new Date().toISOString(),
      };
      await cellarStorage.add(cellarWine);
      Alert.alert(
        'Vino identificato!',
        `${wineData.name}${wineData.region ? ` (${wineData.region})` : ''} è stato aggiunto alla tua cantina.`,
      );
    } catch (e: any) {
      Alert.alert('Errore', e.message || 'Impossibile identificare il vino.');
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      setLoading(true);
      const storedUrl = await AsyncStorage.getItem('@winepair/api_url');
      const storedModel = await AsyncStorage.getItem('@winepair/model');
      const apiUrl = storedUrl || 'http://178.105.49.3:8000';
      const model = storedModel || 'openrouter/free';
      const files = result.assets.map((a) => ({
        uri: a.uri,
        type: a.mimeType || 'application/octet-stream',
        name: a.name || `file_${Date.now()}`,
      }));
      const data = await api.extractDocument(apiUrl, files, model, menuText || undefined);
      if (data.foods.length === 0) {
        Alert.alert('Nessun piatto trovato', 'Nessun piatto trovato nel documento.');
        return;
      }
      if (data.wines.length === 0) {
        Alert.alert('Nessun vino trovato', 'Assicurati di includere la carta vini.');
        return;
      }
      if (data.raw_text) {
        setMenuText(data.raw_text);
      }
      onMenuExtracted(data);
    } catch (e: any) {
      Alert.alert('Errore', e.message || 'Impossibile analizzare il documento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        visible={showQRScanner}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowQRScanner(false)}
      >
        <QRScanner
          onMenuExtracted={onMenuExtracted}
          onClose={() => setShowQRScanner(false)}
        />
      </Modal>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Scannerizza il Menù</Text>
        <Text style={styles.subtitle}>Scatta una foto o incolla il testo del menù</Text>

        <View style={styles.buttonRow2}>
          <View style={styles.buttonRowLine}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={pickCamera}
              disabled={loading}
              activeOpacity={0.75}
            >
              <AppIcon name="camera" size={iconSize.lg} color="#fff" />
              <Text style={styles.primaryBtnText}>Fotocamera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={pickGallery}
              disabled={loading}
              activeOpacity={0.75}
            >
              <AppIcon name="image" size={iconSize.lg} color={colors.textPrimary} />
              <Text style={styles.outlineBtnText}>Galleria</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={pickDocument}
              disabled={loading || urlLoading}
              activeOpacity={0.75}
            >
              <AppIcon name="file-text" size={iconSize.lg} color={colors.textPrimary} />
              <Text style={styles.outlineBtnText}>Documento</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRowLine}>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={handleScanLabel}
              disabled={loading}
              activeOpacity={0.75}
            >
              <AppIcon name="scan" size={iconSize.lg} color={colors.textPrimary} />
              <Text style={styles.outlineBtnText}>Etichetta</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => setShowQRScanner(true)}
              disabled={loading || urlLoading}
              activeOpacity={0.75}
            >
              <AppIcon name="qr-code" size={iconSize.lg} color={colors.textPrimary} />
              <Text style={styles.outlineBtnText}>QR Code</Text>
            </TouchableOpacity>
          </View>
        </View>

        {imageUris.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageCarousel}
            contentContainerStyle={styles.imageCarouselContent}
          >
            {imageUris.map((uri) => (
              <View key={uri} style={styles.imagePreviewWrap}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.imageRemove}
                  onPress={() => removeImage(uri)}
                  activeOpacity={0.75}
                >
                  <AppIcon name="close" size={12} color={colors.accentRed} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {visionUnsupported && imageUris.length > 0 && (
          <Text style={styles.visionNote}>
            Il modello selezionato non supporta le immagini. Verrà usato openrouter/free.
          </Text>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>oppure</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.inputLabel}>URL MENÙ DIGITALE</Text>
        <TextInput
          style={[styles.input, { minHeight: 44 }]}
          value={menuUrl}
          onChangeText={setMenuUrl}
          placeholder="Incolla URL del menù digitale…"
          placeholderTextColor={colors.textSecondary}
          editable={!urlLoading}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.analyzeBtn, { marginTop: spacing.sm, marginBottom: spacing.lg }, urlLoading && styles.analyzeBtnDisabled]}
          onPress={handleFetchUrl}
          activeOpacity={0.75}
          disabled={urlLoading}
        >
          {urlLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.analyzeBtnText}>Scaricamento…</Text>
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <AppIcon name="download" size={iconSize.md} color="#fff" />
              <Text style={styles.analyzeBtnText}>Scarica menù</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>oppure</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.inputLabel}>TESTO DEL MENÙ</Text>
        <TextInput
          style={[
            styles.input,
            { minHeight: 160 },
            focused && styles.inputFocused,
          ]}
          multiline
          value={menuText}
          onChangeText={setMenuText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Incolla qui il testo del menù…"
          placeholderTextColor={colors.textSecondary}
          editable={!loading}
        />
        <TouchableOpacity
          onPress={() => setMenuText(SAMPLE_MENU)}
          disabled={loading}
          activeOpacity={0.75}
          style={styles.sampleRow}
        >
          <AppIcon name="sparkle" size={14} color={colors.accentRed} />
          <Text style={styles.sampleLink}>Carica menù di esempio</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TouchableOpacity
          style={[styles.analyzeBtn, loading && styles.analyzeBtnDisabled]}
          onPress={handleAnalyze}
          activeOpacity={0.75}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.analyzeBtnText}>{loadingText}</Text>
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <AppIcon name="search" size={iconSize.md} color="#fff" />
              <Text style={styles.analyzeBtnText}>Analizza Menù</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  buttonRow2: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  buttonRowLine: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.accentRed,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  outlineBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  outlineBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  imageCarousel: {
    marginBottom: spacing.sm,
  },
  imageCarouselContent: {
    gap: spacing.sm,
  },
  imagePreviewWrap: {
    position: 'relative',
  },
  previewImage: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.lg,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  visionNote: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  inputLabel: {
    textTransform: 'uppercase',
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: colors.accentRed,
  },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.sm,
  },
  sampleLink: {
    color: colors.accentRed,
    fontSize: 14,
    fontWeight: '500',
  },
  stickyBottom: {
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
  analyzeBtn: {
    backgroundColor: colors.accentRed,
    borderRadius: borderRadius.lg,
    paddingVertical: 18,
    alignItems: 'center',
  },
  analyzeBtnDisabled: {
    opacity: 0.7,
  },
  analyzeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
