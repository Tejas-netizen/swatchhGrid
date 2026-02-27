'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import Navbar from '@/components/Navbar';
import { FiMapPin, FiAlertTriangle, FiCheckCircle, FiArrowRight } from 'react-icons/fi';

const API = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const ZONES = [
  { key: 'market', label: 'Market Zone', emoji: '🏪', color: '#3b82f6' },
  { key: 'residential', label: 'Residential Zone', emoji: '🏠', color: '#22d3a4' },
  { key: 'transit', label: 'Transit Zone', emoji: '🚉', color: '#8b5cf6' },
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
  const avgFill = total ? binsInZone.reduce((s, b) => s + Number(b.fill_level) || 0, 0) / total : 0;
  const nextPickup = critical > 0 ? 'Soon' : 'On schedule';
  return { total, critical, avgFill: Math.round(avgFill), nextPickup };
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export default function UserPage() {
  const [bins, setBins] = useState([]);
  const groups = useMemo(() => groupByZone(bins), [bins]);

  useEffect(() => {
    fetch(`${API}/api/bins`).then((r) => r.json()).then(setBins).catch(() => setBins([]));
  }, []);

  useEffect(() => {
    const s = io(API, { reconnection: true });
    s.on('bin:update', (payload) => { if (payload.bins) setBins(payload.bins); });
    return () => s.disconnect();
  }, []);

  const overallCritical = Object.values(groups).flat().filter((b) => Number(b.fill_level) > 75).length;

  return (
    <div className="min-h-screen" style={{ background: '#030712' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-8">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm mb-5 hover:opacity-80 transition-opacity" style={{ color: '#64748b' }}>
            ← Live Map
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                <span style={{ background: 'linear-gradient(135deg, #22d3a4, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Pune Bin Status
                </span>
              </h1>
              <p className="text-sm" style={{ color: '#64748b' }}>Real-time fill levels across all zones</p>
            </div>
            {overallCritical > 0 && (
              <motion.div
                animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
              >
                <FiAlertTriangle size={13} />
                {overallCritical} Critical
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Zone Cards */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
          {ZONES.map(({ key, label, emoji, color }) => {
            const list = groups[key] || [];
            const { total, critical, avgFill, nextPickup } = zoneStats(list);
            const barColor = avgFill > 75 ? '#ef4444' : avgFill > 40 ? '#f59e0b' : '#22d3a4';

            return (
              <motion.div
                key={key}
                variants={itemVariants}
                whileHover={{ scale: 1.01, y: -2 }}
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(15,23,42,0.7)',
                  border: `1px solid rgba(148,163,184,0.08)`,
                  borderLeft: `3px solid ${color}`,
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{emoji}</span>
                    <div>
                      <h2 className="font-bold text-base" style={{ color: '#f1f5f9' }}>{label}</h2>
                      <p className="text-xs" style={{ color: '#475569' }}>{total} bins monitored</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {critical > 0 ? (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                        className="text-xs px-2 py-1 rounded-lg font-semibold"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}
                      >
                        {critical} critical
                      </motion.span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-lg font-semibold flex items-center gap-1" style={{ background: 'rgba(34,211,164,0.1)', color: '#6ee7b7', border: '1px solid rgba(34,211,164,0.2)' }}>
                        <FiCheckCircle size={10} /> All good
                      </span>
                    )}
                  </div>
                </div>

                {/* Fill Progress */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1" style={{ color: '#64748b' }}>
                    <span>Average Fill Level</span>
                    <span style={{ color: barColor, fontWeight: 600 }}>{avgFill}%</span>
                  </div>
                  <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'rgba(148,163,184,0.1)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, avgFill)}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                      className="h-2 rounded-full"
                      style={{ background: barColor }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs" style={{ color: '#475569' }}>
                  <FiMapPin size={10} />
                  <span>Next pickup: <span style={{ color: critical > 0 ? '#fcd34d' : '#22d3a4', fontWeight: 600 }}>{nextPickup}</span></span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Footer CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8">
          <Link href="/report">
            <motion.div
              whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' }}
            >
              <FiAlertTriangle size={14} />
              See a problem? Report it →
              <FiArrowRight size={14} />
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
