# MintoulAssis (Smart Mboa)

Cameroon web app with two entry worlds after the intro:

- **Tourism & Discovery** — places, regions, planner, AI guide, voice & vision
- **Film Production** — AI cinema assistant (filmmakers, films, actors, festivals), filming locations, projection halls, cinema events, procedures, directory, gear, and planning checklists

Imported from [drraoulh/MintoulAssis](https://github.com/drraoulh/MintoulAssis).

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — add API keys for chat/voice/vision
npm run dev -- -p 43123
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

- First visit: cinematic intro → section gateway
- Switch later: header **Tourism / Film** toggle, or `/?change_mode=1`
- Replay intro: `/?reset_intro=1`

Without API keys, browsing and static pages still work. The **Film AI** (floating bottom-right on Film pages) still answers using Wikipedia / Africiné / CINAF / DuckDuckGo research on Cameroon producers, actors, actresses, videographers, and films. Tourism chat, speech, and vision need the keys in `.env.example` (`OPENROUTER_API_KEY` or `GEMINI_API_KEY` for fuller narrative Film answers; optional `TAVILY_API_KEY` / `BRAVE_SEARCH_API_KEY`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:schema` | Apply Supabase schema (needs `DATABASE_URL`) |
