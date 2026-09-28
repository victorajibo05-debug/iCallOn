# iCallOn 

A real-time multiplayer take on the classic Nigerian word game **"Name, Place, Animal, Thing"** (locally known as *"I Call On"*). Players race against the clock to write a Name, Animal, Place, and Thing starting with a called letter — an AI referee grades every answer instantly, so there's no arguing.

---

## How the game works

1. **Lobby** — Host creates a room and shares the 5-letter code. Up to 5 players join.
2. **Calling** — The active player calls out a letter (A–Z).
3. **Writing** — Everyone has 35 seconds to write a Name, Animal, Place, and Thing starting with that letter.
4. **Grading** — When time's up (or everyone submits early), a Groq-powered AI referee grades every answer in one batch call — checking the starting letter, real-word validity, and Nigerian-context names/places/slang that a plain dictionary would miss.
5. **Review** — Scores appear instantly with AI reasoning for every verdict. The host locks it in to move on.
6. **Repeat** — Turn passes to the next player. Game runs for `max(playerCount, 5)` rounds.
7. **Podium** — Final scores and winner revealed.

---

## Tech stack

| Layer       | Tech                                                        |
|-------------|---------------------------------------------------------------|
| Frontend    | React 19, TypeScript, Vite 6, Tailwind CSS v4, Framer Motion (`motion`), lucide-react icons |
| Backend     | Node.js, Express, TypeScript, `tsx` (dev), `esbuild` (prod bundle) |
| Realtime    | Server-Sent Events (SSE) — one-way push from server to clients, backed by REST endpoints for actions |
| AI grading  | Groq API (`groq-sdk`), model `llama-3.3-70b-versatile` |
| State       | In-memory (per Node process) — no database. Room data is lost on server restart |

> **Note:** despite early planning docs mentioning WebSockets, the shipped architecture uses **REST + SSE**: clients `POST` actions (join, submit answers, call letter, etc.) and receive state updates via a persistent `EventSource` connection per room.

---

## Project structure

Call-on-main/

├── .env.example

├── index.html

├── metadata.json

├── package.json

├── package-lock.json

├── tsconfig.json

├── vite.config.ts

├── server.ts

├── server/

│   ├── routers/

│   │   └── room.router.ts

│   ├── controllers/

│   │   └── room.controller.ts

│   └── services/

│       ├── room.service.ts

│       └── ai.service.ts

└── src/

  ├── main.tsx
    
  ├── App.tsx
    
   ├── types.ts
    
   ├── index.css
    
   ├── components/
    
  │   ├── Lobby.tsx
    
  │   ├── CallingPhase.tsx
    
  │   ├── WritingPhase.tsx
    
  │   ├── ReviewPhase.tsx
    
   │   └── PodiumPhase.tsx
    
  └── utils/
    
   └── sound.ts


---

## Prerequisites

- Node.js 18+ (20+ recommended)
- npm
- A free [Groq API key](https://console.groq.com/keys)

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
```

Edit `.env`:

```env
GROQ_API_KEY="gsk_your_key_here"
```

`APP_URL` in `.env.example` is an AI-Studio-specific variable used for Cloud Run self-referencing — not required for local dev or a standard Render/Railway/VPS deploy. Safe to leave blank or remove.

---

## Running locally

```bash
npm run dev
```

Starts the server with `tsx` (TypeScript executed directly, no build step) on **http://localhost:3000**, with Vite handling the frontend in middleware mode — one process, one port, hot reload included.

### Testing multiplayer on one machine

Since state lives in `localStorage` per browser profile, open **separate incognito/private windows** (or different browsers) for each simulated player — regular tabs share the same session and will act as the same player. Create the room in one window, join with the room code from the others (up to 5 total).

---

## Available scripts

| Command         | What it does |
|------------------|--------------|
| `npm run dev`    | Run the app locally with `tsx` (dev mode, no build) |
| `npm run build`  | Build the frontend with Vite and bundle the server with `esbuild` into `dist/server.cjs` |
| `npm start`      | Run the production build (`node dist/server.cjs`) — run `build` first |
| `npm run clean`  | Remove `dist/` and any stray `server.js` |
| `npm run lint`   | Type-check the whole project with `tsc --noEmit` (no output = clean) |

---

## Deployment

This app is a **single long-running Node process** (Express + SSE), not a set of stateless functions. That means:

✅ **Works on:** Render, Railway, Fly.io, a plain VPS, or any host that runs a persistent Node process
❌ **Does not work on:** Vercel or other serverless platforms — SSE connections and in-memory room state cannot survive Vercel's stateless, short-lived function execution model

### Deploying to Render / Railway

1. Push your repo to GitHub
2. Create a new Web Service, point it at the repo
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add environment variable: `GROQ_API_KEY`
6. Deploy

---

## AI grading details

- One Groq API call per round, grading **all players' answers at once** (not per-field or per-player calls) to keep latency and cost low.
- The prompt explicitly instructs the model to accept Nigerian names, places, Pidgin English, and local slang that a generic English dictionary would reject.
- Every answer gets a `{ valid: boolean, reason: string }` verdict, shown to players in the Review phase.
- **Fallback behavior:** if `GROQ_API_KEY` is missing, the Groq call fails, or the response doesn't match the expected JSON shape, the app falls back to a simple heuristic (does the answer start with the called letter?) so a round never gets stuck waiting on a flaky API. Fallback events are logged to the server console.
- There is no player-veto system — grading is fully AI-decided, with the fallback as the only override path.

---



