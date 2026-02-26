'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import useSocket from '@/hooks/useSocket';
import FleetPanel from '@/components/FleetPanel';
import StatsBar from '@/components/StatsBar';
import Link from 'next/link';

const BinMap = dynamic(() => import('@/components/BinMap'), { ssr: false });

export default function Dashboard() {
  const { bins, routes, alerts, reports, stats, overrideBin } = useSocket();
  const [trucks, setTrucks] = useState([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/trucks`)
      .then((r) => r.json())
      .then(setTrucks)
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="flex flex-1 overflow-hidden">
        <FleetPanel trucks={trucks} alerts={alerts} />
        <div className="flex-1 relative">
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            <Link
              href="/report"
              className="bg-orange-600 hover:bg-orange-500 text-white text-sm px-3 py-1.5 rounded-lg font-medium"
            >
              📢 Report Issue
            </Link>
            <Link
              href="/admin"
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium"
            >
              🏛️ Admin
            </Link>
          </div>
          <BinMap
            bins={bins}
            routes={routes}
            reports={reports}
            overrideBin={overrideBin}
          />
        </div>
      </div>
      <StatsBar stats={stats} />
    </div>
  );
}

