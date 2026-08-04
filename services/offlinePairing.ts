import type { Food, Wine, PairingResult } from '../types';

interface PairingRule {
  score: number;
  principle: string;
  reason: string;
}

type WineType = 'rosso' | 'bianco' | 'ros\u00e8' | 'spumante' | 'dolce';
type FoodCategory = 'antipasto' | 'primo' | 'secondo' | 'dolce' | 'altro';
type WeightCategory = 'leggero' | 'medio' | 'pesante';

const ALL_CATEGORIES: FoodCategory[] = ['antipasto', 'primo', 'secondo', 'dolce', 'altro'];

const FOOD_WEIGHT: Record<FoodCategory, WeightCategory> = {
  antipasto: 'leggero',
  primo: 'medio',
  secondo: 'pesante',
  dolce: 'leggero',
  altro: 'medio',
};

const WINE_BODY: Record<WineType, WeightCategory> = {
  rosso: 'pesante',
  bianco: 'leggero',
  'ros\u00e8': 'medio',
  spumante: 'leggero',
  dolce: 'medio',
};

const REGION_PAIRS: Record<string, string[]> = {
  toscana: ['bistecca', 'fiorentina', 'cinghiale', 'ribollita', 'pappa al pomodoro'],
  piemonte: ['tartufo', 'brasato', 'agnolotti', 'vitello', 'tajarin'],
  'veneto': ['risotto', 'baccal\u00e0', 'radicchio', 'pasta e fagioli', 'fegato'],
  sicilia: ['caponata', 'pesce spada', 'cannolo', 'pasta alla norma', 'arancino'],
  campania: ['pizza', 'mozzarella', 'melanzane', 'rag\u00f9', 'sfogliatella'],
  puglia: ['orecchiette', 'taralli', 'burrata', 'caciocavallo', 'focaccia'],
  lazio: ['carbonara', 'amatriciana', 'cacio e pepe', 'abbacchio', 'carciofi'],
  liguria: ['pesto', 'focaccia', 'trofie', 'acciughe', 'torta pasqualina'],
};

function regionScore(food: Food, wine: Wine): number {
  if (!wine.region) return 0;
  const wineRegion = wine.region.toLowerCase();
  const foodName = food.name.toLowerCase();

  for (const [region, dishes] of Object.entries(REGION_PAIRS)) {
    if (!wineRegion.includes(region) && !region.includes(wineRegion)) continue;
    for (const dish of dishes) {
      if (foodName.includes(dish) || dish.includes(foodName)) {
        return 2;
      }
    }
  }
  return 0;
}

function weightScore(food: Food, wine: Wine): number {
  const fw = food.weight || FOOD_WEIGHT[food.category as FoodCategory] || 'medio';
  const wb = wine.body || WINE_BODY[wine.type as WineType] || 'medio';

  if (fw === wb) return 2;
  if (
    (fw === 'leggero' && wb === 'medio') ||
    (fw === 'pesante' && wb === 'medio') ||
    (fw === 'medio' && wb === 'leggero') ||
    (fw === 'medio' && wb === 'pesante')
  ) return 1;
  return 0;
}

function priceScore(food: Food, wine: Wine, maxPrice?: number): number {
  if (!maxPrice || !wine.menu_price) return 0;
  const priceStr = wine.menu_price.replace(/[^\d,.]/g, '').replace(',', '.');
  const price = parseFloat(priceStr);
  if (isNaN(price)) return 0;
  if (price <= maxPrice) return 2;
  if (price <= maxPrice * 1.2) return 1;
  return -2;
}

function descMatchScore(food: Food, wine: Wine): number {
  let score = 0;
  if (wine.description && food.description) {
    const wd = wine.description.toLowerCase();
    const fd = food.description.toLowerCase();
    if ((wd.includes('erbaceo') || wd.includes('vegetale')) && (fd.includes('verdura') || fd.includes('erb'))) score += 1;
    if ((wd.includes('speziato') || wd.includes('spezie')) && (fd.includes('speziato') || fd.includes('spezie'))) score += 1;
    if ((wd.includes('fruttato') || wd.includes('frutta')) && (fd.includes('dolce') || fd.includes('frutta'))) score += 1;
    if ((wd.includes('affinato') || wd.includes('legno') || wd.includes('barrique')) && (fd.includes('carne') || fd.includes('formaggio'))) score += 1;
  }
  return score;
}

