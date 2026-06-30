import React, { useState, useRef, useCallback } from 'react';
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
import { useSettings } from '../../hooks/useSettings';
import { api } from '../../services/api';

const MODELS = [
  { value: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (Free)', desc: 'Gratuito · Vision ✗ · Con chiave OpenRouter' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Veloce · Economico · Vision ✓' },
  { value: 'openai/gpt-4o', label: 'GPT-4o', desc: 'Migliore qualità · Vision ✓' },
  { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', desc: 'Veloce · Low cost · Vision ✓' },
  { value: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku', desc: 'Preciso · Solo testo' },
];

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail';

export default function SettingsScreen() {
  const { apiUrl, setApiUrl, model, setModel } = useSettings();
  const [urlFocused, setUrlFocused] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const testTimeout = useRef<ReturnType<typeof setTimeout>>();

  const handleTestConnection = useCallback(async () => {
    setTestStatus('testing');
    try {
      const data: any = await api.health(apiUrl);
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
    <ScrollView style={styles.root}>
      <Text style={styles.sectionLabel}>SERVER BACKEND</Text>
      <View style={styles.block}>
        <View style={styles.blockInner}>
          <Text style={styles.fieldLabel}>URL API</Text>
          <TextInput
            style={[styles.input, urlFocused && styles.inputFocused]}
            value={apiUrl}
            onChangeText={setApiUrl}
            onFocus={() => setUrlFocused(true)}
            onBlur={() => setUrlFocused(false)}
            placeholder="http://YOUR_IP:8000"
            placeholderTextColor="#5c5248"
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
        <TouchableOpacity
          style={styles.testBtn}
          onPress={handleTestConnection}
          disabled={testStatus === 'testing'}
          activeOpacity={0.75}
        >
          {testStatus === 'testing' ? (
            <ActivityIndicator color="#c4667a" size="small" />
          ) : testStatus === 'ok' ? (
            <Text style={styles.testOk}>✓ Connesso</Text>
          ) : testStatus === 'fail' ? (
            <Text style={styles.testFail}>✗ Server non raggiungibile</Text>
          ) : (
            <Text style={styles.testIdle}>Testa connessione</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>MODELLO AI</Text>
      <View style={styles.block}>
        {MODELS.map((m, i) => {
          const selected = model === m.value;
          return (
            <TouchableOpacity
              key={m.value}
              activeOpacity={0.75}
              onPress={() => setModel(m.value)}
            >
              <View style={styles.modelRow}>
                <View
                  style={[
                    styles.radio,
                    selected && styles.radioSelected,
                  ]}
                >
                  {selected && <View style={styles.radioInner} />}
                </View>
                <View style={styles.modelInfo}>
                  <Text style={styles.modelLabel}>{m.label}</Text>
                  <Text style={styles.modelDesc}>{m.desc}</Text>
                </View>
              </View>
              {i < MODELS.length - 1 && <View style={styles.rowDivider} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>INFORMAZIONI</Text>
      <View style={styles.block}>
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
          <Text style={styles.linkText}>↗</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#13100d',
  },
  sectionLabel: {
    textTransform: 'uppercase',
    fontSize: 11,
    color: '#5c5248',
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 24,
  },
  block: {
    backgroundColor: '#191512',
    borderRadius: 14,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  blockInner: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  fieldLabel: {
    fontSize: 15,
    color: '#e8e0d4',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e1a16',
    borderWidth: 1,
    borderColor: '#3a342c',
    borderRadius: 12,
    padding: 12,
    color: '#e8e0d4',
    fontSize: 14,
  },
  inputFocused: {
    borderColor: '#c4667a',
  },
  testBtn: {
    backgroundColor: '#28231d',
    borderWidth: 1,
    borderColor: '#3a342c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 14,
    marginTop: 10,
  },
  testIdle: {
    color: '#9a8e7e',
    fontSize: 14,
  },
  testOk: {
    color: '#9a8e7e',
    fontSize: 13,
    fontWeight: '600',
  },
  testFail: {
    color: '#c4667a',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#2c271f',
    marginVertical: 4,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3a342c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#c4667a',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#c4667a',
  },
  modelInfo: {
    flex: 1,
  },
  modelLabel: {
    fontSize: 15,
    color: '#e8e0d4',
    fontWeight: '600',
  },
  modelDesc: {
    fontSize: 12,
    color: '#9a8e7e',
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#2c271f',
    marginLeft: 48,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoKey: {
    color: '#e8e0d4',
    fontSize: 15,
  },
  infoValue: {
    color: '#9a8e7e',
    fontSize: 15,
  },
  linkText: {
    color: '#c4667a',
    fontSize: 15,
  },
});
