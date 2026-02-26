'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { io } from 'socket.io-client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const API = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const TRUCKS_CONFIG = [
  { id: 1, name: 'Truck-1', zone: 'market', zoneLabel: 'Market Zone', color: '#3b82f6', bgClass: 'bg-blue-600 hover:bg-blue-500' },
  { id: 2, name: 'Truck-2', zone: 'residential', zoneLabel: 'Residential Zone', color: '#f59e0b', bgClass: 'bg-amber-600 hover:bg-amber-500' },
  { id: 3, name: 'Truck-3', zone: 'transit', zoneLabel: 'Transit Zone', color: '#8b5cf6', bgClass: 'bg-purple-600 hover:bg-purple-500' },
];
const TRUCK_COLORS = { 1: '#3b82f6', 2: '#f59e0b', 3: '#8b5cf6' };

function getLoadBarColor(pct) {
  if (pct >= 80) return 'bg-red-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-green-500';
}

function getFillBarColor(pct) {
  if (pct > 75) return 'bg-red-500';
  if (pct > 40) return 'bg-amber-500';
  return 'bg-green-500';
}

function getBinColor(fillLevel) {
  if (fillLevel > 75) return '#ef4444';
  if (fillLevel > 40) return '#f59e0b';
  return '#22c55e';
}

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
        const filtered = all
          .filter((b) => (b.zone || b.zone_name) === zone && Number(b.fill_level) >= 40)
          .sort((a, b) => Number(b.fill_level) - Number(a.fill_level));
        setBins(filtered);
      })
      .catch(() => setBins([]));
  }, [zone]);

  const fetchTruck = useCallback(() => {
    if (!selectedTruck?.id) return;
    fetch(`${API}/api/trucks`)
      .then((r) => r.json())
      .then((list) => {
        const t = list.find((x) => x.id === selectedTruck.id);
        setTruckDetail(t || selectedTruck);
      })
      .catch(() => setTruckDetail(selectedTruck));
  }, [selectedTruck]);

  const fetchStats = useCallback(() => {
    fetch(`${API}/api/stats`)
      .then((r) => r.json())
      .then((data) => data && setStats(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!zone) return;
    fetchBins();
    fetchTruck();
    fetchStats();
  }, [zone, fetchBins, fetchTruck, fetchStats]);

  useEffect(() => {
    if (!selectedTruck) return;
    const s = io(API, { reconnection: true });
    s.on('bin:update', (payload) => {
      if (payload.bins) {
        const filtered = payload.bins
          .filter((b) => (b.zone || b.zone_name) === zone && Number(b.fill_level) >= 40)
          .sort((a, b) => Number(b.fill_level) - Number(a.fill_level));
        setBins(filtered);
        const zoneBins = payload.bins.filter((b) => (b.zone || b.zone_name) === zone);
        setAllZoneBins(zoneBins);
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
      const res = await fetch(`${API}/api/bins/${binId}/collected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ truckId: selectedTruck.id }),
      });
      if (!res.ok) throw new Error('Failed');
      setBins((prev) => prev.filter((b) => b.id !== binId));
      setToast('Bin marked collected');
      fetchTruck();
      fetchStats();
      setTimeout(() => setToast(null), 2500);
    } catch {
      setToast('Error marking collected');
      setTimeout(() => setToast(null), 2500);
    } finally {
      setTimeout(() => setRemovingId(null), 300);
    }
  };

  const loadPct = truckDetail
    ? Math.min(100, Math.round(((Number(truckDetail.current_load) || 0) / (Number(truckDetail.capacity) || 100)) * 100))
    : 0;

  useEffect(() => {
    if (viewMode !== 'map' || !zone || !selectedTruck?.id) return;
    Promise.all([
      fetch(`${API}/api/trucks/routes`).then((r) => r.json()),
      fetch(`${API}/api/bins`).then((r) => r.json()),
    ]).then(([routesList, allBins]) => {
      const myRoute = (routesList || []).find((r) => r.truck_id === selectedTruck.id);
      const geojson = myRoute?.route_geojson || myRoute?.geojson;
      let binSequence = myRoute?.bin_sequence;
      if (typeof binSequence === 'string') {
        try { binSequence = JSON.parse(binSequence); } catch { binSequence = []; }
      }
      if (!Array.isArray(binSequence)) binSequence = [];
      setRouteData(geojson ? { geojson, binSequence } : null);
      const zoneBins = (allBins || []).filter((b) => (b.zone || b.zone_name) === zone);
      setAllZoneBins(zoneBins);
    }).catch(() => {});
  }, [viewMode, zone, selectedTruck?.id]);

  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current || !selectedTruck) return;

    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [73.8567, 18.5204],
        zoom: 11.5,
      });
      mapInitializedRef.current = false;
    }

    const map = mapRef.current;
    const truckId = selectedTruck.id;
    const truckColor = TRUCK_COLORS[truckId] || '#3b82f6';

    const onLoad = () => {
      if (mapInitializedRef.current) return;
      mapInitializedRef.current = true;
      map.addSource('driver-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'driver-route-line',
        type: 'line',
        source: 'driver-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': truckColor, 'line-width': 4, 'line-opacity': 0.9 },
      });
      map.addSource('driver-bins', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'driver-bins-circle',
        type: 'circle',
        source: 'driver-bins',
        paint: {
          'circle-radius': ['case', ['get', 'isFirst'], 14, 8],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.95,
        },
      });
      map.addLayer({
        id: 'driver-bins-pulse',
        type: 'circle',
        source: 'driver-bins',
        filter: ['==', ['get', 'isFirst'], true],
        paint: {
          'circle-radius': 18,
          'circle-color': truckColor,
          'circle-opacity': 0.25,
          'circle-stroke-width': 0,
        },
      });
      map.addLayer({
        id: 'driver-bins-labels',
        type: 'symbol',
        source: 'driver-bins',
        layout: {
          'text-field': ['to-string', ['get', 'order']],
          'text-size': 12,
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });
    };

    if (map.loaded()) onLoad();
    else map.once('load', onLoad);

    const updateMapData = () => {
      if (!map.getSource('driver-route') || !map.getSource('driver-bins')) return;
      const geojson = routeData?.geojson;
      const binSequence = routeData?.binSequence || [];
      const binsById = {};
      (allZoneBins || []).forEach((b) => { binsById[b.id] = b; });

      if (geojson) {
        const routeFeature = typeof geojson === 'string' ? JSON.parse(geojson) : geojson;
        map.getSource('driver-route').setData(
          routeFeature?.geometry
            ? { type: 'FeatureCollection', features: [routeFeature] }
            : { type: 'FeatureCollection', features: [] }
        );
      } else {
        map.getSource('driver-route').setData({ type: 'FeatureCollection', features: [] });
      }

      const binFeatures = binSequence.map((binId, idx) => {
        const bin = binsById[binId];
        if (!bin) return null;
        const fill = Number(bin.fill_level) || 0;
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [parseFloat(bin.lng), parseFloat(bin.lat)] },
          properties: { order: idx + 1, isFirst: idx === 0, color: getBinColor(fill) },
        };
      }).filter(Boolean);

      map.getSource('driver-bins').setData({ type: 'FeatureCollection', features: binFeatures });

      if (binFeatures.length > 0 && !mapFittedBoundsRef.current) {
        const lngs = binFeatures.map((f) => f.geometry.coordinates[0]);
        const lats = binFeatures.map((f) => f.geometry.coordinates[1]);
        map.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 60, maxZoom: 14 }
        );
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

  if (!selectedTruck) {
    return (
      <div className="min-h-screen bg-gray-950 p-4 flex flex-col items-center justify-center">
        <h1 className="text-white text-2xl font-bold mb-2">🚛 Driver</h1>
        <p className="text-gray-400 text-sm mb-8">Select your truck</p>
        <div className="w-full max-w-sm space-y-4">
          {TRUCKS_CONFIG.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTruck({ id: t.id, name: t.name, assigned_zone: t.zone })}
              className={`w-full ${t.bgClass} text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors active:scale-[0.98]`}
            >
              <span className="block">{t.name}</span>
              <span className="block text-sm font-normal opacity-90">{t.zoneLabel}</span>
            </button>
          ))}
        </div>
        <Link href="/" className="mt-8 text-gray-400 hover:text-white text-sm">
          ← Live Map
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen min-h-screen bg-gray-950 flex flex-col pb-safe overflow-hidden">
      <header className="bg-gray-900 border-b border-gray-700 p-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-bold text-lg">{truckConfig?.name || selectedTruck.name}</span>
          <span className="text-gray-400 text-sm capitalize">{truckConfig?.zoneLabel || (zone && `${zone} Zone`)}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${getLoadBarColor(loadPct)}`}
            style={{ width: `${loadPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>Load</span>
          <span>{Number(truckDetail?.current_load) || 0}/{Number(truckDetail?.capacity) || 100} units ({loadPct}%)</span>
        </div>
      </header>

      {criticalAlert && (
        <div className="mx-4 mt-3 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center justify-between">
          <span className="text-red-300 text-sm">⚠️ New critical bin: {criticalAlert.name}</span>
          <button onClick={() => setCriticalAlert(null)} className="text-red-400 text-lg leading-none">×</button>
        </div>
      )}

      <div className="flex border-b border-gray-700 shrink-0">
        <button
          onClick={() => setViewMode('list')}
          className={`flex-1 py-3 text-sm font-medium ${viewMode === 'list' ? 'text-white border-b-2 border-white bg-gray-900' : 'text-gray-400 hover:text-gray-300'}`}
        >
          📋 List
        </button>
        <button
          onClick={() => setViewMode('map')}
          className={`flex-1 py-3 text-sm font-medium ${viewMode === 'map' ? 'text-white border-b-2 border-white bg-gray-900' : 'text-gray-400 hover:text-gray-300'}`}
        >
          🗺️ Map
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {viewMode === 'list' && (
      <main className="flex-1 overflow-y-auto p-4">
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Bins to collect (fill ≥ 40%)</h2>
        <div className="space-y-3">
          {bins.map((bin) => {
            const fill = Number(bin.fill_level) || 0;
            const isRemoving = removingId === bin.id;
            return (
              <div
                key={bin.id}
                className={`bg-gray-900 border border-gray-700 rounded-xl p-4 transition-all duration-300 ${isRemoving ? 'opacity-0 scale-95' : 'opacity-100'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-white font-semibold">{bin.name}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      bin.status === 'critical' ? 'bg-red-900 text-red-300' :
                      bin.status === 'high' ? 'bg-amber-900 text-amber-300' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {bin.status || 'normal'}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full transition-all ${getFillBarColor(fill)}`}
                    style={{ width: `${Math.min(100, fill)}%` }}
                  />
                </div>
                <button
                  onClick={() => handleCollect(bin.id)}
                  disabled={!!removingId}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  ✅ Mark Collected
                </button>
              </div>
            );
          })}
        </div>
        {bins.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No bins with fill ≥ 40% in your zone.</p>
        )}
      </main>
        )}
        {viewMode === 'map' && (
          <div className="flex-1 min-h-0 w-full" style={{ minHeight: 0 }} ref={mapContainerRef} />
        )}
      </div>

      <footer className="border-t border-gray-700 p-4 bg-gray-900 shrink-0 flex flex-col gap-2">
        <Link href="/" className="text-center text-gray-400 hover:text-white font-medium">
          ← Live Map
        </Link>
        <p className="text-center text-gray-500 text-sm">Collected today: {stats.binsCollected ?? 0}</p>
      </footer>

      {toast && (
        <div className="fixed bottom-24 left-4 right-4 mx-auto max-w-xs bg-gray-800 border border-gray-600 text-white text-sm py-3 px-4 rounded-lg shadow-lg text-center animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
