# WinePair

Abbinamento vino-cibo con intelligenza artificiale. Scansiona il menù del ristorante, scegli un piatto e ottieni l'abbinamento perfetto con 3 alternative.

## Funzionalita

- **Scansione menu** — foto, galleria, PDF (testuale e scanato), QR code, URL digitale o testo incollato
- **Abbinamento AI** — consigli da sommelier con punteggio, principio e 3 alternative
- **Abbinamento inverso** — inserisci un vino e scopri quali piatti gli si abbinano
- **Menu degustazione** — abbina piu portate in un unico flusso
- **Cantina personale** — salva i tuoi vini con identificazione da etichetta
- **Ricerca prezzo mercato** — prezzo reale del vino per cantina e annata
- **Storico e note** — salva abbinamenti con valutazione personale

## Tech Stack

| Layer | Tecnologia |
|-------|-----------|
| Mobile | React Native (Expo SDK 52, Expo Router v4) |
| Backend | FastAPI + Python 3.12 su Docker |
| AI | OpenRouter API (modelli: free, GPT-4o Mini, Gemini 2.5 Flash, Claude Haiku 4.5) |
| PDF | pypdf (testo) + PyMuPDF (immagini da PDF scanati) |
| Server | Hetzner VPS |

## Architettura

```
winepair/
├── backend/          # FastAPI backend
│   ├── routers/      # Endpoint: extract, pairing, wine
│   ├── prompts/      # Prompt LLM per extraction e pairing
│   ├── services/     # OpenRouter client, parsing JSON, file utils
│   ├── schemas/      # Pydantic models
│   ├── main.py
│   ├── Dockerfile
│   └── docker-compose.yml
├── app/              # Expo Router pages
├── components/       # UI components
├── store/            # Zustand state management
├── services/         # API client, cache, storage
├── theme/            # Design system (colori, spazi, icone)
├── types/            # TypeScript types
├── eas.json
└── package.json
```

## Endpoint API

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/models` | GET | Lista modelli disponibili |
| `/api/extract-text` | POST | Estrai piatti/vini da testo menu |
| `/api/extract-image` | POST | Estrai da immagini menu |
| `/api/extract-document` | POST | Estrai da PDF (testuale e scanato) |
| `/api/fetch-menu` | POST | Scarica menu da URL |
| `/api/pair` | POST | Abbina vino a un piatto ( + 3 alternative) |
| `/api/pair-batch` | POST | Abbina vini a piu piatti |
| `/api/pair-reverse` | POST | Suggerisci piatti per un vino |
| `/api/identify-wine` | POST | Identifica vino da foto etichetta |
| `/api/lookup-price` | POST | Ricerca prezzo mercato vino |
| `/api/wines` | GET | Cerca vino per nome |

## Deploy

### Backend
```bash
cd backend
cp .env.example .env  # configura OPENROUTER_API_KEY
docker compose up -d --build
```

### Mobile
```bash
npm install
npx expo start
# oppure EAS build
eas build --platform android --profile preview
```

## Licenza

MIT
