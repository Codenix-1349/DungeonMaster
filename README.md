# 🐉 Dungeons & Daggers - AI Solo Adventure

AI-powered solo tabletop RPG web app inspired by D&D-style fantasy adventures — explore authored modules, create characters, roll dice, fight encounters, and let an AI Dungeon Master narrate within strict runtime rules.

---

## 🛠️ Technologies

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg" width="48" height="48" alt="React" />
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vitejs/vitejs-original.svg" width="48" height="48" alt="Vite" />
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg" width="48" height="48" alt="JavaScript" />
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg" width="48" height="48" alt="Tailwind CSS" />
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg" width="48" height="48" alt="Node.js" />
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/express/express-original.svg" width="48" height="48" alt="Express" />
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg" width="48" height="48" alt="PostgreSQL" />
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vitest/vitest-original.svg" width="48" height="48" alt="Vitest" />
</p>

<p align="center">
  React · Vite · JavaScript · Tailwind CSS · Node.js · Express · PostgreSQL · Vitest · OpenRouter · SMTP
</p>

---

## 📜 Overview

**Dungeons & Daggers** is an AI-supported solo adventure platform for browser-based fantasy roleplaying.

The player creates a character, starts an adventure, explores scenes, resolves checks, manages inventory, fights enemies, and receives narrated responses from an AI Dungeon Master.

The core idea is not to let the AI freely invent game truth. Instead, the application owns the rules, runtime state, visible choices, checks, combat flow, and player knowledge. The AI narrates around that controlled state.

This makes the project less like a simple chatbot and more like a structured solo RPG engine with AI narration.

---

## ✨ Core Features

- 🧙‍♂️ **AI Dungeon Master**  
  The AI narrates scenes, dialogue, consequences, and atmosphere based on controlled runtime context.

- 🛡️ **Truth Firewall Architecture**  
  Game truth is owned by the app. The AI may narrate, but it should not create hidden canon, reveal unavailable information, or change state outside the engine rules.

- 🎲 **Dice & Skill Checks**  
  D20-style checks, modifiers, skill interactions, and authored check outcomes.

- ⚔️ **Combat System**  
  Initiative, turn state, attacks, enemy behavior, damage resolution, combat tracker, and encounter handling.

- 🧾 **Character Creation**  
  Create and manage fantasy characters with attributes, class/race choices, inventory, spells, and combat values.

- 🗺️ **Authored Runtime Modules**  
  Adventures are parsed into structured runtime interactions, locations, NPCs, objects, exits, flags, and state transitions.

- 🧠 **Knowledge Gating**  
  The player only sees what the character has actually discovered. Hidden information remains separated from visible UI choices.

- 💬 **Choice-Based + Free Text Interaction**  
  Players can use visible runtime choices or type free text. Free text is resolved through authored runtime intent logic where possible.

- 🔊 **Atmospheric Audio**  
  Background sounds and ambience support different adventure scenes and moods.

- 🔐 **Optional Account Mode**  
  Backend-supported registration, login, encrypted API key storage, verification mails, password reset, and proxy-based AI requests.

---

## 🧩 What makes it special?

**Dungeons & Daggers** explores a structured way to combine AI narration with deterministic game logic.

The project is built around one central rule:

> The engine controls truth.  
> The AI controls narration.

This means the app decides:

- which choices are available
- which NPCs or objects are known
- which checks are allowed
- which state changes are valid
- what combat events happen
- what the player has already learned

The AI then turns that controlled state into immersive prose.

This avoids the common problem of AI game systems where the model invents unavailable exits, reveals hidden secrets, grants unearned items, or changes the world without game authority.

---

## 🏗️ Architecture Highlights

- **Runtime authority layer**  
  Structured modules define interactions, flags, NPC states, objects, exits, and checks.

- **Visible choice layer**  
  The UI only exposes choices that are currently valid and player-known.

- **Server-side prompt assembly**  
  In account/proxy mode, the backend owns final prompt construction and loads authoritative session state.

- **Session memory summary**  
  Long-running sessions can use compact server-owned memory summaries instead of sending raw full history.

- **OpenRouter integration**  
  Supports multiple AI models through OpenRouter, including free and paid model routing.

- **Local provider support**  
  The project includes support paths for local model testing, useful for development and reducing API-limit friction.

