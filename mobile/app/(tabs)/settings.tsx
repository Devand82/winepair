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
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius, iconSize } from '../../theme';
import { AppIcon } from '../../components/ui/AppIcon';
import { useSettings } from '../../hooks/useSettings';
import { api } from '../../services/api';
import type { ModelInfo } from '../../types';

const FALLBACK_MODELS: ModelInfo[] = [
  { id: 'openrouter/free', name: 'Free Router', supports_vision: true, provider: 'OpenRouter', description: 'Seleziona automaticamente il miglior modello free.' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', supports_vision: true, provider: 'OpenAI', description: 'Veloce, economico. Richiede credito.' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', supports_vision: true, provider: 'OpenAI', description: 'Massima qualità. Richiede credito.' },
];

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail';

export default function SettingsScreen() {
  const { apiUrl, setApiUrl, model, setModel } = useSettings();
  const [urlFocused, setUrlFocused] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [models, setModels] = useState<ModelInfo[]>(FALLBACK_MODELS);
  const [modelsLoading, setModelsLoading] = useState(true);
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
