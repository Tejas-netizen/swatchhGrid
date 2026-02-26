'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { io } from 'socket.io-client';

const API = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

const ISSUE_BADGE = {
  overflow: 'bg-red-900 text-red-300',
  missed_pickup: 'bg-amber-900 text-amber-300',
  illegal_dumping: 'bg-orange-900 text-orange-300',
  other: 'bg-gray-700 text-gray-300',
};

function relativeTime(dateStr) {
  const d = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day}d ago`;
  if (hr > 0) return `${hr} hr ago`;
  if (min > 0) return `${min} min ago`;
  return 'Just now';
}

function dist(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function AdminPage() {
  const [reports, setReports] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);
  const [dispatchingId, setDispatchingId] = useState(null);

  const openReports = reports.filter((r) => (r.status || 'open') === 'open');

  const fetchReports = useCallback(() => {
    fetch(`${API}/api/reports`)
      .then((r) => r.json())
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]));
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    const s = io(API, { reconnection: true });
    s.on('report:created', ({ report }) => {
      if (report) setReports((prev) => [report, ...prev]);
    });
    return () => s.disconnect();
  }, []);

  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      const res = await fetch(`${API}/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      });
      if (res.ok) setReports((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setResolvingId(null);
    }
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
      let nearest = null;
      let nearestDist = Infinity;
      for (const b of bins) {
        const d = dist(lat, lng, parseFloat(b.lat), parseFloat(b.lng));
        if (d < nearestDist) {
          nearestDist = d;
          nearest = b;
        }
      }
      if (nearest) {
        await fetch(`${API}/api/bins/${nearest.id}/override`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fillLevel: 95 }),
        });
      }
    } finally {
      setDispatchingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="border-b border-gray-700 px-4 py-4 flex items-center gap-4 shrink-0">
        <Link href="/" className="text-gray-400 hover:text-white text-sm font-medium">
          ← Back to Map
        </Link>
        <h1 className="text-white text-xl font-bold">🏛️ Admin</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        <section className="mb-6">
          <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2">
            📢 Citizen Reports
            {openReports.length > 0 && (
              <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                {openReports.length}
              </span>
            )}
          </h2>

          {openReports.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">✅ No open complaints</p>
          ) : (
            <ul className="space-y-3">
              {openReports.map((report) => {
                const issueType = (report.issue_type || 'other').toLowerCase();
                const badgeClass = ISSUE_BADGE[issueType] || ISSUE_BADGE.other;
                const isResolving = resolvingId === report.id;
                const isDispatching = dispatchingId === report.id;
                const lat = report.lat != null ? Number(report.lat).toFixed(4) : '';
                const lng = report.lng != null ? Number(report.lng).toFixed(4) : '';

                return (
                  <li
                    key={report.id}
                    className="bg-gray-900 border border-gray-700 rounded-xl p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${badgeClass}`}>
                        {issueType.replace('_', ' ')}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {relativeTime(report.created_at)}
                      </span>
                    </div>
                    {report.description && (
                      <p className="text-gray-300 text-sm mb-2">{report.description}</p>
                    )}
                    {lat && lng && (
                      <p className="text-gray-500 text-xs mb-3">📍 {lat}, {lng}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolve(report.id)}
                        disabled={isResolving || isDispatching}
                        className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium py-2 px-3 rounded-lg"
                      >
                        {isResolving ? '…' : '✅ Resolve'}
                      </button>
                      <button
                        onClick={() => handleDispatch(report)}
                        disabled={isResolving || isDispatching}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium py-2 px-3 rounded-lg"
                      >
                        {isDispatching ? '…' : '🚛 Dispatch Truck'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-gray-500 text-xs">Operator queue and dispatch controls (Phase 4).</p>
      </main>
    </div>
  );
}
