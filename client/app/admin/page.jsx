'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import Navbar from '@/components/Navbar';
import { FiCheckCircle, FiTruck, FiMapPin, FiAlertCircle, FiArrowLeft } from 'react-icons/fi';

const API = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

const ISSUE_COLORS = {
  overflow: { bg: 'rgba(239,68,68,0.12)', text: '#fca5a5', border: 'rgba(239,68,68,0.25)' },
  missed_pickup: { bg: 'rgba(245,158,11,0.12)', text: '#fcd34d', border: 'rgba(245,158,11,0.25)' },
  illegal_dumping: { bg: 'rgba(249,115,22,0.12)', text: '#fdba74', border: 'rgba(249,115,22,0.25)' },
  other: { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8', border: 'rgba(148,163,184,0.18)' },
};

function relativeTime(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day}d ago`;
  if (hr > 0) return `${hr}hr ago`;
  if (min > 0) return `${min}min ago`;
  return 'Just now';
}

function dist(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const cardVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } };

export default function AdminPage() {
  const [reports, setReports] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);
  const [dispatchingId, setDispatchingId] = useState(null);

  const openReports = reports.filter((r) => (r.status || 'open') === 'open');

  const fetchReports = useCallback(() => {
    fetch(`${API}/api/reports`).then((r) => r.json()).then((data) => setReports(Array.isArray(data) ? data : [])).catch(() => setReports([]));
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  useEffect(() => {
    const s = io(API, { reconnection: true });
    s.on('report:created', ({ report }) => { if (report) setReports((prev) => [report, ...prev]); });
    return () => s.disconnect();
  }, []);

  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      const res = await fetch(`${API}/api/reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'resolved' }) });
      if (res.ok) setReports((prev) => prev.filter((r) => r.id !== id));
    } finally { setResolvingId(null); }
  };

  const handleDispatch = async (report) => {
    const id = report.id;
    setDispatchingId(id);
    try {
      const binsRes = await fetch(`${API}/api/bins`).then((r) => r.json());
      const bins = Array.isArray(binsRes) ? binsRes : [];
      const lat = parseFloat(report.lat);
      const lng = parseFloat(report.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      let nearest = null, nearestDist = Infinity;
      for (const b of bins) {
        const d = dist(lat, lng, parseFloat(b.lat), parseFloat(b.lng));
        if (d < nearestDist) { nearestDist = d; nearest = b; }
      }
      if (nearest) {
        await fetch(`${API}/api/bins/${nearest.id}/override`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fillLevel: 95 }) });
      }
    } finally { setDispatchingId(null); }
  };

  return (
    <div className="min-h-screen" style={{ background: '#030712' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-8">

        {/* Hero Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm mb-5 hover:opacity-80 transition-opacity" style={{ color: '#64748b' }}>
            <FiArrowLeft size={14} /> Back to Map
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                <span style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Admin Panel
                </span>
              </h1>
              <p className="text-sm" style={{ color: '#64748b' }}>Operator queue and dispatch controls</p>
            </div>
            {openReports.length > 0 && (
              <motion.div
                animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
              >
                <FiAlertCircle size={13} />
                {openReports.length} Open
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Reports Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FiAlertCircle size={14} style={{ color: '#8b5cf6' }} />
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>Citizen Reports</h2>
          </div>

          {openReports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 rounded-2xl"
              style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.08)' }}
            >
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold" style={{ color: '#64748b' }}>No open complaints</p>
              <p className="text-xs mt-1" style={{ color: '#475569' }}>All reports resolved</p>
            </motion.div>
          ) : (
            <motion.ul variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
              <AnimatePresence>
                {openReports.map((report) => {
                  const issueType = (report.issue_type || 'other').toLowerCase();
                  const colors = ISSUE_COLORS[issueType] || ISSUE_COLORS.other;
                  const isResolving = resolvingId === report.id;
                  const isDispatching = dispatchingId === report.id;
                  const lat = report.lat != null ? Number(report.lat).toFixed(4) : '';
                  const lng = report.lng != null ? Number(report.lng).toFixed(4) : '';

                  return (
                    <motion.li
                      key={report.id}
                      variants={cardVariants}
                      exit={{ opacity: 0, x: 50, transition: { duration: 0.3 } }}
                      whileHover={{ scale: 1.005 }}
                      className="rounded-2xl p-4"
                      style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(148,163,184,0.08)', backdropFilter: 'blur(12px)' }}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className="text-xs px-2.5 py-1 rounded-lg capitalize font-semibold"
                          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                        >
                          {issueType.replace('_', ' ')}
                        </span>
                        <span className="text-xs" style={{ color: '#475569' }}>{relativeTime(report.created_at)}</span>
                      </div>

                      {report.description && (
                        <p className="text-sm mb-2" style={{ color: '#94a3b8' }}>{report.description}</p>
                      )}

                      {lat && lng && (
                        <p className="text-xs mb-3 flex items-center gap-1" style={{ color: '#475569' }}>
                          <FiMapPin size={10} /> {lat}, {lng}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                          onClick={() => handleResolve(report.id)}
                          disabled={isResolving || isDispatching}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
                          style={{ background: 'rgba(34,211,164,0.12)', border: '1px solid rgba(34,211,164,0.25)', color: '#6ee7b7' }}
                        >
                          <FiCheckCircle size={13} />
                          {isResolving ? 'Resolving…' : 'Resolve'}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                          onClick={() => handleDispatch(report)}
                          disabled={isResolving || isDispatching}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
                          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' }}
                        >
                          <FiTruck size={13} />
                          {isDispatching ? 'Dispatching…' : 'Dispatch Truck'}
                        </motion.button>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          )}
        </div>
      </div>
    </div>
  );
}
