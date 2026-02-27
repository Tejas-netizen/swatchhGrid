'use client';
import { motion } from 'framer-motion';
import { FiTruck, FiAlertCircle, FiZap } from 'react-icons/fi';

const TRUCK_COLORS = { 1: '#3b82f6', 2: '#f59e0b', 3: '#8b5cf6' };
const ZONE_LABELS = {
  market: 'Market Zone',
  residential: 'Residential Zone',
  transit: 'Transit Zone',
};

const DEFAULT_TRUCKS = [
  { id: 1, name: 'Truck-1', current_load: 0, capacity: 100, status: 'active', assigned_zone: 'market' },
  { id: 2, name: 'Truck-2', current_load: 0, capacity: 100, status: 'active', assigned_zone: 'residential' },
  { id: 3, name: 'Truck-3', current_load: 0, capacity: 100, status: 'active', assigned_zone: 'transit' },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function FleetPanel({ trucks = [], alerts = [] }) {
  const displayTrucks = trucks.length > 0 ? trucks : DEFAULT_TRUCKS;

  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-72 h-full flex flex-col"
      style={{
        background: 'rgba(3, 7, 18, 0.95)',
        borderRight: '1px solid rgba(148, 163, 184, 0.1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div className="p-4 pb-3" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #22d3a4, #3b82f6)' }}
          >
            <span className="text-white text-lg">🗑️</span>
          </motion.div>
          <div>
            <h1
              className="font-bold text-lg leading-none"
              style={{
                background: 'linear-gradient(135deg, #22d3a4, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              SwachhGrid
            </h1>
            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Live Waste Monitor</p>
          </div>
        </div>
      </div>

      {/* Fleet Section */}
      <div className="p-4" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
        <div className="flex items-center gap-2 mb-3">
          <FiTruck size={12} style={{ color: '#22d3a4' }} />
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>
            Fleet Status
          </h2>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {displayTrucks.map((truck) => {
            const load = Number(truck.current_load ?? 0);
            const capacity = Number(truck.capacity ?? 100);
            const loadPct = Math.min(100, Math.round((load / capacity) * 100));
            const isFull = loadPct >= 100;
            const isReturning = truck.status === 'returning';
            const color = TRUCK_COLORS[truck.id] || '#3b82f6';
            const barColor = loadPct > 80 ? '#ef4444' : loadPct > 50 ? '#f59e0b' : '#22c55e';
            const isCritical = isFull || isReturning;

            return (
              <motion.div
                key={truck.id}
                variants={cardVariants}
                whileHover={{ scale: 1.01, x: 2 }}
                className="rounded-xl p-3 cursor-default"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid rgba(148, 163, 184, 0.08)`,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
                      {truck.name}
                    </span>
                  </div>
                  <motion.span
                    animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={
                      isCritical
                        ? { background: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.3)' }
                        : { background: 'rgba(34, 211, 164, 0.12)', color: '#6ee7b7', border: '1px solid rgba(34, 211, 164, 0.2)' }
                    }
                  >
                    {isCritical ? '↩ returning' : truck.status}
                  </motion.span>
                </div>

                <div className="text-xs mb-2 capitalize" style={{ color: '#64748b' }}>
                  {ZONE_LABELS[truck.assigned_zone] ?? truck.assigned_zone}
                </div>

                <div
                  className="w-full rounded-full h-1.5 mb-1 overflow-hidden"
                  style={{ background: 'rgba(148, 163, 184, 0.1)' }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${loadPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    className="h-1.5 rounded-full"
                    style={{ background: barColor }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: '#475569' }}>Load</span>
                  <span className="text-xs font-semibold" style={{ color: barColor }}>
                    {load}/{capacity} ({loadPct}%)
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <FiAlertCircle size={12} style={{ color: '#ef4444' }} />
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>
              Alerts
            </h2>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}
            >
              {alerts.length}
            </span>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            {alerts.slice(0, 5).map((alert, i) => (
              <motion.div
                key={i}
                variants={cardVariants}
                className="rounded-lg p-2.5 text-xs"
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                }}
              >
                <FiZap size={10} className="inline mr-1" />
                {alert.message}
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Bottom padding for navbar */}
      <div className="h-4" />
    </motion.aside>
  );
}