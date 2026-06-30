import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MenuData, PairingRecord } from '../types';

const CACHE_KEYS = {
  lastMenu: '@winepair/last_menu',
  menuTimestamp: '@winepair/menu_timestamp',
} as const;

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const offlineCache = {
  async saveLastMenu(data: MenuData): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(CACHE_KEYS.lastMenu, JSON.stringify(data)),
      AsyncStorage.setItem(CACHE_KEYS.menuTimestamp, Date.now().toString()),
    ]);
  },

  async getLastMenu(): Promise<MenuData | null> {
    const [raw, tsRaw] = await Promise.all([
      AsyncStorage.getItem(CACHE_KEYS.lastMenu),
      AsyncStorage.getItem(CACHE_KEYS.menuTimestamp),
    ]);
    if (!raw || !tsRaw) return null;
    const ts = parseInt(tsRaw, 10);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return JSON.parse(raw) as MenuData;
  },

  async getHistory(): Promise<PairingRecord[]> {
    const raw = await AsyncStorage.getItem('@winepair/history');
    return raw ? JSON.parse(raw) : [];
  },

  async isOnline(): Promise<boolean> {
    const apiUrl = await AsyncStorage.getItem('@winepair/api_url');
    if (!apiUrl) return false;
    try {
      const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  },
};
