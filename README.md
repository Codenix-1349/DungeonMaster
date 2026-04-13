# Dungeons & Daggers – KI Solo-Abenteuer

Ein KI-gestützter Dungeon Master für D&D 5e (SRD 5.2.1) Solo-Abenteuer, komplett im Browser.

## Setup

### Voraussetzungen
- Node.js 18+ installiert
- Ein OpenRouter API Key (kostenlos auf [openrouter.ai](https://openrouter.ai))

### Installation

```bash
cd DungeonMaster
npm install
npm run dev
```

Dann im Browser öffnen: **http://localhost:5173**

## Erste Schritte

1. **Einstellungen** → OpenRouter API Key eingeben → Verbindung testen
2. **Abenteuer** → Optional: D&D Modul als PDF oder TXT hochladen
3. **Charakter** → Helden erstellen (Klasse, Rasse, Attribute)
4. **Spielsitzung** → Abenteuer starten und mit dem KI-DM spielen!

## Features

- ⚔️ **D&D 5e SRD Regeln** – Attributsmodifikatoren, Rüstungsklasse, Übungsbonus, Rettungswürfe
- 🎲 **Würfelsystem** – d4, d6, d8, d10, d12, d20, d100
- 🗡️ **Kampfsystem** – Auto-Initiative, phasenbasierte Züge (Zielwahl → Angriff → Treffer-Check → Schaden), Gegnerzüge automatisch, klassenbasierte Waffen
- 📜 **PDF/TXT Upload** – Abenteuermodule laden, KI nutzt Inhalte kontextbasiert
- 🧙 **Charakter-Erstellung** – 8 Klassen (Kämpfer, Zauberer, Kleriker, Schurke, Waldläufer, Paladin, Druide, Barde), 7 Rassen, Attributverteilung
- 🎭 **Szenenstatus** – Automatisches Tracking von Ort, Zielen, Hinweisen und offenen Fäden
- 💾 **Auto-Speicherung** – Alles im Browser localStorage, mehrere Sessions und Charaktere
- 🤖 **KI-Streaming** – Antworten werden live gestreamt, situative Handlungsoptionen als Buttons

## Unterstützte Modelle (via OpenRouter)

- **openrouter/free** *(Standard — automatisches Routing zu verfügbaren kostenlosen Modellen)*
- Google Gemini 2.5 Pro
- Anthropic Claude Sonnet / Opus
- OpenAI GPT-4o
- Meta Llama 3.3 70B

## Techstack

- React 18 + Vite
- Tailwind CSS
- PDF.js (Modulimport)
- OpenRouter API (LLM-Anbindung)
- Node.js / Express Backend (optional — für Auth, verschlüsselte Key-Speicherung, Chat-Proxy)
- SQLite (User-Daten bei Server-Betrieb)

## Betriebsmodi

### Anonym (ohne Backend)
- Die App läuft vollständig im Browser
- Der API Key wird in `localStorage` gespeichert
- Die einzige externe Verbindung geht an die OpenRouter API

### Mit Account (Backend aktiv)
- Registrierung / Login über den integrierten Server (`/server`)
- Der API Key wird **serverseitig verschlüsselt** gespeichert — nicht im Browser
- Chat-Anfragen laufen über einen Server-Proxy (Key bleibt serverseitig)
- Sitzungsdaten werden lokal im Browser gespeichert

## E-Mail Setup

Für Verifizierungsmails und Passwort-Resets nutzt das Backend SMTP. Die Beispielkonfiguration in `server/.env.example` ist auf Brevo ausgelegt:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<Brevo SMTP Login>
SMTP_PASS=<Brevo SMTP Key>
SMTP_FROM=no-reply@auth.dungeons-daggers.app
SMTP_FROM_NAME=Dungeons & Daggers
SMTP_REPLY_TO=support@dungeons-daggers.app
```

Wichtig:
- `SMTP_PASS` ist der Brevo-SMTP-Schlüssel, nicht dein Brevo-Login-Passwort.
- `SMTP_FROM` muss auf einer in Brevo bestätigten Domain oder Subdomain liegen.
- Beim Serverstart wird die SMTP-Verbindung einmal geprüft und bei Fehlkonfiguration direkt geloggt.

## Build

```bash
npm run build
npm run preview
```
