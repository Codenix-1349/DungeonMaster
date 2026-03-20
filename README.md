# DungeonMaster AI – AD&D Solo-Abenteuer

Ein KI-gestützter Dungeon Master für AD&D 2nd Edition Solo-Abenteuer.

## Setup

### Voraussetzungen
- Node.js 18+ installiert
- Ein OpenRouter API Key (kostenlos auf [openrouter.ai](https://openrouter.ai))

### Installation

```bash
# In den Projektordner wechseln
cd DungeonMaster

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Dann im Browser öffnen: **http://localhost:5173**

## Erste Schritte

1. **Einstellungen** → OpenRouter API Key eingeben → Verbindung testen
2. **Abenteuer** → Optional: AD&D Modul als PDF oder TXT hochladen
3. **Charakter** → Deinen Helden erschaffen (Wizard-Stil)
4. **Spielsitzung** → Abenteuer starten und mit dem KI-DM spielen!

## Features

- 🎲 **Vollständiges Würfelsystem** – d4, d6, d8, d10, d12, d20, d100 mit Modifikatoren
- ⚔️ **AD&D 2nd Edition Regeln** – THAC0, Rüstungsklasse, Rettungswürfe
- 📜 **PDF/TXT Upload** – Echte Abenteuermodule laden und spielen
- 🧙 **Charakter-Assistent** – Schritt-für-Schritt Charakter-Erstellung
- 💾 **Auto-Speicherung** – Alles wird im Browser localStorage gespeichert
- 🤖 **KI-Streaming** – Antworten werden live übertragen
- 🏹 **Kampfsystem** – Initiative, Angriffswürfe, HP-Tracker

## Unterstützte Modelle (via OpenRouter)

- Google Gemini 2.5 Pro *(Empfohlen)*
- Anthropic Claude Sonnet / Opus
- OpenAI GPT-4o
- Meta Llama 3.3 70B *(Kostenlos)*

## Datenschutz

- Kein Backend – die App läuft vollständig im Browser
- Der API Key wird nur in deinem lokalen `localStorage` gespeichert
- Die einzige externe Verbindung geht an die OpenRouter API

## Build

```bash
npm run build
npm run preview
```
