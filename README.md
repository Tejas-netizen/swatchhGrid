# 🗑️ SwachhGrid — Smart City Waste Collection Dashboard

> **Real-time waste bin monitoring + AI-powered dynamic truck route optimization for Pune, India**

---

## 🏆 Hackathon Project

SwachhGrid is a smart city waste management platform that uses real-time IoT simulation, machine learning predictions, and dynamic route optimization to reduce urban waste overflow, cut fuel costs, and empower citizens to participate in keeping their city clean.

**Aligned with:** UN SDG 11 — Sustainable Cities and Communities

---

## ✨ Key Features

### 🗺️ Live Map Dashboard
- 30 waste bins across 3 Pune zones shown on an interactive Mapbox map
- Bins color-coded in real time: 🟢 Green (<40%) → 🟡 Amber (40–75%) → 🔴 Red (>75%)
- Truck routes drawn as colored polylines per zone
- Animated 🚛 truck markers moving along optimized routes
- Live alerts panel showing bin collections and critical events

### ⚡ WOW Feature — One-Click Rerouting
- Click any bin on the map → popup opens
- Click **"Mark as Critical — Reroute Truck"**
- Bin instantly turns red + ALL truck routes redraw live on map in <500ms

### 🤖 AI-Powered Predictions
- Random Forest model predicts current bin fill status (GREEN / YELLOW / RED)
- Gradient Boosting forecaster predicts fill levels at 6h, 12h, 24h ahead
- Model outputs feed directly into simulator fill rates per zone
- ML Models: [HuggingFace Space →](https://huggingface.co/spaces/tejas2110/smart_ai_hack)

### 👥 Role-Based Interfaces

| Role | URL | Purpose |
|------|-----|---------|
| 🏛️ Admin | `/admin` | Priority bin queue, dispatch controls, citizen reports |
| 🚛 Driver | `/driver` | Zone-specific bin list, mark collected, real-time updates |
| 👤 Citizen | `/user` | Read-only zone status, report waste issues |

### 📢 Citizen Reporting
- Submit waste issue with GPS location capture + photo upload
- Orange ⚠️ pin appears on live map instantly via Socket.io

### 📊 Real-Time Stats Bar
- Bins collected today · Fuel saved % · CO₂ avoided · Overflow incidents prevented

---

## 🧠 ML Models

> Trained in Google Colab. Live demo: [HuggingFace Space →](https://huggingface.co/spaces/tejas2110/smart_ai_hack)

### Model 1 — Smart Bin Fill Level Predictor
- `RandomForestRegressor` → predicts exact fill %  
- `RandomForestClassifier` → predicts GREEN / YELLOW / RED  
- Dataset: 100 bins × 720 hours = 72,000 rows  
- Performance: MAE < 2%, R² > 0.95, Classification Accuracy > 94%

### Model 2 — Garbage Flow Forecaster
- `GradientBoostingRegressor` → forecasts fill at 6h / 12h / 24h ahead  
- MAE: ~2–3% (6h), ~4–5% (12h), ~6–7% (24h)

### How Models Connect to SwachhGrid
```
Model 1 + 2 (Google Colab) → Predicted fill rates per zone
  market=4.5%/tick | residential=1.5%/tick | transit=3.2%/tick
        ↓
  Hardcoded into server/simulator.js as zone fill_rate values
        ↓
  Simulator ticks every 30s → bins fill at ML-predicted rates
        ↓
  Route optimizer triggers when bins cross 80% threshold
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Next.js :3000)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │  BinMap  │  │FleetPanel│  │ StatsBar │  │Admin/  │  │
│  │ (Mapbox) │  │(Sidebar) │  │ (Bottom) │  │Driver/ │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │User    │  │
│       └─────────────┴─────────────┘         └────────┘  │
│                      Socket.io Client                    │
└──────────────────────┬──────────────────────────────────┘
                       │ WebSocket
┌──────────────────────┴──────────────────────────────────┐
│                   SERVER (Express :3001)                 │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Simulator  │  │Route         │  │  Socket.io      │  │
│  │ (node-cron │  │Optimizer     │  │  Events:        │  │
│  │  30s tick) │  │(Greedy VRP)  │  │  bin:update     │  │
│  └─────┬──────┘  └──────┬───────┘  │  route:update   │  │
│        └────────────────┘          │  stats:update   │  │
│  REST API: /api/bins /api/trucks                        │  │
│            /api/reports /api/stats └─────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ pg (raw SQL)
┌──────────────────────┴──────────────────────────────────┐
│              Neon PostgreSQL (Cloud)                     │
│   bins | trucks | routes | bin_history | reports | stats │
└─────────────────────────────────────────────────────────┘
```

---

## 🗺️ Zones — Pune

| Zone | Area | Bins | Fill Rate | Truck |
|------|------|------|-----------|-------|
| 🔵 Market | Shivajinagar | 10 | 4.5%/tick | Truck-1 (Blue) |
| 🟡 Residential | Kothrud | 10 | 1.5%/tick | Truck-2 (Amber) |
| 🟣 Transit | Hinjewadi | 10 | 3.2%/tick | Truck-3 (Purple) |

---

## ⚙️ Route Optimization Algorithm

Custom **Greedy Nearest-Neighbor VRP** in JavaScript:
1. Filter bins with `fill_level >= 60` OR `status = 'critical'`
2. Priority score = `(fill_level × 0.4) + (citizen_reports × 10 × 0.3) + (urgency × 0.3)`
3. Nearest-neighbor greedy assignment minimizes total distance per truck
4. Re-runs only when a bin crosses 80% threshold
5. Saves GeoJSON LineString → emits `route:update` → frontend redraws

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ · Neon PostgreSQL account · Mapbox account (free tier works for both)

### Installation

```bash
git clone https://github.com/yourusername/swachh-grid.git
cd swachh-grid

cd server && npm install
cd ../client && npm install
```

### Environment Setup

**`server/.env`**
```env
DATABASE_URL=postgresql://...@neon.tech/swachhgrid?sslmode=require
PORT=3001
```

**`client/.env.local`**
```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Database Setup

```bash
node scripts/init-db.js   # Create tables
node scripts/seed.js      # Seed 30 bins + 3 trucks
```

### Run Locally

```bash
# Terminal 1 — Backend
cd server && node index.js
# ✅ SwachhGrid server on port 3001

# Terminal 2 — Frontend
cd client && npm run dev
# ✅ Next.js on http://localhost:3000
```

### Deploy to Production

```bash
# Backend → Render.com  (free, supports WebSockets)
# Frontend → Vercel     (free, best for Next.js)
```

See [DEPLOY.md](./DEPLOY.md) for step-by-step instructions.

---

## 📁 Project Structure

```
swachh-grid/
├── server/
│   ├── index.js              ← Express + Socket.io
│   ├── db.js                 ← Neon pg pool
│   ├── simulator.js          ← node-cron bin fill simulation
│   ├── routeOptimizer.js     ← Greedy VRP algorithm
│   └── routes/
│       ├── bins.js           ← GET/POST bins, override, collected
│       ├── trucks.js         ← GET trucks, routes, position
│       ├── reports.js        ← Citizen reports CRUD
│       └── stats.js          ← KPI stats
├── client/
│   ├── app/
│   │   ├── page.jsx          ← Main map dashboard
│   │   ├── landing/page.jsx  ← Landing page
│   │   ├── admin/page.jsx    ← Admin control panel
│   │   ├── driver/page.jsx   ← Driver interface
│   │   ├── user/page.jsx     ← Citizen zone status
│   │   └── report/page.jsx   ← Citizen reporting form
│   └── components/
│       ├── BinMap.jsx        ← Mapbox map + animations
│       ├── FleetPanel.jsx    ← Truck sidebar
│       └── StatsBar.jsx      ← Bottom KPI bar
└── scripts/
    ├── init-db.js
    └── seed.js
```

---

## 🔌 Socket.io Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `bin:update` | Server → Client | `{ bins: [...] }` |
| `route:update` | Server → Client | `{ routes: {...} }` |
| `alert:new` | Server → Client | `{ binId, message, type }` |
| `report:created` | Server → Client | `{ report }` |
| `stats:update` | Server → Client | `{ binsCollected, fuelSaved, co2Saved }` |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + Tailwind CSS + Framer Motion |
| Map | Mapbox GL JS |
| Realtime | Socket.io |
| Backend | Node.js + Express |
| Database | Neon PostgreSQL (raw `pg` queries) |
| Simulation | node-cron (30s intervals) |
| ML Models | Random Forest + Gradient Boosting (Python/Colab) |
| Hosting | Vercel (frontend) + Render (backend) |

---

## 📄 License

MIT License

---

*SwachhGrid — Because every bin matters.* 🗑️
