'use client';
import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

export default function StatsBar({ stats: initialStats }) {
  const [stats, setStats] = useState(
    initialStats || {
      binsCollected: 0,
      fuelSaved: 0,
      co2Saved: 0,
      overflowPrevented: 0,
    },
  );

  useEffect(() => {
    // Seed values immediately from API on first load
    fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/stats`)
      .then((r) => r.json())
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});

    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL, { reconnection: true });
    s.on('stats:update', (data) => {
      if (data) setStats(data);
    });
    return () => {
      s.off('stats:update');
      s.disconnect();
    };
  }, []);

  const items = useMemo(
    () => [
    {
      label: 'Bins Collected',
      value: stats.binsCollected || 0,
      unit: '',
      color: 'text-green-400',
    },
    {
      label: 'Fuel Saved',
      value: stats.fuelSaved || 0,
      unit: '%',
      color: 'text-blue-400',
    },
    {
      label: 'CO₂ Avoided',
      value: stats.co2Saved || 0,
      unit: 'kg',
      color: 'text-emerald-400',
    },
    {
      label: 'Overflow Prevented',
      value: stats.overflowPrevented || 0,
      unit: '',
      color: 'text-purple-400',
    },
  ],
    [stats],
  );
  return (
    <div className="h-16 bg-gray-900 border-t border-gray-700 flex items-center px-6 gap-8">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${item.color}`}>
            {item.value}
            {item.unit}
          </span>
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

