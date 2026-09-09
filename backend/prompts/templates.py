from typing import Optional


EXTRACT_STRUCTURE = (
    '{"foods":[{"name":"","category":"antipasto|primo|secondo|dolce|altro","emoji":"","description":"max 60 chars","menu_price":""}],'
    '"wines":[{"name":"","type":"rosso|bianco|ros\\u00e8|spumante|dolce","region":"","vintage":null,"menu_price":"","glass_available":false}]}'
)


PAIR_STRUCTURE = (
    '{"wine_index":int,"wine_name":"","wine_type":"","region":"","vintage":null,'
    '"menu_price":"","avg_market_price":"es. 25-35\\u20ac","color":"colore e aspetto visivo",'
    '"nose":"profumi principali","palate":"gusto corpo struttura","temperature":"temp servizio",'
    '"food_match_score":8,"pairing_reason":"2-3 frasi tecniche da sommelier",'
    '"pairing_principle":"concordanza|contrapposizione|territorialit\\u00e0|grassezza",'
    '"alternatives":[{"wine_index":int,"note":""},{"wine_index":int,"note":""},{"wine_index":int,"note":""}]}'
)


def extract_text_prompt(menu_text: str) -> str:
    return (
        "Sei un esperto sommelier e chef italiano. Analizza il seguente menu.\n"
        "Restituisci SOLO un JSON valido con questa struttura ESATTA:\n"
        f"{EXTRACT_STRUCTURE}\n"
        "IMPORTANTE: il JSON deve avere DUE chiavi \"foods\" e \"wines\". "
        " NON restituire una lista, restituisci un OGGETTO con le chiavi foods e wines.\n"
        "Includi TUTTI i piatti e TUTTI i vini. Non inventare nulla.\n"
        f"MENU:\n---\n{menu_text}\n---"
    )


def extract_image_prompt(extra_text: str = "") -> str:
    prompt = (
        "Sei un esperto sommelier e chef italiano. Analizza il menu nelle immagini.\n"
        "Restituisci SOLO un JSON valido con questa struttura ESATTA:\n"
        f"{EXTRACT_STRUCTURE}\n"
        "IMPORTANTE: il JSON deve avere DUE chiavi \"foods\" e \"wines\". "
        " NON restituire una lista, restituisci un OGGETTO con le chiavi foods e wines.\n"
        "Includi TUTTI i piatti e TUTTI i vini. Non inventare nulla."
    )
    if extra_text:
        prompt += "\n\nNote aggiuntive:\n" + extra_text
    return prompt


def pair_prompt(food_name: str, food_desc: str, wines_list: str, max_price: Optional[float] = None) -> str:
    price_filter = ""
    if max_price:
        price_filter = f"Seleziona solo vini con prezzo massimo di {max_price} euro.\n"

    return (
        "Sei un sommelier professionista italiano con 20 anni di esperienza.\n"
        f'Il cliente ha scelto: "{food_name}" ({food_desc}).\n'
        + price_filter +
        "Vini disponibili:\n" + wines_list + "\n\n"
        "Seleziona il vino che si abbina MEGLIO.\n"
        "Fornisci 3 alternative DIVERSE dal vino principale e DIVERSE tra loro.\n"
        "Ogni alternativa deve avere un wine_index diverso da quello principale.\n"
        "SOLO JSON valido:\n"
        + PAIR_STRUCTURE
    )


def pair_reverse_prompt(wine_type: str, name: str = "", region: str = "", max_price: Optional[float] = None) -> str:
    prompt = (
        "Sei un sommelier professionista italiano con 20 anni di esperienza.\n"
        f'Il cliente ha un vino: "{wine_type}"'
        + (f' "{name}"' if name else "")
        + (f' della regione {region}' if region else "")
        + ".\n"
    )
    if max_price:
        prompt += f"Budget massimo per piatto: {max_price} euro.\n"

    prompt += (
        "Suggerisci 5 piatti che si abbinano bene a questo vino. "
        "Restituisci SOLO un JSON valido:\n"
        '{"suggestions":['
        '{"name":"","category":"antipasto|primo|secondo|dolce|altro","emoji":"","description":"max 60 chars",'
        '"score":8,"pairing_reason":"spiega l\'abbinamento",'
        '"pairing_principle":"concordanza|contrapposizione|territorialit\\u00e0|grassezza"}'
        "]}\n"
        "Includi un mix di categorie. Dai la priorita ai migliori abbinamenti."
    )
    return prompt


def identify_wine_prompt() -> str:
    return (
        "Sei un sommelier ed esperto di vini. Identifica il vino nell'immagine.\n"
        "Restituisci SOLO un JSON valido:\n"
        '{"name":"","type":"rosso|bianco|ros\\u00e8|spumante|dolce","region":"","vintage":null,'
        '"alcohol":"es. 13.5%","grape":"uvaggio principale","description":"breve descrizione del vino",'
        '"serving_temp":"temperatura di servizio"}\n'
        "Se non puoi identificare esattamente, fornisci una stima basata sull'etichetta."
    )


def lookup_price_prompt(wine_name: str, vintage: str = "", region: str = "", wine_type: str = "") -> str:
    return (
        "Sei un esperto di mercato enologico con conoscenza enciclopedica dei prezzi dei vini italiani.\n"
        f'Cerca il prezzo di mercato attuale per: "{wine_name}"'
        + (f' {vintage}' if vintage else "")
        + (f' della regione {region}' if region else "")
        + (f' ({wine_type})' if wine_type else "")
        + ".\n"
        "Fornisci un range di prezzo preciso basato sui reali valori di mercato (enoteche, wine-shop, produttore).\n"
        "Restituisci SOLO un JSON valido:\n"
        '{"market_price":"es. 45-60 euro","currency":"EUR","source":"database mercato enologico","confidence":"alta|media|bassa"}\n'
        "Se non hai dati sufficienti, fornisci comunque una stima ragionata indicando confidence bassa."
    )


def make_wines_list(wines, prefix_format: bool = True) -> str:
    lines = []
    for i, w in enumerate(wines):
        parts = [
            f"{w.name}", f"{w.type}",
            w.region or "N/D", w.vintage or "N/D",
            w.menu_price or "N/D",
        ]
        if prefix_format:
            lines.append(f"{i+1}. {' | '.join(parts)}")
        else:
            lines.append(" | ".join(parts))
    return "\n".join(lines)
