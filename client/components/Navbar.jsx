'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiMap, FiAlertTriangle, FiUser, FiTruck, FiSettings, FiHome } from 'react-icons/fi';
import { RiLeafLine } from 'react-icons/ri';

const NAV_ITEMS = [
    { href: '/landing', label: 'Home', icon: FiHome },
    { href: '/', label: 'Dashboard', icon: FiMap },
    { href: '/report', label: 'Report', icon: FiAlertTriangle },
    { href: '/user', label: 'User', icon: FiUser },
    { href: '/driver', label: 'Driver', icon: FiTruck },
    { href: '/admin', label: 'Admin', icon: FiSettings },
];

export default function Navbar() {
    const pathname = usePathname();

    return (
        <motion.nav
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 z-50 h-14"
            style={{
                background: 'rgba(3, 7, 18, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            }}
        >
            <div className="h-full flex items-center justify-between px-4 max-w-screen-2xl mx-auto">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <motion.div
                        whileHover={{ rotate: 180, scale: 1.1 }}
                        transition={{ duration: 0.4 }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #22d3a4, #3b82f6)' }}
                    >
                        <RiLeafLine className="text-white text-base" />
                    </motion.div>
                    <span
                        className="font-bold text-lg hidden sm:block"
                        style={{
                            background: 'linear-gradient(135deg, #22d3a4, #3b82f6)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        SwachhGrid
                    </span>
                </Link>

                {/* Nav Links */}
                <div className="flex items-center gap-1">
                    {NAV_ITEMS.map((item, i) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <motion.div
                                key={item.href}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07, duration: 0.35 }}
                            >
                                <Link href={item.href}>
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.96 }}
                                        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                        style={{
                                            color: isActive ? '#22d3a4' : '#94a3b8',
                                            background: isActive ? 'rgba(34, 211, 164, 0.1)' : 'transparent',
                                        }}
                                    >
                                        <Icon size={14} />
                                        <span className="hidden md:block">{item.label}</span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="nav-indicator"
                                                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                                                style={{ background: '#22d3a4' }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                    </motion.div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Live Badge */}
                <div className="flex items-center gap-2">
                    <div className="live-dot" />
                    <span className="text-xs font-medium hidden sm:block" style={{ color: '#22d3a4' }}>
                        Live
                    </span>
                </div>
            </div>
        </motion.nav>
    );
}
