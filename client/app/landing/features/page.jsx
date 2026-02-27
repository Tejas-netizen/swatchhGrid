'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';
import LandingSectionHero from '@/components/LandingSectionHero';
import {
    Trash2, TrendingUp, AlertTriangle, MessageSquare, MapPin, Leaf
} from 'lucide-react';

const FEATURES = [
    {
        icon: Trash2,
        title: 'Smart Bin Monitoring',
        desc: 'Real-time fill levels with color-coded mapping for instant status visibility and efficiency.',
        color: '#22d3a4',
        bg: 'rgba(34,211,164,0.08)',
        border: 'rgba(34,211,164,0.15)',
    },
    {
        icon: TrendingUp,
        title: 'Dynamic Route Optimization',
        desc: 'AI-powered routing that adapts instantly to traffic and bin fill data to save fuel.',
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.08)',
        border: 'rgba(59,130,246,0.15)',
    },
    {
        icon: AlertTriangle,
        title: 'Overflow Prediction',
        desc: 'Gemini AI identifies bins at risk — before complaints arise. Real-time fill data meets intelligent routing.',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.08)',
        border: 'rgba(245,158,11,0.15)',
    },
    {
        icon: MessageSquare,
        title: 'Citizen Reporting',
        desc: 'Empower citizens to report issues with photos, directly integrated into fleet routes instantly.',
        color: '#8b5cf6',
        bg: 'rgba(139,92,246,0.08)',
        border: 'rgba(139,92,246,0.15)',
    },
    {
        icon: MapPin,
        title: 'Live Fleet Tracking',
        desc: 'Real-time GPS simulation with ETA calculations and load monitoring for every truck.',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.08)',
        border: 'rgba(239,68,68,0.15)',
    },
    {
        icon: Leaf,
        title: 'Sustainability Dashboard',
        desc: 'Track fuel saved, CO₂ reduced, and service fairness metrics in one centralized view.',
        color: '#10b981',
        bg: 'rgba(16,185,129,0.08)',
        border: 'rgba(16,185,129,0.15)',
    },
];

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const cardVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function FeaturesPage() {
    return (
        <main className="min-h-screen" style={{ background: '#030712' }}>
            <LandingNavbar />

            <LandingSectionHero
                title="Powerful Features for Smarter Cities"
                subtitle="Everything you need to optimize waste collection in one seamless, intelligent platform."
                centered={true}
            />

            {/* Feature Cards */}
            <section className="px-6 pb-32">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {FEATURES.map((feature, idx) => {
                        const Icon = feature.icon;
                        return (
                            <motion.div
                                key={idx}
                                variants={cardVariants}
                                whileHover={{ scale: 1.02, y: -4 }}
                                className="p-8 rounded-3xl transition-all"
                                style={{
                                    background: 'rgba(15,23,42,0.7)',
                                    border: '1px solid rgba(148,163,184,0.08)',
                                    backdropFilter: 'blur(12px)',
                                }}
                            >
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                                    style={{ background: feature.bg, border: `1px solid ${feature.border}` }}
                                >
                                    <Icon size={22} style={{ color: feature.color }} />
                                </div>
                                <h3 className="text-xl font-bold mb-3" style={{ color: '#f1f5f9' }}>
                                    {feature.title}
                                </h3>
                                <p className="leading-relaxed" style={{ color: '#64748b' }}>
                                    {feature.desc}
                                </p>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </section>

            {/* CTA Banner */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(135deg, rgba(34,211,164,0.12), rgba(59,130,246,0.12))' }}
                />
                <div
                    className="absolute inset-0"
                    style={{ border: '1px solid rgba(34,211,164,0.15)' }}
                />
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#f1f5f9' }}>
                        Ready to transform your city?
                    </h2>
                    <p className="text-xl mb-10 max-w-2xl mx-auto" style={{ color: '#64748b' }}>
                        Join the smart city revolution with a platform built for efficiency, sustainability, and scale.
                    </p>
                    <Link href="/">
                        <motion.button
                            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(34,211,164,0.4)' }}
                            whileTap={{ scale: 0.97 }}
                            className="px-8 py-4 rounded-full font-bold text-lg text-white"
                            style={{ background: 'linear-gradient(135deg, #22d3a4, #3b82f6)' }}
                        >
                            Open Live Dashboard →
                        </motion.button>
                    </Link>
                </div>
            </section>

            <LandingFooter />
        </main>
    );
}
