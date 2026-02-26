'use client';
const COLORS = { 1: '#3b82f6', 2: '#f59e0b', 3: '#8b5cf6' };

const ZONE_LABELS = {
  market: 'Market Zone',
  residential: 'Residential Zone',
  transit: 'Transit Zone',
};

export default function FleetPanel({ trucks = [], alerts = [] }) {
  const displayTrucks =
    trucks.length > 0
      ? trucks
      : [
          { id: 1, name: 'Truck-1', current_load: 0, capacity: 100, status: 'active', assigned_zone: 'market' },
          { id: 2, name: 'Truck-2', current_load: 0, capacity: 100, status: 'active', assigned_zone: 'residential' },
          { id: 3, name: 'Truck-3', current_load: 0, capacity: 100, status: 'active', assigned_zone: 'transit' },
        ];

  return (
    <div className="w-72 h-full bg-gray-900 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-white font-bold text-xl">🗑️ SwachhGrid</h1>
        <p className="text-gray-400 text-xs mt-1">Live Waste Collection Monitor</p>
      </div>

      <div className="p-4 border-b border-gray-700">
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">
          Fleet Status
        </h2>
        <div className="space-y-3">
          {displayTrucks.map((truck) => {
            const load = Number(truck.current_load ?? 0);
            const capacity = Number(truck.capacity ?? 100);
            const loadPct = Math.min(100, Math.round((load / capacity) * 100));
            const isFull = loadPct >= 100;
            const isReturning = truck.status === 'returning';

            // Load bar color: green → amber → red
            const barColor =
              loadPct > 80 ? '#ef4444' : loadPct > 50 ? '#f59e0b' : '#22c55e';

            return (
              <div key={truck.id} className="bg-gray-800 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white font-semibold text-sm flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ background: COLORS[truck.id] }}
                    />
                    {truck.name}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isFull || isReturning
                        ? 'bg-orange-900 text-orange-300'
                        : truck.status === 'active'
                        ? 'bg-green-900 text-green-300'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {isFull || isReturning ? '↩ returning' : truck.status}
                  </span>
                </div>

                <div className="text-gray-400 text-xs mb-2 capitalize">
                  {ZONE_LABELS[truck.assigned_zone] ?? truck.assigned_zone}
                </div>

                {/* Load bar */}
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${loadPct}%`, background: barColor }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500 text-xs">Load</span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: barColor }}
                  >
                    {load}/{capacity} units ({loadPct}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">
            Alerts
          </h2>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert, i) => (
              <div
                key={i}
                className="bg-red-900/30 border border-red-800 rounded-lg p-2 text-xs"
              >
                <span className="text-red-400">⚠️ {alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}