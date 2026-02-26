# Phase 2 — Live Map + WOW Feature
## Tool: Any | Paste with: CONTEXT.md + PROGRESS.md

---

## Goal
Mapbox map loads → bins colored live → click bin → popup → click "Mark as Critical" → bin turns red + routes redraw instantly.
This is the entire demo value in one interaction. Build it perfectly.

## Ask Me For
`NEXT_PUBLIC_MAPBOX_TOKEN` (Mapbox public token) before starting.

## Prerequisite
Phase 1 must be DONE and server running on port 3001.

---

## Step 1 — Next.js Setup

In `client/` folder:
```bash
npx create-next-app@latest . --app --tailwind --no-typescript --no-eslint
npm install mapbox-gl socket.io-client react-markdown
```

Create `client/.env.local`:
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

Add to `client/next.config.js` to handle mapbox worker:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, 'mapbox-gl': 'mapbox-gl' };
    return config;
  }
};
module.exports = nextConfig;
```

---

## Step 2 — Socket Hook

Create `client/hooks/useSocket.js`:
```javascript
'use client';
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export default function useSocket() {
  const [bins, setBins] = useState([]);
  const [routes, setRoutes] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ binsCollected: 0, fuelSaved: 0, co2Saved: 0, overflowPrevented: 0 });
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL, { reconnection: true });
    const s = socketRef.current;

    s.on('bin:update', ({ bins }) => setBins(bins));
    s.on('route:update', ({ routes }) => setRoutes(routes));
    s.on('alert:new', (alert) => setAlerts(prev => [alert, ...prev].slice(0, 20)));
    s.on('report:created', ({ report }) => setReports(prev => [report, ...prev]));
    s.on('stats:update', (data) => setStats(data));

    // Load initial data
    fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/bins`).then(r => r.json()).then(setBins);
    fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/trucks/routes`).then(r => r.json()).then(data => {
      const routeMap = {};
      data.forEach(r => { routeMap[r.truck_id] = r; });
      setRoutes(routeMap);
    });
    fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/reports`).then(r => r.json()).then(setReports);
    fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/stats`).then(r => r.json()).then(data => {
      if (data) setStats(data);
    });

    return () => s.disconnect();
  }, []);

  const overrideBin = async (binId, fillLevel) => {
    await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/bins/${binId}/override`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fillLevel })
    });
  };

  return { bins, routes, alerts, reports, stats, overrideBin };
}
```

---

## Step 3 — Bin Map Component

Create `client/components/BinMap.jsx`:
```javascript
'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import BinPopup from './BinPopup';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const TRUCK_COLORS = { 1: '#3b82f6', 2: '#f59e0b', 3: '#8b5cf6' };

export default function BinMap({ bins, routes, reports, overrideBin }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [selectedBin, setSelectedBin] = useState(null);
  const [popupCoords, setPopupCoords] = useState(null);

  // Init map once
  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [73.8567, 18.5204],
      zoom: 11.5
    });

    map.current.on('load', () => {
      // Bins source
      map.current.addSource('bins', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({
        id: 'bins-circle', type: 'circle', source: 'bins',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 12],
          'circle-color': [
            'step', ['get', 'fillLevel'],
            '#22c55e', 40, '#f59e0b', 75, '#ef4444'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9
        }
      });

      // Truck route lines (3 trucks)
      [1, 2, 3].forEach(id => {
        map.current.addSource(`route-${id}`, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.current.addLayer({
          id: `route-${id}`, type: 'line', source: `route-${id}`,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': TRUCK_COLORS[id], 'line-width': 3, 'line-dasharray': [2, 1], 'line-opacity': 0.8 }
        });
      });

      // Reports source
      map.current.addSource('reports', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({
        id: 'reports-circle', type: 'circle', source: 'reports',
        paint: { 'circle-radius': 8, 'circle-color': '#f97316', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
      });

      // Bin click handler
      map.current.on('click', 'bins-circle', (e) => {
        const props = e.features[0].properties;
        const coords = e.features[0].geometry.coordinates;
        setSelectedBin({ ...props, lat: coords[1], lng: coords[0] });
        setPopupCoords(coords);
      });

      map.current.on('click', (e) => {
        if (!e.features || e.features.length === 0) setSelectedBin(null);
      });

      map.current.on('mouseenter', 'bins-circle', () => { map.current.getCanvas().style.cursor = 'pointer'; });
      map.current.on('mouseleave', 'bins-circle', () => { map.current.getCanvas().style.cursor = ''; });
    });
  }, []);

  // Update bins on map
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || bins.length === 0) return;
    const features = bins.map(b => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [parseFloat(b.lng), parseFloat(b.lat)] },
      properties: { id: b.id, name: b.name, fillLevel: b.fill_level, status: b.status, zone: b.zone,
        citizenReports: b.citizen_reports, priorityScore: b.priority_score }
    }));
    if (map.current.getSource('bins')) {
      map.current.getSource('bins').setData({ type: 'FeatureCollection', features });
    }
  }, [bins]);

  // Update routes on map
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    Object.values(routes).forEach(route => {
      const sourceId = `route-${route.truck_id}`;
      if (map.current.getSource(sourceId) && route.route_geojson) {
        const geojson = typeof route.route_geojson === 'string' ? JSON.parse(route.route_geojson) : route.route_geojson;
        map.current.getSource(sourceId).setData({ type: 'FeatureCollection', features: [geojson] });
      }
    });
  }, [routes]);

  // Update reports on map
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    const features = reports.map(r => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [parseFloat(r.lng), parseFloat(r.lat)] },
      properties: { issueType: r.issue_type, status: r.status }
    }));
    if (map.current.getSource('reports')) {
      map.current.getSource('reports').setData({ type: 'FeatureCollection', features });
    }
  }, [reports]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {selectedBin && popupCoords && (
        <BinPopup
          bin={selectedBin}
          onClose={() => setSelectedBin(null)}
          onOverride={(fillLevel) => {
            overrideBin(selectedBin.id, fillLevel);
            setSelectedBin(null);
          }}
        />
      )}
    </div>
  );
}
```

---

## Step 4 — Bin Popup

Create `client/components/BinPopup.jsx`:
```javascript
'use client';
import { useState, useEffect } from 'react';

export default function BinPopup({ bin, onClose, onOverride }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/predict/${bin.id}`, { method: 'POST' })
      .then(r => r.json()).then(setPrediction).catch(() => setPrediction(null))
      .finally(() => setLoading(false));
  }, [bin.id]);

  const fillColor = bin.fillLevel > 75 ? 'border-red-500' : bin.fillLevel > 40 ? 'border-amber-400' : 'border-green-500';
  const statusBg = bin.fillLevel > 75 ? 'bg-red-500' : bin.fillLevel > 40 ? 'bg-amber-400' : 'bg-green-500';

  return (
    <div className={`absolute top-4 right-4 w-72 bg-gray-900 border-2 ${fillColor} rounded-xl p-4 shadow-2xl z-10`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-bold text-lg">{bin.name}</h3>
          <span className="text-gray-400 text-sm capitalize">{bin.zone} zone</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`${statusBg} text-white text-xs px-2 py-1 rounded-full font-semibold`}>{bin.status}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Fill Level</span>
          <span className="text-white font-bold">{bin.fillLevel}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all ${bin.fillLevel > 75 ? 'bg-red-500' : bin.fillLevel > 40 ? 'bg-amber-400' : 'bg-green-500'}`}
            style={{ width: `${bin.fillLevel}%` }} />
        </div>
      </div>

      <div className="space-y-1 mb-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Citizen Reports</span>
          <span className="text-white">{bin.citizenReports || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Priority Score</span>
          <span className="text-white">{parseFloat(bin.priorityScore || 0).toFixed(1)}</span>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-2 mb-3 text-sm">
        {loading ? (
          <span className="text-gray-400">🔮 Fetching AI prediction...</span>
        ) : prediction && prediction.hoursUntilOverflow ? (
          <>
            <div className="text-purple-400 font-semibold">
              🔮 Overflow in ~{prediction.hoursUntilOverflow.toFixed(1)} hrs
              <span className="text-gray-500 text-xs ml-1">({prediction.confidence} confidence)</span>
            </div>
            {prediction.recommendation && (
              <div className="text-gray-400 text-xs mt-1 italic">{prediction.recommendation}</div>
            )}
          </>
        ) : (
          <span className="text-gray-500 text-xs">Prediction unavailable</span>
        )}
      </div>

      <button
        onClick={() => onOverride(95)}
        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
      >
        🚨 Mark as Critical — Reroute Truck
      </button>
    </div>
  );
}
```

---

## Step 5 — Fleet Panel

Create `client/components/FleetPanel.jsx`:
```javascript
'use client';
const COLORS = { 1: '#3b82f6', 2: '#f59e0b', 3: '#8b5cf6' };

export default function FleetPanel({ trucks = [], alerts = [] }) {
  const mockTrucks = trucks.length > 0 ? trucks : [
    { id: 1, name: 'Truck-1', current_load: 0, status: 'active', assigned_zone: 'market' },
    { id: 2, name: 'Truck-2', current_load: 0, status: 'active', assigned_zone: 'residential' },
    { id: 3, name: 'Truck-3', current_load: 0, status: 'active', assigned_zone: 'transit' },
  ];

  return (
    <div className="w-72 h-full bg-gray-900 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-white font-bold text-xl">🗑️ SwachhGrid</h1>
        <p className="text-gray-400 text-xs mt-1">Live Waste Collection Monitor</p>
      </div>

      <div className="p-4 border-b border-gray-700">
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Fleet Status</h2>
        <div className="space-y-3">
          {mockTrucks.map(truck => (
            <div key={truck.id} className="bg-gray-800 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-semibold text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLORS[truck.id] }} />
                  {truck.name}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${truck.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                  {truck.status}
                </span>
              </div>
              <div className="text-gray-400 text-xs mb-1 capitalize">{truck.assigned_zone} zone</div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${truck.current_load || 0}%` }} />
              </div>
              <div className="text-gray-500 text-xs mt-1">Load: {truck.current_load || 0}%</div>
            </div>
          ))}
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Alerts</h2>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert, i) => (
              <div key={i} className="bg-red-900/30 border border-red-800 rounded-lg p-2 text-xs">
                <span className="text-red-400">⚠️ {alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Step 6 — Stats Bar

Create `client/components/StatsBar.jsx`:
```javascript
export default function StatsBar({ stats }) {
  const items = [
    { label: 'Bins Collected', value: stats.binsCollected || 0, unit: 'today', color: 'text-green-400' },
    { label: 'Fuel Saved', value: stats.fuelSaved || 0, unit: '%', color: 'text-blue-400' },
    { label: 'CO₂ Avoided', value: stats.co2Saved || 0, unit: 'kg', color: 'text-emerald-400' },
    { label: 'Overflow Prevented', value: stats.overflowPrevented || 0, unit: 'bins', color: 'text-purple-400' },
  ];
  return (
    <div className="h-16 bg-gray-900 border-t border-gray-700 flex items-center px-6 gap-8">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${item.color}`}>{item.value}{item.unit}</span>
          <span className="text-gray-500 text-xs">{item.label}</span>
        </div>
      ))}
      <div className="ml-auto flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-gray-400 text-xs">Live</span>
      </div>
    </div>
  );
}
```

---

## Step 7 — Main Dashboard Page

Update `client/app/page.jsx`:
```javascript
'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import useSocket from '@/hooks/useSocket';
import FleetPanel from '@/components/FleetPanel';
import StatsBar from '@/components/StatsBar';
import Link from 'next/link';

