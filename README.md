# WinePair 🍷

Abbinamento vino-cibo con intelligenza artificiale. Scansiona il menù del ristorante, scegli un piatto e ottieni l'abbinamento perfetto.

## Funzionalità

- **Scansione menù** — foto, galleria, PDF, QR code, URL digitale o testo incollato
- **Abbinamento AI** — consigli da sommelier con punteggio, principio e note tecniche
- **Abbinamento inverso** — inserisci un vino e scopri quali piatti gli si abbinano
- **Menu degustazione** — abbina più portate in un unico flusso
- **Cantina personale** — salva i tuoi vini con identificazione da etichetta
- **Ricerca prezzo mercato** — prezzo reale del vino per cantina e annata
- **Storico e note** — salva abbinamenti con valutazione personale

## Tech Stack

| Layer | Tecnologia |
|-------|-----------|
| Mobile | React Native (Expo SDK 52, Expo Router v4) |
| Backend | FastAPI + Python 3.12 su Docker |
| AI | OpenRouter API (modelli: free, GPT-4o Mini, Gemini 2.5 Flash, Claude 3.5 Haiku) |
| Server | Hetzner VPS |

## Architettura

```
winepair/
├── backend/          # FastAPI backend
│   ├── main.py       # Endpoint API monolitico
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yml
├── mobile/           # React Native / Expo app
│   ├── app/          # Expo Router pages
│   ├── components/   # UI components
│   ├── services/     # API client, cache, storage
│   ├── theme/        # Design system (colori, spazi, icone)
│   └── types/        # TypeScript types
└── CHANGELOG.md
```

## Endpoint API

| Endpoint | Descrizione |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/models` | Lista modelli disponibili |
| `POST /api/extract-text` | Estrai piatti/vini da testo menù |
| `POST /api/extract-image` | Estrai da immagini menù |
| `POST /api/extract-document` | Estrai da immagini + PDF |
| `POST /api/fetch-menu` | Scarica menù da URL |
| `POST /api/pair` | Abbina vino a un piatto |
| `POST /api/pair-batch` | Abbina vini a più piatti |
| `POST /api/pair-reverse` | Suggerisci piatti per un vino |
| `POST /api/identify-wine` | Identifica vino da foto etichetta |
| `POST /api/lookup-price` | Ricerca prezzo mercato vino |

## Licenza

MIT
