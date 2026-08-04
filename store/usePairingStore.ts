import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { historyStorage } from '../services/history';
import type { MenuData, PairingResult, PairingRecord } from '../types';

type Step = 'scan' | 'foods' | 'pairing' | 'result' | 'multi-result';

interface PairingState {
  step: Step;
  menuData: MenuData | null;
  selectedIdx: number | null;
  selectedIndexes: number[];
  selectedWineIndexes: number[];
  multiMode: boolean;
  budget: number | null;
  pairingResult: PairingResult | null;
  multiResults: PairingResult[];
  multiResultIdx: number;
  multiResultViewIdx: number;
  currentRecord: PairingRecord | null;
  showNoteModal: boolean;
  noteText: string;
  noteRating: number;
  loading: boolean;
  error: string | null;

  setStep: (s: Step) => void;
  setMenuData: (data: MenuData) => void;
  setMultiMode: (v: boolean) => void;
  setBudget: (v: number | null) => void;
  setShowNoteModal: (v: boolean) => void;
  setNoteText: (t: string) => void;
  setNoteRating: (r: number) => void;
  setMultiResultViewIdx: (i: number) => void;

  selectFood: (idx: number) => void;
  selectWine: (indexes: number[]) => void;
  pairWine: () => Promise<void>;
  handleMultiPair: () => Promise<void>;
  handleSaveNote: () => Promise<void>;
  reset: () => void;
}

async function getApiUrl(): Promise<string> {
  return (await AsyncStorage.getItem('@winepair/api_url')) ?? 'http://178.105.49.3:8000';
}

async function getModel(): Promise<string> {
  return (await AsyncStorage.getItem('@winepair/model')) ?? 'openrouter/free';
}

const INITIAL: Pick<
  PairingState,
  'step' | 'menuData' | 'selectedIdx' | 'selectedIndexes' | 'selectedWineIndexes' |
  'multiMode' | 'budget' | 'pairingResult' | 'multiResults' | 'multiResultIdx' |
  'multiResultViewIdx' | 'currentRecord' | 'showNoteModal' | 'noteText' | 'noteRating' |
  'loading' | 'error'
> = {
  step: 'scan',
  menuData: null,
  selectedIdx: null,
  selectedIndexes: [],
  selectedWineIndexes: [],
  multiMode: false,
  budget: null,
  pairingResult: null,
  multiResults: [],
  multiResultIdx: 0,
  multiResultViewIdx: 0,
  currentRecord: null,
  showNoteModal: false,
  noteText: '',
  noteRating: 0,
  loading: false,
  error: null,
};

export const usePairingStore = create<PairingState>((set, get) => ({
  ...INITIAL,

  setStep: (step) => set({ step }),
  setMenuData: (menuData) => set({ menuData }),
  setMultiMode: (multiMode) => set({ multiMode }),
  setBudget: (budget) => set({ budget }),
  setShowNoteModal: (showNoteModal) => set({ showNoteModal }),
  setNoteText: (noteText) => set({ noteText }),
  setNoteRating: (noteRating) => set({ noteRating }),
  setMultiResultViewIdx: (multiResultViewIdx) => set({ multiResultViewIdx }),

  selectFood: (idx) => {
    const state = get();
    if (state.multiMode) {
      const current = state.selectedIndexes;
      const next = current.includes(idx)
        ? current.filter((i) => i !== idx)
        : [...current, idx];
      set({ selectedIndexes: next });
    } else {
      set({ selectedIdx: state.selectedIdx === idx ? null : idx });
    }
  },

  selectWine: (indexes) => {
    set({ selectedWineIndexes: indexes });
  },

  pairWine: async () => {
    const { menuData, selectedIdx, budget } = get();
    if (!menuData || selectedIdx == null) return;

    set({ step: 'pairing', loading: true, error: null });

    try {
      const apiUrl = await getApiUrl();
      const model = await getModel();
      const food = menuData.foods[selectedIdx];
      const wines = get().selectedWineIndexes.length > 0
        ? menuData.wines.filter((_, i) => get().selectedWineIndexes.includes(i))
        : menuData.wines;

      const result = await api.pairWine(apiUrl, food, wines, model, budget ?? undefined);

      const record: PairingRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        foodName: food.name,
        wineName: result.wine_name,
        score: result.food_match_score ?? 0,
        result,
        wines,
      };

      await historyStorage.add(record);
      set({ pairingResult: result, currentRecord: record, step: 'result', loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Errore abbinamento', step: 'foods', loading: false });
    }
  },

  handleMultiPair: async () => {
    const { menuData, selectedIndexes, budget } = get();
    if (!menuData || selectedIndexes.length === 0) return;

    set({ step: 'pairing', loading: true, error: null });

    try {
      const apiUrl = await getApiUrl();
      const model = await getModel();

      const foods = selectedIndexes.map((i) => menuData.foods[i]);
      const wines = get().selectedWineIndexes.length > 0
        ? menuData.wines.filter((_, i) => get().selectedWineIndexes.includes(i))
        : menuData.wines;

      const results = await api.pairBatch(apiUrl, foods, wines, model);

      for (let i = 0; i < results.length; i++) {
        const record: PairingRecord = {
          id: Date.now().toString() + '_' + i,
          date: new Date().toISOString(),
          foodName: foods[i]?.name ?? '',
          wineName: results[i].wine_name,
          score: results[i].food_match_score ?? 0,
          result: results[i],
          wines,
        };
        await historyStorage.add(record);
      }

      const record: PairingRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        foodName: foods[0]?.name ?? '',
        wineName: results[0]?.wine_name ?? '',
        score: results[0]?.food_match_score ?? 0,
        result: results[0],
        wines,
      };

      set({
        multiResults: results,
        multiResultIdx: 0,
        multiResultViewIdx: 0,
        currentRecord: record,
        step: 'multi-result',
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message || 'Errore abbinamento', step: 'foods', loading: false });
    }
  },

  handleSaveNote: async () => {
    const { currentRecord, noteText, noteRating } = get();
    if (!currentRecord) return;

    const updated: PairingRecord = {
      ...currentRecord,
      tastingNote: noteText,
      personalRating: noteRating,
    };

    await historyStorage.update(currentRecord.id, {
      tastingNote: noteText,
      personalRating: noteRating,
    });

    set({ currentRecord: updated, showNoteModal: false });
  },

  reset: () => set({ ...INITIAL }),
}));
