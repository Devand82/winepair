import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, iconSize } from '../theme';
import { AppIcon } from './ui/AppIcon';
import { api } from '../services/api';
import type { MenuData } from '../types';

interface Props {
  onMenuExtracted: (data: MenuData) => void;
  onClose: () => void;
}

export default function QRScanner({ onMenuExtracted, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('Inquadra il QR code del menù');
  const scannedRef = useRef(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return (
      <View style={styles.root}>
        <ActivityIndicator color={colors.accentRed} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <View style={styles.permissionContent}>
          <AppIcon name="alert" size={48} color={colors.textSecondary} />
          <Text style={styles.permissionTitle}>Permesso necessario</Text>
          <Text style={styles.permissionText}>
            Autorizza l'accesso alla fotocamera per scansionare i QR code dei menù.
          </Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={requestPermission}
            activeOpacity={0.75}
          >
            <Text style={styles.permissionBtnText}>Concedi permesso</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.75}
          >
            <Text style={styles.closeBtnText}>Annulla</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current || loading) return;
    if (!data.startsWith('http://') && !data.startsWith('https://')) {
      setStatusText('QR non valido: deve contenere un URL del menù');
      return;
    }
    scannedRef.current = true;
    setLoading(true);
    setStatusText('Scaricamento del menù…');
    try {
      const storedUrl = await AsyncStorage.getItem('@winepair/api_url');
      const storedModel = await AsyncStorage.getItem('@winepair/model');
      const apiUrl = storedUrl || 'http://178.105.49.3:8000';
      const model = storedModel || 'openrouter/free';
      const menuData = await api.fetchMenu(apiUrl, data, model);
      if (menuData.foods.length === 0) {
        Alert.alert('Nessun piatto trovato', 'Nessun piatto trovato nel menù scaricato.');
        setLoading(false);
        scannedRef.current = false;
        setStatusText('Inquadra il QR code del menù');
        return;
      }
      if (menuData.wines.length === 0) {
        Alert.alert(
          'Nessun vino trovato',
          'Assicurati che il menù includa la carta vini.',
        );
        setLoading(false);
        scannedRef.current = false;
        setStatusText('Inquadra il QR code del menù');
        return;
      }
      onMenuExtracted(menuData);
      onClose();
    } catch (e: any) {
      Alert.alert('Errore', e.message || 'Impossibile scaricare il menù dal QR code.');
      setLoading(false);
      scannedRef.current = false;
      setStatusText('Inquadra il QR code del menù');
    }
  };

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scannedRef.current ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />
      <View style={[styles.overlayTop, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onClose} activeOpacity={0.75} style={styles.backButton}>
          <AppIcon name="close" size={iconSize.md} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.overlayCenter}>
        <View style={styles.viewfinder} />
      </View>
      <View style={[styles.overlayBottom, { paddingBottom: insets.bottom + 40 }]}>
        {loading ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        ) : (
          <Text style={styles.statusText}>{statusText}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  permissionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionBtn: {
    backgroundColor: colors.accentRed,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  permissionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  closeBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinder: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: colors.accentRed,
    borderRadius: borderRadius.xl,
    backgroundColor: 'transparent',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
