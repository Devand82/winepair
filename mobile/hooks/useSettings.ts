import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  apiUrl: '@winepair/api_url',
  model: '@winepair/model',
} as const;

const DEFAULTS = {
  apiUrl: 'http://178.105.49.3:8000',
  model: 'google/gemma-4-31b-it:free',
} as const;

export function useSettings() {
  const [apiUrl, setApiUrlState] = useState<string>(DEFAULTS.apiUrl);
  const [model, setModelState] = useState<string>(DEFAULTS.model);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedUrl, storedModel] = await Promise.all([
          AsyncStorage.getItem(KEYS.apiUrl),
          AsyncStorage.getItem(KEYS.model),
        ]);
        if (storedUrl) setApiUrlState(storedUrl);
        if (storedModel) setModelState(storedModel);
      } catch {
        // fallback to defaults
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const setApiUrl = useCallback(async (url: string) => {
    setApiUrlState(url);
    await AsyncStorage.setItem(KEYS.apiUrl, url);
  }, []);

  const setModel = useCallback(async (m: string) => {
    setModelState(m);
    await AsyncStorage.setItem(KEYS.model, m);
  }, []);

  return { apiUrl, setApiUrl, model, setModel, isLoaded } as const;
}
