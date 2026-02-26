'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import BinPopup from './BinPopup';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const API = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const TRUCK_COLORS = { 1: '#3b82f6', 2: '#f59e0b', 3: '#8b5cf6' };
const TRUCK_SPEED_KM_PER_MS = 0.45 / 3600; // 40 km/h in km/ms

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBinColor(fillLevel) {
  if (fillLevel > 75) return '#ef4444';
  if (fillLevel > 40) return '#f59e0b';
  return '#22c55e';
}

function createBinElement(fillLevel, name) {
  const color = getBinColor(fillLevel);
  const el = document.createElement('div');
  el.innerHTML = '🗑️';
  el.title = `${name}: ${fillLevel}%`;
  el.style.cssText = `
    font-size: 14px;
    background: ${color};
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    transition: background 0.6s ease;
  `;
  return el;
}

export default function BinMap({ bins, routes, reports, overrideBin }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const mapLoaded = useRef(false);

  const binMarkers = useRef({});
  const truckMarkers = useRef({});
  const truckAnimFrames = useRef({});   // requestAnimationFrame IDs
  const truckStates = useRef({});       // per-truck animation state
  const collectedRecently = useRef(new Set());

  const binsRef = useRef(bins);
  useEffect(() => { binsRef.current = bins; }, [bins]);

  const [selectedBin, setSelectedBin] = useState(null);
  const [popupCoords, setPopupCoords] = useState(null);

  // ─── Init map ──────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [73.8567, 18.5204],
      zoom: 11.5,
    });

    map.current.on('load', () => {
      mapLoaded.current = true;

      [1, 2, 3].forEach((id) => {
        map.current.addSource(`route-${id}`, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        map.current.addLayer({
          id: `route-${id}`,
          type: 'line',
          source: `route-${id}`,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': TRUCK_COLORS[id],
            'line-width': 3,
            'line-dasharray': [2, 1],
            'line-opacity': 0.8,
          },
        });
      });

      map.current.addSource('reports', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.current.addLayer({
        id: 'reports-circle',
        type: 'circle',
        source: 'reports',
        paint: {
          'circle-radius': 8,
          'circle-color': '#f97316',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      map.current.on('click', (e) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['reports-circle'],
        });
        if (!features || features.length === 0) setSelectedBin(null);
      });
    });

    return () => {
      Object.values(truckAnimFrames.current).forEach(cancelAnimationFrame);
    };
  }, []);

  // ─── Bin markers ───────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || bins.length === 0) return;

    const tryUpdate = () => {
      if (!mapLoaded.current) { setTimeout(tryUpdate, 150); return; }

      bins.forEach((b) => {
        const fillLevel = Number(b.fill_level ?? b.fillLevel ?? 0);
        const color = getBinColor(fillLevel);

        if (binMarkers.current[b.id]) {
          const el = binMarkers.current[b.id].getElement();
          el.style.background = color;
          el.title = `${b.name}: ${fillLevel}%`;
        } else {
          const el = createBinElement(fillLevel, b.name);
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            const latest = binsRef.current.find((x) => x.id === b.id) || b;
            const fl = Number(latest.fill_level ?? latest.fillLevel ?? 0);
            setSelectedBin({
              ...latest,
              fillLevel: fl,
              citizenReports: Number(latest.citizen_reports ?? 0),
              priorityScore: Number(latest.priority_score ?? 0),
              lat: parseFloat(b.lat),
              lng: parseFloat(b.lng),
            });
            setPopupCoords([parseFloat(b.lng), parseFloat(b.lat)]);
          });

          binMarkers.current[b.id] = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat([parseFloat(b.lng), parseFloat(b.lat)])
            .addTo(map.current);
        }
      });
    };

    tryUpdate();
  }, [bins]);

  // ─── Smooth truck animation (Swiggy-style) ─────────────────────────
  const startTruckAnimation = useCallback((truckId, coords) => {
    // Cancel any existing animation for this truck
    if (truckAnimFrames.current[truckId]) {
      cancelAnimationFrame(truckAnimFrames.current[truckId]);
    }

    // Create truck marker if not exists
    if (!truckMarkers.current[truckId]) {
      const el = document.createElement('div');
      el.innerHTML = '🚛';
      el.style.cssText = `
        font-size: 24px;
        cursor: default;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.8));
        user-select: none;
        transition: transform 0.1s ease;
      `;
      truckMarkers.current[truckId] = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(coords[0])
        .addTo(map.current);
    } else {
      truckMarkers.current[truckId].setLngLat(coords[0]);
    }

    // Animation state for this truck
    truckStates.current[truckId] = {
      coords,
      segmentIndex: 0,
      t: 0,           // 0→1 progress through current segment
      lastTimestamp: null,
    };

    const animate = (timestamp) => {
      const state = truckStates.current[truckId];
      if (!state || !map.current) return;

      if (!state.lastTimestamp) state.lastTimestamp = timestamp;
      const delta = timestamp - state.lastTimestamp; // ms since last frame
      state.lastTimestamp = timestamp;

      const { coords, segmentIndex } = state;

      // If we've looped all segments, restart from beginning
      if (segmentIndex >= coords.length - 1) {
        state.segmentIndex = 0;
        state.t = 0;
        truckAnimFrames.current[truckId] = requestAnimationFrame(animate);
        return;
      }

      const [lng1, lat1] = coords[segmentIndex];
      const [lng2, lat2] = coords[segmentIndex + 1];

      // Distance of this segment in km
      const segmentDist = haversine(lat1, lng1, lat2, lng2);

      // How far did we travel this frame in km?
      const distThisFrame = TRUCK_SPEED_KM_PER_MS * delta;

      // Advance t proportionally
      const increment = segmentDist > 0 ? distThisFrame / segmentDist : 1;
      state.t += increment;

      if (state.t >= 1) {
        // Move to next segment
        state.t = 0;
        state.segmentIndex = segmentIndex + 1;
      }

      // Interpolate position
      const clampedT = Math.min(state.t, 1);
      const lng = lng1 + (lng2 - lng1) * clampedT;
      const lat = lat1 + (lat2 - lat1) * clampedT;

      // Rotate truck emoji to face direction of travel
      const angle = Math.atan2(lng2 - lng1, lat2 - lat1) * (180 / Math.PI);
      const el = truckMarkers.current[truckId]?.getElement();
      if (el) el.style.transform = `rotate(${angle}deg)`;

      truckMarkers.current[truckId]?.setLngLat([lng, lat]);

      // Check bin proximity → collect
      binsRef.current.forEach((bin) => {
        const fl = Number(bin.fill_level ?? 0);
        if (fl <= 5 || collectedRecently.current.has(bin.id)) return;
        const dist = haversine(lat, lng, parseFloat(bin.lat), parseFloat(bin.lng));
        if (dist < 0.15) {
          collectedRecently.current.add(bin.id);
          fetch(`${API}/api/bins/${bin.id}/collected`, { method: 'POST' }).catch(() => {});
          setTimeout(() => collectedRecently.current.delete(bin.id), 60000);
        }
      });

      truckAnimFrames.current[truckId] = requestAnimationFrame(animate);
    };

    truckAnimFrames.current[truckId] = requestAnimationFrame(animate);
  }, []);

  // ─── Update routes + restart truck animations ──────────────────────
  useEffect(() => {
    if (!map.current || Object.keys(routes).length === 0) return;

    const tryUpdate = () => {
      if (!mapLoaded.current) { setTimeout(tryUpdate, 150); return; }

      Object.values(routes).forEach((route) => {
        const truckId = route.truck_id ?? route.truckId;
        if (!truckId) return;

        const rawGeo = route.route_geojson ?? route.geojson;
        if (!rawGeo) return;

        const geojson = typeof rawGeo === 'string' ? JSON.parse(rawGeo) : rawGeo;
        const sourceId = `route-${truckId}`;

        if (map.current.getSource(sourceId)) {
          map.current.getSource(sourceId).setData({
            type: 'FeatureCollection',
            features: [geojson],
          });
        }

        const coords = geojson.geometry?.coordinates;
        if (coords && coords.length >= 2) {
          startTruckAnimation(truckId, coords);
        }
      });
    };

    tryUpdate();
  }, [routes, startTruckAnimation]);

  // ─── Reports layer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current) return;
    const tryUpdate = () => {
      if (!mapLoaded.current) { setTimeout(tryUpdate, 150); return; }
      const features = reports.map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [parseFloat(r.lng), parseFloat(r.lat)] },
        properties: { issueType: r.issue_type, status: r.status },
      }));
      if (map.current.getSource('reports')) {
        map.current.getSource('reports').setData({ type: 'FeatureCollection', features });
      }
    };
    tryUpdate();
  }, [reports]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {selectedBin && popupCoords && (
        <BinPopup
          bin={selectedBin}
          onClose={() => setSelectedBin(null)}
          onOverride={(fillLevel) => {
            overrideBin(selectedBin.id, fillLevel);
            setSelectedBin(null);
          }}
        />
      )}
    </div>
  );
}