const BinMap = dynamic(() => import('@/components/BinMap'), { ssr: false });

export default function Dashboard() {
  const { bins, routes, alerts, reports, stats, overrideBin } = useSocket();
  const [trucks, setTrucks] = useState([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/trucks`)
      .then(r => r.json()).then(setTrucks).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="flex flex-1 overflow-hidden">
        <FleetPanel trucks={trucks} alerts={alerts} />
        <div className="flex-1 relative">
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            <Link href="/report" className="bg-orange-600 hover:bg-orange-500 text-white text-sm px-3 py-1.5 rounded-lg font-medium">
              📢 Report Issue
            </Link>
            <Link href="/admin" className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium">
              🏛️ Admin
            </Link>
          </div>
          <BinMap bins={bins} routes={routes} reports={reports} overrideBin={overrideBin} />
        </div>
      </div>
      <StatsBar stats={stats} />
    </div>
  );
}
```

Also update `client/app/layout.jsx` — set dark background:
```javascript
import './globals.css';
export const metadata = { title: 'SwachhGrid', description: 'Smart Waste Collection' };
export default function RootLayout({ children }) {
  return <html lang="en"><body className="bg-gray-950 text-white">{children}</body></html>;
}
```

---

## Phase 2 Checkpoint — The WOW Feature Test

1. Run both servers: `node server/index.js` and `npm run dev` in client/
2. Open `http://localhost:3000`
3. Map loads dark with colored bin circles ✅
4. Wait 30s — bin colors should shift ✅
5. Click any bin → popup with data + prediction loading ✅
6. Click "Mark as Critical" → **bin turns RED + route lines REDRAW** ✅
7. This must work smoothly. If routes don't redraw, check Socket.io connection.

Update PROGRESS.md. Mark Phase 2 DONE.
**Ask user to confirm before starting Phase 3.**
