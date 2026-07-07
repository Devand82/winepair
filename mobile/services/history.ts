import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PairingRecord } from '../types';

const STORAGE_KEY = '@winepair/history';

export const historyStorage = {
  async getAll(): Promise<PairingRecord[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  async getById(id: string): Promise<PairingRecord | null> {
    const all = await this.getAll();
    return all.find((r) => r.id === id) ?? null;
  },

  async add(record: PairingRecord): Promise<void> {
    const all = await this.getAll();
    all.unshift(record);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  async remove(id: string): Promise<void> {
    const all = await this.getAll();
    const filtered = all.filter((r) => r.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  async update(id: string, updates: Partial<PairingRecord>): Promise<void> {
    const all = await this.getAll();
    const idx = all.findIndex((r) => r.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  },
};
