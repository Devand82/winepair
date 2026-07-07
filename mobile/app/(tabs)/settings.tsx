import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius, iconSize } from '../../theme';
import { AppIcon } from '../../components/ui/AppIcon';
import { useSettings } from '../../hooks/useSettings';
import { api } from '../../services/api';
import { historyStorage } from '../../services/history';
import { cellarStorage } from '../../services/cellar';
import type { ModelInfo, BackupData } from '../../types';

const FALLBACK_MODELS: ModelInfo[] = [
  { id: 'openrouter/free', name: 'Free Router', supports_vision: true, provider: 'OpenRouter', description: 'Seleziona automaticamente il miglior modello free.' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', supports_vision: true, provider: 'OpenAI', description: 'Veloce, economico. Richiede credito.' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', supports_vision: true, provider: 'OpenAI', description: 'Massima qualità. Richiede credito.' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', supports_vision: true, provider: 'Google', description: 'Veloce, basso costo. Richiede credito.' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', supports_vision: false, provider: 'Anthropic', description: 'Preciso, solo testo. Richiede credito.' },
];

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail';

export default function SettingsScreen() {
  const { apiUrl, setApiUrl, model, setModel } = useSettings();
  const [urlFocused, setUrlFocused] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [models, setModels] = useState<ModelInfo[]>(FALLBACK_MODELS);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const testTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getModels(apiUrl);
        if (data.models?.length) setModels(data.models);
      } catch {
        // fallback already set
      } finally {
        setModelsLoading(false);
      }
    })();
  }, [apiUrl]);

  const handleTestConnection = useCallback(async () => {
    setTestStatus('testing');
    try {
      await api.health(apiUrl);
      setTestStatus('ok');
      testTimeout.current = setTimeout(() => setTestStatus('idle'), 4000);
    } catch {
      setTestStatus('fail');
      testTimeout.current = setTimeout(() => setTestStatus('idle'), 4000);
    }
  }, [apiUrl]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const [history, cellar] = await Promise.all([
        historyStorage.getAll(),
        cellarStorage.getAll(),
      ]);

      const backup: BackupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        history,
        cellar,
      };

      const json = JSON.stringify(backup, null, 2);

      try {
        const { writeAsStringAsync, documentDirectory } = await import('expo-file-system');
        const { shareAsync } = await import('expo-sharing');
        const filename = `winepair-backup-${Date.now()}.json`;
        const fileUri = `${documentDirectory}${filename}`;
        await writeAsStringAsync(fileUri, json);
        await shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Salva backup WinePair' });
      } catch {
        Alert.alert('Esporta dati', 'Copia il JSON e salvalo manualmente:\n\n' + json.slice(0, 500) + '…');
      }
    } catch (e: any) {
      Alert.alert('Errore esportazione', e.message || 'Impossibile esportare i dati.');
    } finally {
      setExporting(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      const { documentDirectory, readAsStringAsync } = await import('expo-file-system');
      const { pickAsync } = await import('expo-document-picker');

      const result = await pickAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        setImporting(false);
        return;
      }

      const content = await readAsStringAsync(result.assets[0].uri);
      const backup = JSON.parse(content) as BackupData;

      if (!backup.version || !backup.history || !backup.cellar) {
        Alert.alert('File non valido', 'Il file selezionato non è un backup WinePair valido.');
        setImporting(false);
        return;
      }

      for (const record of backup.history) {
        await historyStorage.add(record);
      }
      for (const wine of backup.cellar) {
        await cellarStorage.add(wine);
      }

      Alert.alert('Import completato', `${backup.history.length} abbinamenti e ${backup.cellar.length} vini importati.`);
    } catch (e: any) {
      if (e.message?.includes('canceled')) return;
      Alert.alert('Errore importazione', e.message || 'Impossibile importare i dati.');
    } finally {
      setImporting(false);
    }
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SERVER BACKEND</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>URL API</Text>
            <TextInput
              style={[styles.input, urlFocused && styles.inputFocused]}
              value={apiUrl}
              onChangeText={setApiUrl}
              onFocus={() => setUrlFocused(true)}
              onBlur={() => setUrlFocused(false)}
              placeholder="http://YOUR_IP:8000"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestConnection}
              disabled={testStatus === 'testing'}
              activeOpacity={0.75}
            >
              {testStatus === 'testing' ? (
                <ActivityIndicator color={colors.accentRed} size="small" />
              ) : testStatus === 'ok' ? (
                <View style={styles.testStatusRow}>
                  <View style={styles.testBadgeOk}>
                    <AppIcon name="check" size={12} color={colors.successText} />
                  </View>
                  <Text style={styles.testTextOk}>Connesso</Text>
                </View>
              ) : testStatus === 'fail' ? (
                <View style={styles.testStatusRow}>
                  <View style={styles.testBadgeFail}>
                    <AppIcon name="alert" size={12} color={colors.dangerText} />
                  </View>
                  <Text style={styles.testTextFail}>Server non raggiungibile</Text>
                </View>
              ) : (
                <Text style={styles.testTextIdle}>Testa connessione</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MODELLO AI</Text>
          <View style={styles.card}>
            {modelsLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.accentRed} size="small" />
                <Text style={styles.loadingText}>Caricamento modelli…</Text>
              </View>
            ) : models.length === 0 ? (
              <Text style={styles.noModels}>Nessun modello disponibile</Text>
            ) : models.map((m, i) => {
              const selected = model === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.75}
                  onPress={() => setModel(m.id)}
                >
                  <View style={styles.modelRow}>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && (
                        <AppIcon name="circle-check" size={12} color={colors.accentRed} />
                      )}
                    </View>
                    <View style={styles.modelInfo}>
                      <View style={styles.modelLabelRow}>
                        <Text style={[styles.modelLabel, selected && styles.modelLabelSelected]}>
                          {m.name}
                        </Text>
                        {m.supports_vision ? (
                          <View style={styles.visionBadge}>
                            <AppIcon name="image" size={10} color={colors.textSecondary} />
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.modelDesc}>{m.description}</Text>
                    </View>
                  </View>
                  {i < models.length - 1 && <View style={styles.rowDivider} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BACKUP DATI</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleExport}
              disabled={exporting}
              activeOpacity={0.75}
            >
              <AppIcon name="share" size={18} color={colors.accentRed} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabel}>Esporta backup</Text>
                <Text style={styles.actionDesc}>Salva cronologia e cantina come file JSON</Text>
              </View>
              {exporting && <ActivityIndicator color={colors.accentRed} size="small" />}
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleImport}
              disabled={importing}
              activeOpacity={0.75}
            >
              <AppIcon name="download" size={18} color={colors.accentRed} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabel}>Importa backup</Text>
                <Text style={styles.actionDesc}>Carica un file JSON precedentemente esportato</Text>
              </View>
              {importing && <ActivityIndicator color={colors.accentRed} size="small" />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INFORMAZIONI</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Versione</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.rowDivider} />
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => Linking.openURL('https://openrouter.ai')}
              activeOpacity={0.75}
            >
              <Text style={styles.linkText}>OpenRouter</Text>
              <AppIcon name="share" size={14} color={colors.accentRed} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: spacing.xxl,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xxs,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
  },
  inputFocused: {
    borderColor: colors.accentRed,
  },
  testBtn: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  testStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  testBadgeOk: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBadgeFail: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testTextOk: {
    color: colors.successText,
    fontSize: 14,
    fontWeight: '600',
  },
  testTextFail: {
    color: colors.dangerText,
    fontSize: 14,
    fontWeight: '600',
  },
  testTextIdle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  noModels: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.accentRed,
  },
  modelInfo: {
    flex: 1,
  },
  modelLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  modelLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  modelLabelSelected: {
    fontWeight: '700',
    color: colors.accentRed,
  },
  visionBadge: {
    opacity: 0.6,
  },
  modelDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    lineHeight: 16,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + spacing.sm + 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  actionInfo: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  actionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  infoKey: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  infoValue: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  linkText: {
    color: colors.accentRed,
    fontSize: 14,
  },
});
