export interface Food {
  name: string;
  category: 'antipasto' | 'primo' | 'secondo' | 'dolce' | 'altro';
  emoji: string;
  description?: string;
}

export interface Wine {
  name: string;
  type: 'rosso' | 'bianco' | 'rosè' | 'spumante' | 'dolce';
  region?: string;
  vintage?: string | null;
  menu_price?: string;
  glass_available?: boolean;
}

export interface MenuData {
  foods: Food[];
  wines: Wine[];
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
}
