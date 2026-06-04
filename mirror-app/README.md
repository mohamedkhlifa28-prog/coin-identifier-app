# Mirror — Your AI Alter Ego

Mirror is a personal AI alter ego app. It learns exactly how you think, write, speak, and see the world — and over time it responds AS you. The longer you use it, the more accurate it gets.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database + Auth | Supabase (Postgres + pgvector) |
| AI responses | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Vector embeddings | OpenAI (`text-embedding-3-small`) |
| Payments | Stripe |
| Voice cloning | ElevenLabs (Platinum tier) |
| Deployment | Vercel |

## Project Structure

```
mirror-app/
├── app/
│   ├── (auth)/login          — Login page
│   ├── (auth)/signup         — Signup page
│   ├── onboard/              — 20-question personality onboarding
│   ├── chat/                 — Main Mirror chat interface
│   ├── vault/                — Memory Vault (all stored quotes)
│   ├── generate/             — Content Generator (Pro+)
│   ├── pricing/              — Plan comparison + checkout
│   ├── settings/             — Account + Mirror settings
│   ├── mirror/[slug]/        — Public shareable Mirror page
│   └── api/                  — All API routes
├── components/               — Shared UI components
├── hooks/                    — React hooks (useUser, useMemories, etc.)
├── lib/                      — Client libraries (supabase, anthropic, openai, stripe)
├── types/                    — TypeScript type definitions
└── supabase/
    └── schema.sql            — Full database schema with RLS policies
```

## Getting Started

### 1. Install dependencies

```bash
cd mirror-app
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in your keys in `.env.local`. You need:
- **Supabase** project: [supabase.com](https://supabase.com)
- **Anthropic** API key: [console.anthropic.com](https://console.anthropic.com)
- **OpenAI** API key (embeddings): [platform.openai.com](https://platform.openai.com)
- **Stripe** account: [stripe.com](https://stripe.com)
- **ElevenLabs** (Platinum voice): [elevenlabs.io](https://elevenlabs.io)

### 3. Set up the database

Run `supabase/schema.sql` in your Supabase SQL editor. This creates all tables, enables pgvector, sets up RLS policies, and adds the auth trigger.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Plans

| Feature | Free | Pro ($9.99/mo) | Platinum ($24.99/mo) |
|---|---|---|---|
| Chat messages | 10/day | Unlimited | Unlimited |
| Memory Vault | Last 30 days | Full history | Full history |
| Contradictions tab | — | ✓ | ✓ |
| Content Generator | — | ✓ | ✓ |
| Share your Mirror | — | 3 links | Unlimited |
| Voice cloning | — | — | ✓ |
| Memory export | — | — | ✓ |
| Mirror API | — | — | ✓ |

## How Mirror Works

1. **Onboarding** — 20 personality questions + 3 writing samples → Claude generates initial voice profile JSON
2. **Chat** — Mirror responds in your exact voice; semantically relevant past memories are injected into context
3. **Background jobs** — After each message, Claude extracts quotes (stored as memories with embeddings) and updates your voice profile
4. **Contradiction detector** — Weekly cron job finds pairs of contradictory statements across your memory bank
5. **Accuracy score** — Starts at 40%, grows +0.5% per session, capped at 98%

## Deployment

Deploy to Vercel. Set all environment variables in Vercel project settings. Point your Stripe webhook endpoint to `https://yourdomain.com/api/webhooks/stripe`.
