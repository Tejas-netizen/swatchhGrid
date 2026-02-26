'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { io } from 'socket.io-client';

const API = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const ZONES = [
  { key: 'market', label: 'Market Zone' },
  { key: 'residential', label: 'Residential Zone' },
  { key: 'transit', label: 'Transit Zone' },
];

function groupByZone(bins) {
  const groups = { market: [], residential: [], transit: [] };
  (bins || []).forEach((b) => {
    const z = (b.zone || '').toLowerCase();
    if (groups[z]) groups[z].push(b);
  });
  return groups;
}

function zoneStats(binsInZone) {
  const total = binsInZone.length;
  const critical = binsInZone.filter((b) => Number(b.fill_level) > 75).length;
  const avgFill = total
    ? binsInZone.reduce((s, b) => s + Number(b.fill_level) || 0, 0) / total
    : 0;
  const nextPickup = critical > 0 ? 'Soon' : 'On schedule';
  return { total, critical, avgFill, nextPickup };
}

export default function UserPage() {
  const [bins, setBins] = useState([]);

  const groups = useMemo(() => groupByZone(bins), [bins]);

  useEffect(() => {
    fetch(`${API}/api/bins`)
      .then((r) => r.json())
      .then(setBins)
      .catch(() => setBins([]));
  }, []);

  useEffect(() => {
    const s = io(API, { reconnection: true });
    s.on('bin:update', (payload) => {
      if (payload.bins) setBins(payload.bins);
    });
    return () => s.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="p-4 border-b border-gray-700">
        <Link href="/" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">
          ← Live Map
        </Link>
        <h1 className="text-white text-xl font-bold">🗺️ Live Bin Status — Pune</h1>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {ZONES.map(({ key, label }) => {
          const list = groups[key] || [];
          const { total, critical, avgFill, nextPickup } = zoneStats(list);
          const barPct = Math.min(100, Math.round(avgFill));
          const barColor = barPct > 75 ? 'bg-red-500' : barPct > 40 ? 'bg-amber-500' : 'bg-green-500';

          return (
            <div
              key={key}
              className="bg-gray-900 border border-gray-700 rounded-xl p-4"
            >
              <h2 className="text-white font-semibold text-lg mb-2">{label}</h2>
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>{total} bins</span>
                {critical > 0 && (
                  <span className="text-red-400 font-medium">{critical} critical</span>
                )}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                <div
                  className={`h-2.5 rounded-full transition-all ${barColor}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <p className="text-gray-500 text-xs">
                Next pickup: <span className="text-gray-400">{nextPickup}</span>
              </p>
            </div>
          );
        })}
      </main>

      <footer className="p-4 border-t border-gray-700">
        <Link
          href="/report"
          className="block text-center text-orange-400 hover:text-orange-300 font-medium"
        >
          See a problem? 📢 Report it →
        </Link>
      </footer>
    </div>
  );
}
