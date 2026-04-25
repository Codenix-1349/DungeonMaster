# 🐉 Dungeons & Daggers - AI Solo RPG Engine

AI-powered solo tabletop RPG web app focused on prompt engineering, controlled AI narration, and deterministic game-state management — combining React, Node.js, PostgreSQL, OpenRouter, and a structured runtime engine for D&D-style fantasy adventures.

---

## 🛠️ Technologies

<table align="center">
  <tr>
    <td align="center" width="120">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg" width="48" height="48" alt="React" />
      <br />
      <strong>React</strong>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vitejs/vitejs-original.svg" width="48" height="48" alt="Vite" />
      <br />
      <strong>Vite</strong>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg" width="48" height="48" alt="JavaScript" />
      <br />
      <strong>JavaScript</strong>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg" width="48" height="48" alt="Tailwind CSS" />
      <br />
      <strong>Tailwind CSS</strong>
    </td>
  </tr>
  <tr>
    <td align="center" width="120">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg" width="48" height="48" alt="Node.js" />
      <br />
      <strong>Node.js</strong>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/express/express-original.svg" width="48" height="48" alt="Express" />
      <br />
      <strong>Express</strong>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg" width="48" height="48" alt="PostgreSQL" />
      <br />
      <strong>PostgreSQL</strong>
    </td>
    <td align="center" width="120">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vitest/vitest-original.svg" width="48" height="48" alt="Vitest" />
      <br />
      <strong>Vitest</strong>
    </td>
  </tr>
</table>

<p align="center">
  <strong>React · Vite · JavaScript · Tailwind CSS · Node.js · Express · PostgreSQL · Vitest · OpenRouter · SMTP</strong>
</p>

---

## 📜 Overview

**Dungeons & Daggers** is a full-stack AI solo RPG prototype that explores how large language models can be used safely inside an interactive game system.

Instead of treating the AI as an uncontrolled chatbot, the project uses a structured prompt-engineering and runtime-authority approach: the application controls game truth, state transitions, available choices, combat logic, checks, and player knowledge, while the AI is used for narration, atmosphere, dialogue style, and scene presentation.

This makes the project especially relevant from an engineering perspective: it combines frontend development, backend architecture, AI prompt orchestration, state management, testing, and database-backed user flows in one coherent product.

---

## 🧠 AI & Prompt Engineering Focus

The core technical challenge of this project is not simply “calling an AI API”.

The system is designed around a **Truth Firewall** concept:

> The engine controls truth.  
> The AI controls narration.

This means the application decides:

- which choices are currently valid
- which NPCs, objects, exits, and clues are known to the player
- which checks are allowed
- which combat actions are possible
- which state changes are accepted
- what information must remain hidden
- what context is safe to send to the model

The AI receives structured runtime context and is prompted to narrate only within those boundaries.

This architecture reduces common AI-game problems such as:

- hallucinated exits or items
- premature story reveals
- inconsistent NPC knowledge
- invalid rule outcomes
- AI-generated game truth
- uncontrolled state changes

---

## ✨ Core Features

- 🧙‍♂️ **AI Dungeon Master**  
  Uses AI narration for atmosphere, dialogue, scene descriptions, and consequences.

- 🛡️ **Truth Firewall Architecture**  
  Separates deterministic game authority from AI-generated prose.

- 🎲 **Dice & Skill Checks**  
  Runtime-controlled D20-style checks with authored outcomes and modifiers.

- ⚔️ **Combat System**  
  Initiative, turns, attacks, enemy behavior, damage handling, and encounter state.

- 🧾 **Character Creation**  
  Character setup with attributes, class/race choices, spells, inventory, and combat values.

- 🗺️ **Runtime Module System**  
  Adventures are structured into locations, interactions, NPCs, objects, exits, flags, and state transitions.

- 🧠 **Knowledge Gating**  
  Player-facing choices only show information the character has actually discovered.

- 💬 **Choice + Free Text Interaction**  
  Players can interact through structured choices or typed input, while the engine validates what can actually happen.

- 🔐 **Backend Account Mode**  
  Registration, login, email verification, password reset, encrypted API key storage, and server-side AI proxying.

- 🧪 **Regression Tests**  
  Vitest coverage for runtime authority, prompt construction, combat, knowledge gating, and AI-safety contracts.

---

## 🏗️ Technical Architecture

### Frontend

