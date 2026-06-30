import type { Food, Wine, PairingResult } from '../types';

const PAIRING_RULES: Record<string, Record<string, { score: number; principle: string; reason: string }>> = {
  rosso: {
    secondo: { score: 9, principle: 'concordanza', reason: 'Vino rosso strutturato ideale per carni rosse e selvaggina.' },
    antipasto: { score: 7, principle: 'territorialità', reason: 'Un rosso leggero si sposa bene con salumi e formaggi stagionati.' },
    primo: { score: 8, principle: 'grassezza', reason: 'I tannini del rosso tagliano la grassezza dei sughi di carne.' },
    dolce: { score: 3, principle: 'contrapposizione', reason: 'Un rosso secco contrasta poco con un dolce.' },
    altro: { score: 6, principle: 'territorialità', reason: 'Abbinamento versatile di territorio.' },
  },
  bianco: {
    antipasto: { score: 8, principle: 'concordanza', reason: 'Freschezza e acidità perfette per antipasti leggeri e crudi di pesce.' },
    primo: { score: 8, principle: 'concordanza', reason: 'Ideale per primi a base di pesce o verdure, esalta i sapori delicati.' },
    secondo: { score: 7, principle: 'grassezza', reason: 'Un bianco strutturato regge bene secondi di pesce o carni bianche.' },
    dolce: { score: 4, principle: 'contrapposizione', reason: 'Preferire un bianco dolce per dessert, non un secco.' },
    altro: { score: 6, principle: 'territorialità', reason: 'Adatto a piatti della tradizione mediterranea.' },
  },
  'rosè': {
    antipasto: { score: 8, principle: 'concordanza', reason: 'Rosè fresco e floreale per antipasti estivi e insalate.' },
    primo: { score: 7, principle: 'grassezza', reason: 'Media struttura adatta a primi leggeri o freddi.' },
    secondo: { score: 7, principle: 'territorialità', reason: 'Perfetto per grigliate miste e cucina mediterranea.' },
    dolce: { score: 3, principle: 'contrapposizione', reason: 'Non ideale per dessert.' },
    altro: { score: 6, principle: 'territorialità', reason: 'Versatile per aperitivi e finger food.' },
  },
  spumante: {
    antipasto: { score: 9, principle: 'concordanza', reason: 'Le bollicine puliscono il palato tra un antipasto e l\'altro.' },
    primo: { score: 7, principle: 'grassezza', reason: 'Ottimo con primi ricchi, le bollicine sgrassano.' },
    secondo: { score: 6, principle: 'territorialità', reason: 'Metodo classico con secondi di pesce pregiati.' },
    dolce: { score: 9, principle: 'concordanza', reason: 'Spumante dolce o passito è il pairing perfetto per dessert.' },
    altro: { score: 7, principle: 'territorialità', reason: 'Un brindisi per ogni occasione.' },
  },
  dolce: {
    antipasto: { score: 2, principle: 'contrapposizione', reason: 'Vino dolce in apertura copre i sapori.' },
    primo: { score: 3, principle: 'contrapposizione', reason: 'Troppo dolce per primi salati.' },
    secondo: { score: 3, principle: 'contrapposizione', reason: 'Non adatto a secondi.' },
    dolce: { score: 10, principle: 'concordanza', reason: 'Abbinamento perfetto per dessert e pasticceria secca.' },
    altro: { score: 5, principle: 'territorialità', reason: 'Da solo come vino da meditazione.' },
  },
};

export function offlinePairing(food: Food, wines: Wine[]): PairingResult | null {
  if (wines.length === 0) return null;

  const category = food.category in PAIRING_RULES.rosso ? food.category : 'altro';
  let bestScore = -1;
  let bestIdx = 0;

  for (let i = 0; i < wines.length; i++) {
    const wine = wines[i];
    const wineType = wine.type in PAIRING_RULES ? wine.type : 'rosso';
    const rules = PAIRING_RULES[wineType]?.[category];
    if (rules && rules.score > bestScore) {
      bestScore = rules.score;
      bestIdx = i;
    }
  }

  const best = wines[bestIdx];
  const match = PAIRING_RULES[best.type in PAIRING_RULES ? best.type : 'rosso']?.[category];

  return {
    wine_index: bestIdx,
    wine_name: best.name,
    wine_type: best.type,
    region: best.region,
    vintage: best.vintage,
    menu_price: best.menu_price,
    food_match_score: match?.score ?? 5,
    pairing_reason: match?.reason ?? 'Abbinamento basato sulle regole classiche.',
    pairing_principle: match?.principle ?? 'territorialità',
    alternative_wine_index: wines.length > 1 ? (bestIdx === 0 ? 1 : 0) : null,
    alternative_note: wines.length > 1 ? 'Prova anche questa alternativa.' : null,
  };
}
