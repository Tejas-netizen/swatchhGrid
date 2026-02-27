'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Navbar from '@/components/Navbar';
import { FiList, FiMap, FiCheckCircle, FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const API = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const TRUCKS_CONFIG = [
  { id: 1, name: 'Truck-1', zone: 'market', zoneLabel: 'Market Zone', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
  { id: 2, name: 'Truck-2', zone: 'residential', zoneLabel: 'Residential Zone', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
  { id: 3, name: 'Truck-3', zone: 'transit', zoneLabel: 'Transit Zone', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
];
const TRUCK_COLORS = { 1: '#3b82f6', 2: '#f59e0b', 3: '#8b5cf6' };

function getLoadBarColor(pct) {
  if (pct >= 80) return '#ef4444';
  if (pct >= 50) return '#f59e0b';
  return '#22d3a4';
}
function getFillBarColor(pct) {
  if (pct > 75) return '#ef4444';
  if (pct > 40) return '#f59e0b';
  return '#22d3a4';
}
function getBinColor(fillLevel) {
  if (fillLevel > 75) return '#ef4444';
  if (fillLevel > 40) return '#f59e0b';
  return '#22c55e';
}

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } };

export default function DriverPage() {
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [bins, setBins] = useState([]);
  const [truckDetail, setTruckDetail] = useState(null);
  const [stats, setStats] = useState({ binsCollected: 0 });
  const [toast, setToast] = useState(null);
  const [criticalAlert, setCriticalAlert] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [allZoneBins, setAllZoneBins] = useState([]);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapInitializedRef = useRef(false);
  const mapFittedBoundsRef = useRef(false);

  const truckConfig = selectedTruck ? TRUCKS_CONFIG.find((t) => t.id === selectedTruck.id) || TRUCKS_CONFIG[0] : null;
  const zone = truckConfig?.zone || selectedTruck?.assigned_zone;

  const fetchBins = useCallback(() => {
    fetch(`${API}/api/bins`)
      .then((r) => r.json())
      .then((all) => {
        const filtered = all.filter((b) => (b.zone || b.zone_name) === zone && Number(b.fill_level) >= 40).sort((a, b) => Number(b.fill_level) - Number(a.fill_level));
        setBins(filtered);
      })
      .catch(() => setBins([]));
  }, [zone]);

  const fetchTruck = useCallback(() => {
    if (!selectedTruck?.id) return;
    fetch(`${API}/api/trucks`).then((r) => r.json()).then((list) => {
      const t = list.find((x) => x.id === selectedTruck.id);
      setTruckDetail(t || selectedTruck);
    }).catch(() => setTruckDetail(selectedTruck));
  }, [selectedTruck]);

  const fetchStats = useCallback(() => {
    fetch(`${API}/api/stats`).then((r) => r.json()).then((data) => data && setStats(data)).catch(() => { });
  }, []);

  useEffect(() => {
    if (!zone) return;
    fetchBins(); fetchTruck(); fetchStats();
  }, [zone, fetchBins, fetchTruck, fetchStats]);

  useEffect(() => {
    if (!selectedTruck) return;
    const s = io(API, { reconnection: true });
    s.on('bin:update', (payload) => {
      if (payload.bins) {
        const filtered = payload.bins.filter((b) => (b.zone || b.zone_name) === zone && Number(b.fill_level) >= 40).sort((a, b) => Number(b.fill_level) - Number(a.fill_level));
        setBins(filtered);
        setAllZoneBins(payload.bins.filter((b) => (b.zone || b.zone_name) === zone));
        const critical = payload.bins.find((b) => b.status === 'critical' && (b.zone || b.zone_name) === zone);
        if (critical) setCriticalAlert({ id: critical.id, name: critical.name });
      }
      if (payload.trucks) {
        const t = payload.trucks.find((x) => x.id === selectedTruck.id);
        if (t) setTruckDetail(t);
      }
    });
    s.on('stats:update', (data) => data && setStats(data));
    return () => s.disconnect();
  }, [selectedTruck, zone]);

  const handleCollect = async (binId) => {
    setRemovingId(binId);
    try {
      const res = await fetch(`${API}/api/bins/${binId}/collected`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ truckId: selectedTruck.id }) });
      if (!res.ok) throw new Error('Failed');
      setBins((prev) => prev.filter((b) => b.id !== binId));
      setToast('Bin marked as collected ✓');
      fetchTruck(); fetchStats();
      setTimeout(() => setToast(null), 2500);
    } catch {
      setToast('Error marking as collected');
      setTimeout(() => setToast(null), 2500);
    } finally {
      setTimeout(() => setRemovingId(null), 300);
    }
  };

  const loadPct = truckDetail ? Math.min(100, Math.round(((Number(truckDetail.current_load) || 0) / (Number(truckDetail.capacity) || 100)) * 100)) : 0;

  useEffect(() => {
    if (viewMode !== 'map' || !zone || !selectedTruck?.id) return;
    Promise.all([
      fetch(`${API}/api/trucks/routes`).then((r) => r.json()),
      fetch(`${API}/api/bins`).then((r) => r.json()),
    ]).then(([routesList, allBins]) => {
      const myRoute = (routesList || []).find((r) => r.truck_id === selectedTruck.id);
      const geojson = myRoute?.route_geojson || myRoute?.geojson;
      let binSequence = myRoute?.bin_sequence;
      if (typeof binSequence === 'string') { try { binSequence = JSON.parse(binSequence); } catch { binSequence = []; } }
      if (!Array.isArray(binSequence)) binSequence = [];
      setRouteData(geojson ? { geojson, binSequence } : null);
      setAllZoneBins((allBins || []).filter((b) => (b.zone || b.zone_name) === zone));
    }).catch(() => { });
  }, [viewMode, zone, selectedTruck?.id]);

  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current || !selectedTruck) return;
    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({ container: mapContainerRef.current, style: 'mapbox://styles/mapbox/dark-v11', center: [73.8567, 18.5204], zoom: 11.5 });
      mapInitializedRef.current = false;
    }
    const map = mapRef.current;
    const truckColor = TRUCK_COLORS[selectedTruck.id] || '#3b82f6';
    const onLoad = () => {
      if (mapInitializedRef.current) return;
      mapInitializedRef.current = true;
      map.addSource('driver-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'driver-route-line', type: 'line', source: 'driver-route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': truckColor, 'line-width': 4, 'line-opacity': 0.9 } });
      map.addSource('driver-bins', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'driver-bins-circle', type: 'circle', source: 'driver-bins', paint: { 'circle-radius': ['case', ['get', 'isFirst'], 14, 8], 'circle-color': ['get', 'color'], 'circle-stroke-width': 2, 'circle-stroke-color': '#fff', 'circle-opacity': 0.95 } });
      map.addLayer({ id: 'driver-bins-pulse', type: 'circle', source: 'driver-bins', filter: ['==', ['get', 'isFirst'], true], paint: { 'circle-radius': 18, 'circle-color': truckColor, 'circle-opacity': 0.25, 'circle-stroke-width': 0 } });
      map.addLayer({ id: 'driver-bins-labels', type: 'symbol', source: 'driver-bins', layout: { 'text-field': ['to-string', ['get', 'order']], 'text-size': 12, 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], 'text-allow-overlap': true }, paint: { 'text-color': '#ffffff' } });
    };
    if (map.loaded()) onLoad(); else map.once('load', onLoad);
    const updateMapData = () => {
      if (!map.getSource('driver-route') || !map.getSource('driver-bins')) return;
      const geojson = routeData?.geojson;
      const binSequence = routeData?.binSequence || [];
      const binsById = {};
      (allZoneBins || []).forEach((b) => { binsById[b.id] = b; });
      if (geojson) {
        const routeFeature = typeof geojson === 'string' ? JSON.parse(geojson) : geojson;
        map.getSource('driver-route').setData(routeFeature?.geometry ? { type: 'FeatureCollection', features: [routeFeature] } : { type: 'FeatureCollection', features: [] });
      } else {
        map.getSource('driver-route').setData({ type: 'FeatureCollection', features: [] });
      }
      const binFeatures = binSequence.map((binId, idx) => {
        const bin = binsById[binId];
        if (!bin) return null;
        return { type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(bin.lng), parseFloat(bin.lat)] }, properties: { order: idx + 1, isFirst: idx === 0, color: getBinColor(Number(bin.fill_level) || 0) } };
      }).filter(Boolean);
      map.getSource('driver-bins').setData({ type: 'FeatureCollection', features: binFeatures });
      if (binFeatures.length > 0 && !mapFittedBoundsRef.current) {
        const lngs = binFeatures.map((f) => f.geometry.coordinates[0]);
        const lats = binFeatures.map((f) => f.geometry.coordinates[1]);
        map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, maxZoom: 14 });
        mapFittedBoundsRef.current = true;
      }
    };
    const t = setTimeout(updateMapData, 100);
    return () => clearTimeout(t);
  }, [viewMode, selectedTruck, routeData, allZoneBins]);

  useEffect(() => {
    if (viewMode !== 'map' && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      mapInitializedRef.current = false;
      mapFittedBoundsRef.current = false;
    }
  }, [viewMode]);

  // TRUCK SELECTION SCREEN
  if (!selectedTruck) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#030712' }}>
        <Navbar />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
          <h1 className="text-3xl font-bold mb-2 text-center">
            <span style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Driver View
            </span>
          </h1>
          <p className="text-sm text-center mb-8" style={{ color: '#475569' }}>Select your assigned truck</p>

          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
            {TRUCKS_CONFIG.map((t) => (
              <motion.button
                key={t.id}
                variants={itemVariants}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedTruck({ id: t.id, name: t.name, assigned_zone: t.zone })}
                className="w-full p-5 rounded-2xl text-left transition-all"
                style={{
                  background: `linear-gradient(135deg, rgba(${t.color === '#3b82f6' ? '59,130,246' : t.color === '#f59e0b' ? '245,158,11' : '139,92,246'}, 0.12), rgba(${t.color === '#3b82f6' ? '59,130,246' : t.color === '#f59e0b' ? '245,158,11' : '139,92,246'}, 0.05))`,
                  border: `1px solid rgba(${t.color === '#3b82f6' ? '59,130,246' : t.color === '#f59e0b' ? '245,158,11' : '139,92,246'}, 0.3)`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: t.gradient }}>
                    🚛
                  </div>
                  <div>
                    <div className="font-bold text-base" style={{ color: t.color }}>{t.name}</div>
                    <div className="text-xs" style={{ color: '#64748b' }}>{t.zoneLabel}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-sm hover:opacity-80 transition-opacity flex items-center justify-center gap-1" style={{ color: '#475569' }}>
              <FiArrowLeft size={13} /> Live Map
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // MAIN DRIVER DASHBOARD
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#030712' }}>
      <Navbar />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ paddingTop: '56px' }}>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pt-3 pb-2 shrink-0"
          style={{
            background: 'rgba(15,23,42,0.9)',
            borderBottom: '1px solid rgba(148,163,184,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: truckConfig?.gradient }}>
                <span className="text-sm">🚛</span>
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: truckConfig?.color }}>{truckConfig?.name}</div>
                <div className="text-xs" style={{ color: '#475569' }}>{truckConfig?.zoneLabel}</div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setSelectedTruck(null); setViewMode('list'); }}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(148,163,184,0.08)', color: '#64748b', border: '1px solid rgba(148,163,184,0.12)' }}
            >
              Switch Truck
            </motion.button>
          </div>

          {/* Load Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1" style={{ color: '#475569' }}>
              <span>Truck Load</span>
              <span style={{ color: getLoadBarColor(loadPct), fontWeight: 600 }}>{Number(truckDetail?.current_load) || 0}/{Number(truckDetail?.capacity) || 100} units ({loadPct}%)</span>
            </div>
            <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'rgba(148,163,184,0.1)' }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${loadPct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                className="h-2 rounded-full"
                style={{ background: getLoadBarColor(loadPct) }}
              />
            </div>
          </div>
        </motion.header>

        {/* Critical Alert */}
        <AnimatePresence>
          {criticalAlert && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mx-3 mt-2 p-3 rounded-xl flex items-center justify-between shrink-0"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <span className="text-sm flex items-center gap-2" style={{ color: '#fca5a5' }}>
                <FiAlertTriangle size={13} /> New critical bin: {criticalAlert.name}
              </span>
              <button onClick={() => setCriticalAlert(null)} style={{ color: '#f87171', fontSize: '18px', lineHeight: 1 }}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Mode Tabs */}
        <div className="flex mx-3 mt-2 rounded-xl overflow-hidden shrink-0" style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.08)' }}>
          {[
            { id: 'list', label: 'Bin List', icon: FiList },
            { id: 'map', label: 'Route Map', icon: FiMap },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setViewMode(tab.id)}
                className="flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
                style={{
                  background: isActive ? (truckConfig?.color ? `rgba(${truckConfig.color === '#3b82f6' ? '59,130,246' : truckConfig.color === '#f59e0b' ? '245,158,11' : '139,92,246'}, 0.15)` : 'rgba(59,130,246,0.15)') : 'transparent',
                  color: isActive ? truckConfig?.color : '#64748b',
                  borderBottom: isActive ? `2px solid ${truckConfig?.color}` : '2px solid transparent',
                }}
              >
                <Icon size={13} />
                {tab.label}
              </motion.button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {viewMode === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full overflow-y-auto p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#475569' }}>Bins to collect (fill ≥ 40%)</p>
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-2">
                  <AnimatePresence>
                    {bins.map((bin) => {
                      const fill = Number(bin.fill_level) || 0;
                      const isRemoving = removingId === bin.id;
                      const barColor = getFillBarColor(fill);
                      return (
                        <motion.div
                          key={bin.id}
                          variants={itemVariants}
                          exit={{ opacity: 0, x: 60, transition: { duration: 0.3 } }}
                          className="rounded-xl p-3"
                          style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(148,163,184,0.08)', opacity: isRemoving ? 0.4 : 1 }}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-sm" style={{ color: '#f1f5f9' }}>{bin.name}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-lg font-medium"
                              style={{
                                background: bin.status === 'critical' ? 'rgba(239,68,68,0.12)' : bin.status === 'high' ? 'rgba(245,158,11,0.12)' : 'rgba(34,211,164,0.1)',
                                color: bin.status === 'critical' ? '#fca5a5' : bin.status === 'high' ? '#fcd34d' : '#6ee7b7',
                                border: `1px solid ${bin.status === 'critical' ? 'rgba(239,68,68,0.2)' : bin.status === 'high' ? 'rgba(245,158,11,0.2)' : 'rgba(34,211,164,0.2)'}`,
                              }}
                            >
                              {bin.status || 'normal'}
                            </span>
                          </div>
                          <div className="w-full rounded-full h-1.5 mb-2.5 overflow-hidden" style={{ background: 'rgba(148,163,184,0.1)' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, fill)}%` }} transition={{ duration: 0.8 }} className="h-1.5 rounded-full" style={{ background: barColor }} />
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                            onClick={() => handleCollect(bin.id)}
                            disabled={!!removingId}
                            className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
                            style={{ background: 'rgba(34,211,164,0.12)', border: '1px solid rgba(34,211,164,0.25)', color: '#6ee7b7' }}
                          >
                            <FiCheckCircle size={13} />
                            Mark Collected
                          </motion.button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
                {bins.length === 0 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-center py-8" style={{ color: '#475569' }}>
                    ✅ No bins with fill ≥ 40% in your zone
                  </motion.p>
                )}
                <div className="py-4 border-t mt-4" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
                  <p className="text-center text-xs" style={{ color: '#475569' }}>Collected today: <span style={{ color: '#22d3a4', fontWeight: 700 }}>{stats.binsCollected ?? 0}</span></p>
                </div>
              </motion.div>
            )}

            {viewMode === 'map' && (
              <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full" ref={mapContainerRef} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-4 right-4 mx-auto max-w-xs py-3 px-4 rounded-xl text-sm text-center font-semibold"
            style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(34,211,164,0.3)', color: '#6ee7b7', backdropFilter: 'blur(16px)' }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
