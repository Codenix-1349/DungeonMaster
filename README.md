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

- Google Gemini 2.5 Pro *(Empfohlen)*
- Anthropic Claude Sonnet / Opus
- OpenAI GPT-4o
- Meta Llama 3.3 70B *(Kostenlos)*

## Techstack

- React 18 + Vite
- Tailwind CSS
- PDF.js (Modulimport)
- OpenRouter API (LLM-Anbindung)
- Kein Backend – reine Client-App

## Datenschutz

- Kein Backend – die App läuft vollständig im Browser
- Der API Key wird nur in deinem lokalen `localStorage` gespeichert
- Die einzige externe Verbindung geht an die OpenRouter API

## Build

```bash
npm run build
npm run preview
```
