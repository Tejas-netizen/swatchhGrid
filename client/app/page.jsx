'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Link from 'next/link';
import useSocket from '@/hooks/useSocket';
import FleetPanel from '@/components/FleetPanel';
import StatsBar from '@/components/StatsBar';
import Navbar from '@/components/Navbar';
import { FiAlertTriangle, FiUser, FiTruck, FiSettings } from 'react-icons/fi';

const BinMap = dynamic(() => import('@/components/BinMap'), { ssr: false });

const NAV_BUTTONS = [
  { href: '/report', label: 'Report Issue', icon: FiAlertTriangle, color: '#f59e0b', glow: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  { href: '/user', label: 'User View', icon: FiUser, color: '#22d3a4', glow: 'rgba(34,211,164,0.3)', bg: 'rgba(34,211,164,0.1)', border: 'rgba(34,211,164,0.2)' },
  { href: '/driver', label: 'Driver', icon: FiTruck, color: '#3b82f6', glow: 'rgba(59,130,246,0.3)', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
  { href: '/admin', label: 'Admin', icon: FiSettings, color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)' },
];

export default function Dashboard() {
  const { bins, trucks, routes, alerts, reports, stats, overrideBin } = useSocket();

  return (
    <div className="flex flex-col h-screen" style={{ background: '#030712' }}>
      {/* Top Navbar */}
      <Navbar />

      {/* Main Layout (below navbar) */}
      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: '56px' }}>
        {/* Sidebar */}
        <FleetPanel trucks={trucks} alerts={alerts} />

        {/* Map Area */}
        <div className="flex-1 relative overflow-hidden">

          {/* Floating Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.45 }}
            className="absolute top-3 right-3 z-10 flex flex-wrap gap-2 justify-end"
          >
            {NAV_BUTTONS.map((btn, i) => {
              const Icon = btn.icon;
              return (
                <motion.div
                  key={btn.href}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45 + i * 0.07, type: 'spring', stiffness: 200 }}
                  whileHover={{ scale: 1.06, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href={btn.href}>
                    <div
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                      style={{
                        background: btn.bg,
                        border: `1px solid ${btn.border}`,
                        color: btn.color,
                        backdropFilter: 'blur(12px)',
                        boxShadow: `0 0 12px ${btn.glow}`,
                      }}
                    >
                      <Icon size={13} />
                      <span className="hidden sm:block">{btn.label}</span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="w-full h-full"
          >
            <BinMap
              bins={bins}
              routes={routes}
              reports={reports}
              overrideBin={overrideBin}
            />
          </motion.div>
        </div>
      </div>

      {/* Stats Bar */}
      <StatsBar stats={stats} />
    </div>
  );
}
