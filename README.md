# CoinVault — AI-Powered Coin Identifier & Collector App

A full-stack mobile-first web app for numismatists. Identify coins with AI, manage your collection, buy/sell in the marketplace, and connect with the community.

## Features

- **AI Coin Scanner** — Identify coins via camera or photo upload using Claude Vision AI
- **AI Grading Assistant** (Pro) — Get professional-grade coin condition analysis
- **Error Coin Detection** (Pro) — Spot valuable minting errors
- **Collection Manager** — Track your collection with portfolio value charts
- **Coin Marketplace** — Buy and sell coins with offer system
- **Community Feed** — Share finds, weekly challenges, and trending coins
- **Gamification** — XP system, levels, badges, leaderboards
- **Coin Roll Hunting Tools** (Pro) — CRH session logs, silver melt calculator

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + React Router v6
- **Backend**: Node.js + Express + Socket.io
- **Database**: SQLite (via better-sqlite3)
- **AI**: Anthropic Claude Vision API
- **Payments**: Stripe (subscriptions + transactions)
- **Auth**: JWT (email + password)

## Prerequisites

- Node.js 18+
- npm 9+
- An Anthropic API key (for coin identification)
- A Stripe account (for payments, test mode works fine)

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd coinvault

# Install root, server, and client dependencies
npm run install:all
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

Required values:
- `ANTHROPIC_API_KEY` — Get from [console.anthropic.com](https://console.anthropic.com)
- `STRIPE_SECRET_KEY` — From Stripe Dashboard (use `sk_test_...` for dev)
- `STRIPE_PUBLISHABLE_KEY` — From Stripe Dashboard (use `pk_test_...` for dev)
- `JWT_SECRET` — Any long random string

### 3. Run the development server

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173) concurrently.

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Sample accounts (pre-seeded)

| Email | Password | Tier |
|-------|----------|------|
| alice@example.com | password123 | Free |
| bob@example.com | password123 | Free |
| carol@example.com | password123 | Free |

## Project Structure

```
coinvault/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── api/            # Axios API client
│   │   ├── components/     # Shared UI components
│   │   ├── context/        # React context (Auth)
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Page components
│   │   └── utils/          # Helper functions
│   └── ...
├── server/                 # Express backend
│   ├── src/
│   │   ├── db/             # SQLite + schema + seed data
│   │   ├── middleware/     # Auth middleware
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Claude AI + Stripe services
│   │   └── app.js          # Express app entry point
│   └── uploads/            # Uploaded coin images
└── .env                    # Environment variables
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Sign in |
| GET | /api/user/profile | Get profile |
| POST | /api/scan | Identify coin (AI) |
| POST | /api/grade | Grade coin (Pro) |
| POST | /api/error-detect | Detect errors (Pro) |
| GET/POST | /api/collection | Manage collection |
| GET/POST | /api/marketplace | Browse/create listings |
| GET/POST | /api/feed | Community feed |
| GET | /api/leaderboard | XP leaderboard |

## Subscription Tiers

| Feature | Free | Pro ($3.99/mo) | Expert ($9.99/mo) |
|---------|------|----------------|-------------------|
| Scans/month | 10 | Unlimited | Unlimited |
| Collection size | 50 coins | Unlimited | Unlimited |
| AI Grading | ❌ | ✅ | ✅ |
| Error Detection | ❌ | ✅ | ✅ |
| CRH Tools | ❌ | ✅ | ✅ |
| Auction History | ❌ | ❌ | ✅ |

Pro tier includes a 7-day free trial (shown after 3+ scans).

## Development Notes

- The database auto-seeds with sample data on first run
- Coin images in the marketplace use placeholder data
- Stripe is configured in test mode — use test card `4242 4242 4242 4242`
- Socket.io powers real-time marketplace notifications
