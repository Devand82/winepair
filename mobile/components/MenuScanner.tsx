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
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useSettings } from '../hooks/useSettings';
import { api } from '../services/api';
import type { MenuData } from '../types';

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
  const { apiUrl, model } = useSettings();
  const insets = useSafeAreaInsets();
  const [menuText, setMenuText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loadingText, setLoadingText] = useState(LOADING_TEXTS[0]);
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
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickGallery = async () => {
    const ok = await requestGallery();
    if (!ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleAnalyze = async () => {
    if (!menuText.trim() && !imageUri) {
      Alert.alert('Inserisci il menù', 'Scatta una foto o incolla il testo del menù.');
      return;
    }
    setLoading(true);
    let idx = 0;
    loadingInterval.current = setInterval(() => {
      idx = (idx + 1) % LOADING_TEXTS.length;
      setLoadingText(LOADING_TEXTS[idx]);
    }, 2000);

    try {
      let data: MenuData;
      if (imageUri) {
        data = await api.extractImage(
          apiUrl,
          imageUri,
          'image/jpeg',
          model,
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
      onMenuExtracted(data);
    } catch (e: any) {
      Alert.alert('Errore', e.message || 'Impossibile analizzare il menù.');
    } finally {
      clearInterval(loadingInterval.current);
      setLoading(false);
    }
  };

  return (
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
        <Text style={styles.subtitle}>Scatta una foto o incolla il testo</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={pickCamera}
            disabled={loading}
            activeOpacity={0.75}
          >
            <Text style={styles.btnEmoji}>📷</Text>
            <Text style={styles.btnTextLight}>Fotocamera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.galleryBtn}
            onPress={pickGallery}
            disabled={loading}
            activeOpacity={0.75}
          >
            <Text style={styles.btnEmoji}>🖼️</Text>
            <Text style={styles.btnTextDark}>Galleria</Text>
          </TouchableOpacity>
        </View>

        {imageUri && (
          <View style={styles.previewSection}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => setImageUri(null)}
              activeOpacity={0.75}
            >
              <Text style={styles.removeBtnText}>✕ Rimuovi</Text>
            </TouchableOpacity>
          </View>
        )}

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
          placeholder="Incolla qui il testo del menù…
Includi sia i piatti che la carta vini"
          placeholderTextColor="#5c5248"
          editable={!loading}
        />
        <TouchableOpacity
          onPress={() => setMenuText(SAMPLE_MENU)}
          disabled={loading}
          activeOpacity={0.75}
        >
          <Text style={styles.sampleLink}>📋 Carica menù di esempio</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + 12 }]}>
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
            <Text style={styles.analyzeBtnText}>🔍 Analizza Menù</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#13100d',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 26,
    fontWeight: '700',
    color: '#e8e0d4',
  },
  subtitle: {
    fontSize: 14,
    color: '#9a8e7e',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cameraBtn: {
    flex: 1,
    backgroundColor: '#c4667a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  galleryBtn: {
    flex: 1,
    backgroundColor: '#1e1a16',
    borderWidth: 1,
    borderColor: '#3a342c',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  btnEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  btnTextLight: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  btnTextDark: {
    color: '#e8e0d4',
    fontSize: 14,
    fontWeight: '600',
  },
  previewSection: {
    marginBottom: 8,
  },
  preview: {
    height: 220,
    width: '100%',
    borderRadius: 12,
    resizeMode: 'contain',
    backgroundColor: '#1e1a16',
  },
  removeBtn: {
    backgroundColor: '#28231d',
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
    borderRadius: 10,
  },
  removeBtnText: {
    color: '#c4667a',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2c271f',
  },
  dividerText: {
    color: '#5c5248',
    fontSize: 13,
  },
  inputLabel: {
    textTransform: 'uppercase',
    fontSize: 11,
    color: '#5c5248',
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e1a16',
    borderWidth: 1,
    borderColor: '#3a342c',
    borderRadius: 12,
    padding: 14,
    color: '#e8e0d4',
    fontSize: 14,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: '#c4667a',
  },
  sampleLink: {
    color: '#c4667a',
    textDecorationLine: 'underline',
    fontSize: 14,
    marginTop: 10,
  },
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(19,16,13,0.97)',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  analyzeBtn: {
    backgroundColor: '#c4667a',
    borderRadius: 14,
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
    gap: 10,
  },
});