const BASE_PAIRING_RULES: Record<WineType, Partial<Record<FoodCategory, PairingRule>>> = {
  rosso: {
    secondo: { score: 9, principle: 'concordanza', reason: 'Rosso strutturato ideale per carni rosse e selvaggina.' },
    antipasto: { score: 7, principle: 'territorialit\u00e0', reason: 'Rosso leggero con salumi e formaggi stagionati.' },
    primo: { score: 8, principle: 'grassezza', reason: 'I tannini tagliano la grassezza dei sughi di carne.' },
    dolce: { score: 3, principle: 'contrapposizione', reason: 'Rosso secco contrasta poco con un dolce.' },
    altro: { score: 6, principle: 'territorialit\u00e0', reason: 'Abbinamento versatile di territorio.' },
  },
  bianco: {
    antipasto: { score: 8, principle: 'concordanza', reason: 'Freschezza e acidit\u00e0 per antipasti leggeri e crudi di pesce.' },
    primo: { score: 8, principle: 'concordanza', reason: 'Ideale per primi a base di pesce o verdure.' },
    secondo: { score: 7, principle: 'grassezza', reason: 'Bianco strutturato per secondi di pesce o carni bianche.' },
    dolce: { score: 4, principle: 'contrapposizione', reason: 'Preferire un bianco dolce per dessert.' },
    altro: { score: 6, principle: 'territorialit\u00e0', reason: 'Adatto a piatti della tradizione mediterranea.' },
  },
  'ros\u00e8': {
    antipasto: { score: 8, principle: 'concordanza', reason: 'Ros\u00e8 fresco per antipasti estivi e insalate.' },
    primo: { score: 7, principle: 'grassezza', reason: 'Media struttura per primi leggeri o freddi.' },
    secondo: { score: 7, principle: 'territorialit\u00e0', reason: 'Perfetto per grigliate miste e cucina mediterranea.' },
    dolce: { score: 3, principle: 'contrapposizione', reason: 'Non ideale per dessert.' },
    altro: { score: 6, principle: 'territorialit\u00e0', reason: 'Versatile per aperitivi e finger food.' },
  },
  spumante: {
    antipasto: { score: 9, principle: 'concordanza', reason: 'Bollicine che puliscono il palato tra un antipasto e l\'altro.' },
    primo: { score: 7, principle: 'grassezza', reason: 'Ottimo con primi ricchi, le bollicine sgrassano.' },
    secondo: { score: 6, principle: 'territorialit\u00e0', reason: 'Metodo classico con secondi di pesce pregiati.' },
    dolce: { score: 9, principle: 'concordanza', reason: 'Spumante dolce o passito \u00e8 il pairing perfetto per dessert.' },
    altro: { score: 7, principle: 'territorialit\u00e0', reason: 'Un brindisi per ogni occasione.' },
  },
  dolce: {
    antipasto: { score: 2, principle: 'contrapposizione', reason: 'Vino dolce in apertura copre i sapori.' },
    primo: { score: 3, principle: 'contrapposizione', reason: 'Troppo dolce per primi salati.' },
    secondo: { score: 3, principle: 'contrapposizione', reason: 'Non adatto a secondi.' },
    dolce: { score: 10, principle: 'concordanza', reason: 'Abbinamento perfetto per dessert e pasticceria secca.' },
    altro: { score: 5, principle: 'territorialit\u00e0', reason: 'Da solo come vino da meditazione.' },
  },
};

export function offlinePairing(food: Food, wines: Wine[], maxPrice?: number): PairingResult | null {
  if (wines.length === 0) return null;

  const category = ALL_CATEGORIES.includes(food.category as FoodCategory)
    ? (food.category as FoodCategory)
    : 'altro';

  let bestScore = -Infinity;
  let bestIdx = 0;
  let bestReason = '';
  let bestPrinciple = 'territorialit\u00e0';

  for (let i = 0; i < wines.length; i++) {
    const wine = wines[i];
    const wineType = (wine.type in BASE_PAIRING_RULES ? wine.type : 'rosso') as WineType;
    const baseRule = BASE_PAIRING_RULES[wineType]?.[category];
    let totalScore = baseRule?.score ?? 5;

    totalScore += regionScore(food, wine);
    totalScore += weightScore(food, wine);
    totalScore += priceScore(food, wine, maxPrice);
    totalScore += descMatchScore(food, wine);

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestIdx = i;
      bestReason = baseRule?.reason ?? 'Abbinamento basato su regole classiche arricchite.';
      bestPrinciple = baseRule?.principle ?? 'territorialit\u00e0';
    }
  }

  const best = wines[bestIdx];
  const altIdx = wines.length > 1 ? (bestIdx === 0 ? 1 : 0) : null;

  return {
    wine_index: bestIdx,
    wine_name: best.name,
    wine_type: best.type,
    region: best.region,
    vintage: best.vintage,
    menu_price: best.menu_price,
    food_match_score: Math.min(Math.round(bestScore), 10),
    pairing_reason: bestReason,
    pairing_principle: bestPrinciple,
    alternative_wine_index: altIdx,
    alternative_note: altIdx !== null ? 'Prova anche questa alternativa.' : null,
  };
}
