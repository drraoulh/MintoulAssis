# MintoulAssis (Smart Mboa Tour)

Cameroon tourism web app with an AI travel assistant, destinations, hotels, trip planner, voice mode, and vision guide. Imported from [drraoulh/MintoulAssis](https://github.com/drraoulh/MintoulAssis).

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — add API keys for chat/voice/vision
npm run dev -- -p 43123
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

Without API keys, browsing and static pages still work; assistant, speech, and vision features need the keys listed in `.env.example`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:schema` | Apply Supabase schema (needs `DATABASE_URL`) |
