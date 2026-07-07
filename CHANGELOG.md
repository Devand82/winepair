# Changelog

## [1.2.0] — 2026-07-05

### Added
- Scanner QR code menù (componente QRScanner + endpoint `/api/fetch-menu`)
- Input URL menù digitale (copia-incolla URL + pulsante "Scarica menù")
- Supporto PDF nella selezione documenti (expo-document-picker + endpoint `/api/extract-document`)
- Selezione vini: lista verticale con checkbox per scegliere quali vini abbinare
- Prezzo menù visualizzato nelle card dei cibi (nuovo campo `menu_price` nei prompt LLM)
- Ricerca prezzo mercato reale: nuovo endpoint `/api/lookup-price` per prezzo specifico per cantina e annata
- Icona app professionale (calice di vino su sfondo chiaro)
- Condivisione immagine via expo-sharing su Android

### Changed
- MenuScanner: bottoni in 2 righe (3+2) per evitare testo a capo
- FoodGrid: da FlatList a View con wrap, scroll unificato con WineList
- WineList: da orizzontale a verticale con selezione checkbox
- WineResult: ViewShot → captureRef per catturare tutto il contenuto
- Tema: passaggio da dark a light (#FCFBF8)
- AppIcon: aggiunte icone QrCode, Download, FileText
- JSON parsing più robusto (estrazione da markdown/blocchi JSON)

### Fixed
- Pulsante "Immagine" su Android condivideva il percorso file invece dell'immagine
- Nome piatto lungo usciva dallo schermo nella scheda risultato
- Errore "Risposta del modello non valida" dovuto a `response_format` non supportato da tutti i modelli
- Bottone "Immagine" catturava solo la porzione visibile dello ScrollView