- **React** for component-based UI development
- **Vite** for fast local development and production builds
- **Tailwind CSS** for responsive styling and layout
- Client-side adventure UI, combat tracker, character views, settings, and interaction controls

### Backend

- **Node.js + Express** API server
- User registration and authentication
- Email verification and password reset
- OpenRouter proxy requests
- Server-owned session state
- Encrypted API key storage
- SMTP mail delivery

### Database

- **PostgreSQL** for persistent user, session, token, and configuration data
- Migration-based schema management
- Separation between runtime state, user state, and authentication data

### AI Integration

- **OpenRouter** as AI model provider layer
- Supports free and paid model usage
- Prompt assembly based on current runtime state
- Token-conscious context construction
- Backend proxy mode for safer key handling and server-owned prompts

### Testing

- **Vitest** for regression and unit tests
- Tests focus on architecture-critical behavior:
  - valid runtime choices
  - hidden knowledge protection
  - combat state transitions
  - authored check outcomes
  - prompt-building boundaries
  - server-owned session context
  - AI narration constraints

---

## 🧩 What makes it special?

**Dungeons & Daggers** is not just a fantasy chatbot.

It is an experiment in building an AI-assisted application where the model is powerful, but not authoritative.

The project combines:

- full-stack web development
- AI prompt engineering
- state-driven gameplay architecture
- backend-controlled AI requests
- deterministic rule handling
- structured adventure runtime design
- automated regression testing
- secure account and email flows

From a software engineering perspective, the interesting part is the boundary between deterministic application logic and generative AI output.

The project explores how to use AI productively without letting it take over core business logic.

---

## 📸 Screenshots

<table>
  <tr>
    <td align="center" width="50%">
      <a href="https://github.com/user-attachments/assets/1e82dbf6-bb74-4a4f-ab6c-1047c2827b2e">
        <img src="https://github.com/user-attachments/assets/1e82dbf6-bb74-4a4f-ab6c-1047c2827b2e" alt="Landing page" width="100%" />
      </a>
      <br />
      <strong>Landing Page</strong>
      <br />
      <sub>Entry point and product presentation for the AI solo RPG experience.</sub>
    </td>
    <td align="center" width="50%">
      <a href="https://github.com/user-attachments/assets/e0ba0078-f90a-4b42-9604-fa01f4b04121">
        <img src="https://github.com/user-attachments/assets/e0ba0078-f90a-4b42-9604-fa01f4b04121" alt="Character creation" width="100%" />
      </a>
      <br />
      <strong>Character Creation</strong>
      <br />
      <sub>Create and configure a playable fantasy character.</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <a href="https://github.com/user-attachments/assets/f18d0cfa-d9c2-4d56-9064-b1a196b64a01">
        <img src="https://github.com/user-attachments/assets/f18d0cfa-d9c2-4d56-9064-b1a196b64a01" alt="Adventure session" width="100%" />
      </a>
      <br />
      <strong>Adventure Runtime</strong>
      <br />
      <sub>Structured choices, scene state, narration, and player interaction.</sub>
    </td>
    <td align="center" width="50%">
      <a href="https://github.com/user-attachments/assets/0e92b00b-41dd-4973-9a9e-50b63129915a">
        <img src="https://github.com/user-attachments/assets/0e92b00b-41dd-4973-9a9e-50b63129915a" alt="AI provider settings" width="100%" />
      </a>
      <br />
      <strong>AI Provider Settings</strong>
      <br />
      <sub>OpenRouter model configuration and AI integration controls.</sub>
    </td>
  </tr>
</table>

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

This project uses SRD-based fantasy roleplaying concepts as a rules foundation.

It is not a full reproduction of any complete commercial tabletop RPG product. The included rules material is used as a compatible reference subset for gameplay mechanics and testing.

---

## 🚧 Project Status

Current state: **advanced prototype / showcase-ready development build**

Implemented areas include:

- React/Vite frontend
- Node/Express backend
- PostgreSQL-backed account mode
- AI narration through OpenRouter
- server-owned prompt construction
- character creation
- structured adventure modules
- runtime-authoritative interaction logic
- dice and check resolution
- combat flow
- session persistence
- memory summary handling
- email verification and password reset
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

An original full-stack AI application exploring prompt engineering, controlled AI narration, deterministic runtime logic, and browser-based fantasy adventure gameplay.
