'use client';
import { useScroll, useMotionValueEvent, motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RiLeafLine } from 'react-icons/ri';
import { FiExternalLink } from 'react-icons/fi';

const NAV_LINKS = [
    { name: 'Overview', href: '/landing' },
    { name: 'Features', href: '/landing/features' },
    { name: 'Technology', href: '/landing/technology' },
    { name: 'Impact', href: '/landing/impact' },
];

function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

export default function LandingNavbar() {
    const { scrollY } = useScroll();
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

    useMotionValueEvent(scrollY, 'change', (latest) => {
        setScrolled(latest > 50);
    });

    return (
        <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={cn(
                'fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-500',
                scrolled
                    ? 'bg-[#030712]/90 backdrop-blur-xl border-b border-white/5 py-3'
                    : 'bg-transparent py-5'
            )}
        >
            {/* Logo */}
            <Link href="/landing" className="flex items-center gap-2 group">
                <motion.div
                    whileHover={{ rotate: 180, scale: 1.1 }}
                    transition={{ duration: 0.4 }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #22d3a4, #3b82f6)' }}
                >
                    <RiLeafLine className="text-white text-base" />
                </motion.div>
                <span
                    className="font-bold text-lg"
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
            <div className="hidden md:flex items-center gap-8">
                {NAV_LINKS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="text-sm font-medium transition-colors relative"
                            style={{ color: isActive ? '#22d3a4' : '#94a3b8' }}
                        >
                            {item.name}
                            {isActive && (
                                <motion.div
                                    layoutId="landing-nav-underline"
                                    className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                                    style={{ background: '#22d3a4' }}
                                    initial={false}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* CTA */}
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link
                    href="/"
                    className="hidden md:flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-full transition-all"
                    style={{
                        background: 'linear-gradient(135deg, #22d3a4, #3b82f6)',
                        boxShadow: '0 4px 20px rgba(34,211,164,0.25)',
                    }}
                >
                    <FiExternalLink size={13} />
                    Live Dashboard
                </Link>
            </motion.div>
        </motion.nav>
    );
}
