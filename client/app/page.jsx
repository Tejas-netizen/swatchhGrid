'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import useSocket from '@/hooks/useSocket';
import FleetPanel from '@/components/FleetPanel';
import StatsBar from '@/components/StatsBar';
import Link from 'next/link';

const BinMap = dynamic(() => import('@/components/BinMap'), { ssr: false });

export default function Dashboard() {
  const { bins, trucks, routes, alerts, reports, stats, overrideBin } = useSocket();

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="flex flex-1 overflow-hidden">
        <FleetPanel trucks={trucks} alerts={alerts} />
        <div className="flex-1 relative">
          <div className="absolute top-3 right-3 z-10 flex flex-wrap gap-2 justify-end">
            <Link
              href="/report"
              className="bg-orange-600 hover:bg-orange-500 text-white text-sm px-3 py-1.5 rounded-lg font-medium"
            >
              📢 Report Issue
            </Link>
            <Link
              href="/user"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-1.5 rounded-lg font-medium"
            >
              👤 User
            </Link>
            <Link
              href="/driver"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg font-medium"
            >
              🚛 Driver
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

