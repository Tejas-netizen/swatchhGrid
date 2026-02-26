# SwachhGrid — Universal Context File
## Paste this + PROGRESS.md at the start of EVERY session in ANY tool

---

## What This Project Is
Smart city waste collection dashboard. Real-time bin monitoring + dynamic truck route optimization.
Hackathon project. Solo dev. Working demo is the only goal.

## Stack (Locked — No Changes)
- Backend: Node.js + Express on port 3001
- Realtime: Socket.io
- Frontend: Next.js 14 App Router + Tailwind on port 3000
- Map: Mapbox GL JS (dark style)
- DB: Neon PostgreSQL via `pg` library (NO ORM)
- AI: Google Gemini API (gemini-1.5-flash) for overflow prediction
- Routing: Custom greedy VRP in plain JavaScript
- Simulation: node-cron every 30s

## Absolute Rules
- JavaScript ONLY — no TypeScript, no Python
- Raw `pg` queries ONLY — no Prisma, no Sequelize
- No Docker, no Redis, no OR-Tools, no microservices
- Files stay under 200 lines — split into modules if longer
- After finishing any task → update PROGRESS.md immediately

## Project Structure
```
swachh-grid/
├── server/
│   ├── index.js          ← Express + Socket.io (port 3001)
│   ├── db.js             ← Neon pg pool + query()
│   ├── simulator.js      ← node-cron bin fill updates
│   ├── routeOptimizer.js ← greedy VRP in JS
│   ├── geminiPredictor.js← Gemini API wrapper + 5min cache
│   └── routes/
│       ├── bins.js       ← GET /api/bins, POST /api/bins/:id/override
│       ├── trucks.js     ← GET /api/trucks, GET /api/routes
│       ├── reports.js    ← POST /api/report, GET /api/reports
│       └── stats.js      ← GET /api/stats
├── client/
│   ├── app/
│   │   ├── page.jsx      ← Main map dashboard
│   │   ├── admin/page.jsx
│   │   ├── report/page.jsx
│   │   └── layout.jsx
│   ├── components/
│   │   ├── BinMap.jsx    ← Mapbox map + all layers
│   │   ├── BinPopup.jsx  ← Click popup + override button
│   │   ├── FleetPanel.jsx← Sidebar truck cards
│   │   ├── StatsBar.jsx  ← Bottom KPI bar
│   │   └── AdminQueue.jsx
│   ├── hooks/
│   │   └── useSocket.js  ← Socket.io client hook
│   └── lib/
│       └── mapbox.js
├── scripts/
│   ├── init-db.js        ← Create all tables
│   └── seed.js           ← 30 bins + 3 trucks
├── CONTEXT.md            ← This file
├── PROGRESS.md           ← Always read this first
├── SKILL.md              ← Full technical spec
└── .cursorrules
```

## Environment Variables
```
server/.env:
  DATABASE_URL=postgresql://...@neon.tech/swachhgrid?sslmode=require
  GEMINI_API_KEY=AIza...
  PORT=3001

client/.env.local:
  NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
  NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## DB Tables
bins | trucks | routes | bin_history | reports | stats

## Socket Events
Server emits: bin:update | route:update | alert:new | report:created | stats:update
Client emits: bin:override

## THE WOW FEATURE (Most Important)
Click bin on map → popup → click "Mark as Critical"
→ POST /api/bins/:id/override {fillLevel: 95}
→ DB updates → routeOptimizer runs → emits bin:update + route:update
→ Bin turns red + ALL truck routes redraw on map in <500ms
This is the demo centerpiece. It must work perfectly.

## Phases (Check PROGRESS.md for current status)
1. Backend Foundation — DB + APIs + Simulator + Route Optimizer
2. Live Map — Mapbox + Socket.io + WOW Feature
3. Citizen Reporting — Form + map pins
4. Gemini Prediction + Admin Panel
5. Polish (only if time allows)


Rules
- Never call Gemini in bulk or in cron jobs — lazy load per popup only, cache 5 min
- If ambiguous → make simpler choice, document in PROGRESS.md, don't ask me
- Files stay under 200 lines — split into modules if longer