- **Regression-heavy development**  
  The project contains a broad Vitest suite covering runtime authority, knowledge gating, combat, prompt building, session persistence, and choice logic.

---

## 🧪 Test Coverage Focus

The test suite focuses on the most important architectural risks:

- truth firewall behavior
- knowledge gating
- runtime choice validity
- free-text intent resolution
- combat state transitions
- authored check outcomes
- session persistence
- prompt-building contracts
- OpenRouter transport behavior
- server-owned session memory
- prevention of client-owned truth injection

---

## 📸 Screenshots

Add screenshots here after deployment or presentation capture.

Suggested sections:

| Landing / Dashboard | Character Creation | Adventure Runtime |
|---|---|---|
| `screenshot-dashboard.png` | `screenshot-character.png` | `screenshot-game.png` |

| Combat Tracker | Skill Check | Settings / AI Provider |
|---|---|---|
| `screenshot-combat.png` | `screenshot-check.png` | `screenshot-settings.png` |

---

## 🚀 Getting Started

### Requirements

- Node.js 18+
- npm
- OpenRouter API key for AI model access
- Optional: PostgreSQL for backend/account mode

---

## ▶️ Frontend Setup

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

---

## 🧪 Run Tests

```bash
npm test
```

---

## 🏗️ Build

```bash
npm run build
npm run preview
```

---

## 🖥️ Backend Setup

The backend is located in:

```text
server/
```

It provides:

- user registration
- login
- email verification
- password reset
- encrypted API key storage
- OpenRouter proxy requests
- server-owned session state
- database migrations

Install backend dependencies:

```bash
cd server
npm install
```

Copy environment file:

```bash
cp .env.example .env
```

Run migrations:

```bash
npm run migrate
```

Start backend:

```bash
npm run dev
```

---

## ✉️ Email / SMTP

The backend supports SMTP for:

- email verification
- password reset

Example environment values:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@example.com
SMTP_PASS=CHANGE_ME
SMTP_FROM=no-reply@example.com
SMTP_FROM_NAME=Dungeons & Daggers
SMTP_REPLY_TO=support@example.com
```

Secrets must never be committed.

---

## 🤖 AI Provider

The app uses OpenRouter for AI model access.

Supported usage patterns include:

- frontend/direct provider mode
- backend proxy mode
- free model testing
- paid model selection
- local testing paths where configured

The application is designed to keep AI usage focused by sending only relevant runtime context instead of unnecessary full-state dumps.

---

## 📚 SRD Notice

This project is built around an SRD-based fantasy roleplaying rules subset.

It is not a full reproduction of any complete commercial tabletop RPG product. The included SRD material is used as a rules reference foundation for compatible gameplay concepts.

---

## 🚧 Project Status

Current state: **advanced prototype / showcase-ready development build**

Implemented areas include:

- runtime-authoritative adventure engine
- character creation
- structured adventure modules
- combat flow
- dice and check resolution
- AI narration integration
- OpenRouter model support
- account/backend mode
- email verification and password reset
- server-owned prompt context in proxy mode
- session persistence and memory summary
- extensive regression tests

Still in active development:

- production deployment polish
- module authoring workflow
- broader adventure content
- UI polish
- model cost UX
- operational hardening
- long-term save/memory improvements

---

## 🗺️ Roadmap

Planned directions include:

- stronger authoring tools for runtime modules
- more adventure templates and content packs
- improved combat UX and feedback
- enhanced NPC state handling
- better long-session memory compression
- clearer paid/free AI model cost warnings
- production-ready deployment flow
- improved local model support
- richer inventory and spell interactions
- more polished public demo experience

---

## 🔒 Source Code Notice

This repository is a development/showcase repository.

The project, architecture, runtime logic, written content, assets, and implementation details are authored as part of an original software project by Patrick Neumann.

Do not copy, redistribute, or reuse substantial parts of the project without permission.

---

## 📄 License

Proprietary – All rights reserved.

This repository, including source code, presentation materials, images, audio assets, written content, runtime modules, and documentation, may not be copied, redistributed, or reused without permission.

---

## 👤 Author

Developed by **Patrick Neumann**

An original AI-assisted solo RPG project focused on structured runtime authority, controlled AI narration, and browser-based fantasy adventure gameplay.
