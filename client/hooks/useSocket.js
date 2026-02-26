'use client';
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export default function useSocket() {
  const [bins, setBins] = useState([]);
  const [routes, setRoutes] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    binsCollected: 0,
    fuelSaved: 0,
    co2Saved: 0,
    overflowPrevented: 0,
  });
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      reconnection: true,
    });
    const s = socketRef.current;

    s.on('bin:update', ({ bins }) => setBins(bins));
    s.on('route:update', ({ routes }) => setRoutes(routes));
    s.on('alert:new', (alert) =>
      setAlerts((prev) => [alert, ...prev].slice(0, 20)),
    );
    s.on('report:created', ({ report }) =>
      setReports((prev) => [report, ...prev]),
    );
    s.on('stats:update', (data) => setStats(data));

    // Load initial data
    fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/bins`)
      .then((r) => r.json())
      .then(setBins);
    fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/trucks/routes`)
      .then((r) => r.json())
      .then((data) => {
        const routeMap = {};
        data.forEach((r) => {
          routeMap[r.truck_id] = r;
        });
        setRoutes(routeMap);
      });
    fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/reports`)
      .then((r) => r.json())
      .then(setReports);
    fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/stats`)
      .then((r) => r.json())
      .then((data) => {
        if (data) setStats(data);
      });

    return () => s.disconnect();
  }, []);

  const overrideBin = async (binId, fillLevel) => {
    await fetch(
      `${process.env.NEXT_PUBLIC_SOCKET_URL}/api/bins/${binId}/override`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fillLevel }),
      },
    );
  };

  return { bins, routes, alerts, reports, stats, overrideBin };
}

