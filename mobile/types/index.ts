export interface Food {
  name: string;
  category: 'antipasto' | 'primo' | 'secondo' | 'dolce' | 'altro';
  emoji: string;
  description?: string;
  menu_price?: string;
  weight?: 'leggero' | 'medio' | 'pesante';
}

export interface Wine {
  name: string;
  type: 'rosso' | 'bianco' | 'rosè' | 'spumante' | 'dolce';
  region?: string;
  vintage?: string | null;
  menu_price?: string;
  glass_available?: boolean;
  description?: string;
  body?: 'leggero' | 'medio' | 'pieno';
}

export interface MenuData {
  foods: Food[];
  wines: Wine[];
  raw_text?: string;
}

export interface PairingResult {
  wine_index: number;
  wine_name: string;
  wine_type: string;
  region?: string;
  vintage?: string | null;
  menu_price?: string;
  avg_market_price?: string;
  color?: string;
  nose?: string;
  palate?: string;
  temperature?: string;
  food_match_score?: number;
  pairing_reason?: string;
  pairing_principle?: string;
  alternative_wine_index?: number | null;
  alternative_note?: string | null;
}

export interface ModelInfo {
  id: string;
  name: string;
  supports_vision: boolean;
  provider: string;
  description: string;
}

export interface PairingRecord {
  id: string;
  date: string;
  foodName: string;
  wineName: string;
  score: number;
  result: PairingResult;
  wines: Wine[];
  tastingNote?: string;
  personalRating?: number;
}

export interface FoodSuggestion {
  name: string;
  category: string;
  emoji: string;
  description?: string;
  score: number;
  pairing_reason: string;
  pairing_principle: string;
}

export interface PairReverseResponse {
  suggestions: FoodSuggestion[];
}

export interface IdentifiedWine {
  name: string;
  type: string;
  region?: string;
  vintage?: string | null;
  alcohol?: string;
  grape?: string;
  description?: string;
  serving_temp?: string;
}

export interface CellarWine {
  id: string;
  name: string;
  type: 'rosso' | 'bianco' | 'rosè' | 'spumante' | 'dolce';
  region?: string;
  vintage?: string | null;
  price?: string;
  bottleCount: number;
  note?: string;
  addedAt: string;
}

export interface LookupPriceResponse {
  market_price: string;
  currency?: string;
  source?: string;
  confidence?: string;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  history: PairingRecord[];
  cellar: CellarWine[];
}
