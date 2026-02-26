const { query } = require('./db');

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Nearest-neighbor greedy within a set of bins from a given start position
function nearestNeighborRoute(startLat, startLng, bins) {
  const remaining = [...bins];
  const ordered = [];
  let curLat = startLat;
  let curLng = startLng;
  let totalDist = 0;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(curLat, curLng, parseFloat(remaining[i].lat), parseFloat(remaining[i].lng));
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const nearest = remaining.splice(nearestIdx, 1)[0];
    ordered.push(nearest);
    totalDist += nearestDist;
    curLat = parseFloat(nearest.lat);
    curLng = parseFloat(nearest.lng);
  }

  return { ordered, totalDist };
}

// Baseline: same bins visited in ID order (no optimization) — single pass
function baselineDistance(startLat, startLng, bins) {
  let dist = 0;
  let curLat = startLat;
  let curLng = startLng;
  const sorted = [...bins].sort((a, b) => a.id - b.id);
  for (const bin of sorted) {
    dist += haversine(curLat, curLng, parseFloat(bin.lat), parseFloat(bin.lng));
    curLat = parseFloat(bin.lat);
    curLng = parseFloat(bin.lng);
  }
  return dist;
}

async function optimizeRoutes(db = { query }) {
  const trucksRes = await db.query('SELECT * FROM trucks ORDER BY id');
  const trucks = trucksRes.rows;
  if (trucks.length === 0) return null;

  const routes = {};
  let optimizedTotal = 0;
  let baselineTotal = 0;

  for (const truck of trucks) {
    // ZONE-LOCKED: each truck only handles bins from its own zone
    const binsRes = await db.query(
      `SELECT * FROM bins 
       WHERE zone = $1 
         AND (fill_level >= 60 OR status = 'critical')
         AND status != 'collected'
       ORDER BY priority_score DESC`,
      [truck.assigned_zone]
    );
    const bins = binsRes.rows;

    const startLat = parseFloat(truck.current_lat);
    const startLng = parseFloat(truck.current_lng);

    if (bins.length === 0) {
      // No bins to collect — truck stays at depot, empty route
      routes[truck.id] = {
        truck_id: truck.id,
        truckId: truck.id,
        truckName: truck.name,
        color: truck.color,
        binIds: [],
        geojson: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[startLng, startLat]] }
        },
        distance: 0
      };

      await db.query('DELETE FROM routes WHERE truck_id = $1', [truck.id]);
      await db.query(
        'INSERT INTO routes (truck_id, bin_sequence, route_geojson, total_distance) VALUES ($1, $2, $3, $4)',
        [truck.id, JSON.stringify([]), JSON.stringify(routes[truck.id].geojson), 0]
      );
      continue;
    }

    // Optimized route: nearest-neighbor within zone
    const { ordered, totalDist } = nearestNeighborRoute(startLat, startLng, bins);

    // Baseline: same bins visited in ID order (unoptimized)
    const baseline = baselineDistance(startLat, startLng, bins);

    optimizedTotal += totalDist;
    baselineTotal += baseline;

    const coords = [
      [startLng, startLat],
      ...ordered.map(b => [parseFloat(b.lng), parseFloat(b.lat)])
    ];

    routes[truck.id] = {
      truck_id: truck.id,
      truckId: truck.id,
      truckName: truck.name,
      color: truck.color,
      binIds: ordered.map(b => b.id),
      geojson: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords }
      },
      distance: totalDist
    };

    await db.query('DELETE FROM routes WHERE truck_id = $1', [truck.id]);
    await db.query(
      'INSERT INTO routes (truck_id, bin_sequence, route_geojson, total_distance) VALUES ($1, $2, $3, $4)',
      [truck.id, JSON.stringify(routes[truck.id].binIds), JSON.stringify(routes[truck.id].geojson), totalDist]
    );
  }

  // Stats — only update if we have valid baseline to avoid divide-by-zero
  const co2Saved = Math.max(0, (baselineTotal - optimizedTotal) * 0.21);
  const fuelSaved = baselineTotal > 0
    ? Math.max(0, ((baselineTotal - optimizedTotal) / baselineTotal) * 100)
    : 0;

  await db.query(
    `UPDATE stats 
     SET optimized_distance = $1, baseline_distance = $2, co2_saved = $3 
     WHERE id = (SELECT id FROM stats ORDER BY recorded_at DESC LIMIT 1)`,
    [
      Number(optimizedTotal.toFixed(2)),
      Number(baselineTotal.toFixed(2)),
      Number(co2Saved.toFixed(2))
    ]
  );

  console.log(`✅ Routes optimized | Baseline: ${baselineTotal.toFixed(1)}km | Optimized: ${optimizedTotal.toFixed(1)}km | Fuel saved: ${fuelSaved.toFixed(1)}%`);

  return { routes, optimizedTotal, baselineTotal, co2Saved, fuelSaved };
}

module.exports = { optimizeRoutes, haversine };