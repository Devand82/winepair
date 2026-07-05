import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CellarWine } from '../types';

const CELLAR_KEY = '@winepair/cellar';

export const cellarStorage = {
  async getAll(): Promise<CellarWine[]> {
    const raw = await AsyncStorage.getItem(CELLAR_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  async add(wine: CellarWine): Promise<void> {
    const all = await this.getAll();
    all.unshift(wine);
    await AsyncStorage.setItem(CELLAR_KEY, JSON.stringify(all));
  },

  async remove(id: string): Promise<void> {
    const all = await this.getAll();
    const filtered = all.filter((w) => w.id !== id);
    await AsyncStorage.setItem(CELLAR_KEY, JSON.stringify(filtered));
  },

  async update(id: string, updates: Partial<CellarWine>): Promise<void> {
    const all = await this.getAll();
    const idx = all.findIndex((w) => w.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      await AsyncStorage.setItem(CELLAR_KEY, JSON.stringify(all));
    }
  },
};
