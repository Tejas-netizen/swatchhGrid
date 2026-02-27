'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import { FiDroplet, FiWind, FiShield, FiActivity } from 'react-icons/fi';

const KPI_CONFIG = [
  { key: 'binsCollected', label: 'Bins Collected', unit: '', icon: FiActivity, color: '#22d3a4', glow: 'rgba(34, 211, 164, 0.3)' },
  { key: 'fuelSaved', label: 'Fuel Saved', unit: '%', icon: FiDroplet, color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.3)' },
  { key: 'co2Saved', label: 'CO₂ Avoided', unit: 'kg', icon: FiWind, color: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' },
  { key: 'overflowPrevented', label: 'Overflows Stopped', unit: '', icon: FiShield, color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.3)' },
];

function AnimatedNumber({ value, unit }) {
  const [displayed, setDisplayed] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const prev = prevRef.current;
    if (target === prev) return;
    const diff = target - prev;
    const steps = 30;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setDisplayed(Math.round(prev + (diff * step) / steps));
      if (step >= steps) {
        setDisplayed(target);
        prevRef.current = target;
        clearInterval(timer);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {displayed}
      {unit}
    </span>
  );
}

export default function StatsBar({ stats: initialStats }) {
  const [stats, setStats] = useState(
    initialStats || { binsCollected: 0, fuelSaved: 0, co2Saved: 0, overflowPrevented: 0 }
  );

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/stats`)
      .then((r) => r.json())
      .then((data) => { if (data) setStats(data); })
      .catch(() => { });

    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL, { reconnection: true });
    s.on('stats:update', (data) => { if (data) setStats(data); });
    return () => { s.off('stats:update'); s.disconnect(); };
  }, []);

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="h-16 flex items-center px-4 gap-2 shrink-0"
      style={{
        background: 'rgba(3, 7, 18, 0.95)',
        borderTop: '1px solid rgba(148, 163, 184, 0.08)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {KPI_CONFIG.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.08 }}
            whileHover={{ scale: 1.04 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-default"
            style={{
              background: `rgba(${item.color === '#22d3a4' ? '34,211,164' : item.color === '#3b82f6' ? '59,130,246' : item.color === '#10b981' ? '16,185,129' : '139,92,246'}, 0.07)`,
              border: `1px solid rgba(${item.color === '#22d3a4' ? '34,211,164' : item.color === '#3b82f6' ? '59,130,246' : item.color === '#10b981' ? '16,185,129' : '139,92,246'}, 0.15)`,
            }}
          >
            <Icon size={14} style={{ color: item.color }} />
            <div>
              <div
                className="text-lg font-bold leading-none"
                style={{ color: item.color, textShadow: `0 0 12px ${item.glow}` }}
              >
                <AnimatedNumber value={stats[item.key] || 0} unit={item.unit} />
              </div>
              <div className="text-xs leading-none mt-0.5 hidden lg:block" style={{ color: '#475569' }}>
                {item.label}
              </div>
            </div>
          </motion.div>
        );
      })}

      <div className="ml-auto flex items-center gap-2">
        <div className="live-dot" />
        <span className="text-xs font-medium" style={{ color: '#22d3a4' }}>Live</span>
      </div>
    </motion.div>
  );
}
