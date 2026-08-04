import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  apiUrl: '@winepair/api_url',
  model: '@winepair/model',
} as const;

const DEFAULTS = {
  apiUrl: 'http://178.105.49.3:8000',
  model: 'openrouter/free',
} as const;

export const settingsStorage = {
  async getAll(): Promise<{ apiUrl: string; model: string }> {
    const [apiUrl, model] = await Promise.all([
      AsyncStorage.getItem(KEYS.apiUrl).then((v) => v ?? DEFAULTS.apiUrl),
      AsyncStorage.getItem(KEYS.model).then((v) => v ?? DEFAULTS.model),
    ]);
    return { apiUrl, model };
  },

  async getApiUrl(): Promise<string> {
    const v = await AsyncStorage.getItem(KEYS.apiUrl);
    return v ?? DEFAULTS.apiUrl;
  },

  async getModel(): Promise<string> {
    const v = await AsyncStorage.getItem(KEYS.model);
    return v ?? DEFAULTS.model;
  },

  async setApiUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.apiUrl, url);
  },

  async setModel(model: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.model, model);
  },
};
