'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';
import LandingSectionHero from '@/components/LandingSectionHero';

const TECH_STACK = [
    'Next.js 14', 'Tailwind CSS', 'Node.js', 'PostgreSQL',
    'Socket.io', 'Google Gemini AI', 'Mapbox GL', 'Framer Motion', 'Express.js', 'node-cron'
];

function TechBlock({ title, desc }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            className="group"
        >
            <h3
                className="text-2xl font-bold mb-4 transition-colors"
                style={{ color: '#f1f5f9' }}
                onMouseEnter={(e) => (e.target.style.color = '#22d3a4')}
                onMouseLeave={(e) => (e.target.style.color = '#f1f5f9')}
            >
                {title}
            </h3>
            <p
                className="text-lg leading-relaxed pl-6 transition-colors"
                style={{ color: '#64748b', borderLeft: '4px solid rgba(148,163,184,0.1)' }}
            >
                {desc}
            </p>
        </motion.div>
    );
}

export default function TechnologyPage() {
    return (
        <main className="min-h-screen" style={{ background: '#030712' }}>
            <LandingNavbar />

            <LandingSectionHero
                title="Built on Cutting-Edge AI"
                subtitle="Real-time optimization, Gemini AI prediction, and intelligent routing for smart waste management."
                centered={true}
            />

            <section className="px-6 pb-24">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
                    {/* Left: Tech blocks */}
                    <div className="space-y-12">
                        <TechBlock
                            title="Gemini AI Overflow Prediction"
                            desc="Google Gemini 1.5-flash analyzes bin fill history and patterns to predict overflow events per popup click — lazy loaded with 5-minute caching for optimal performance."
                        />
                        <TechBlock
                            title="Greedy VRP Route Optimizer"
                            desc="Custom JavaScript vehicle routing problem solver. When any bin is overridden to critical, routes recompute across all 3 trucks in under 500ms and push live via Socket.io."
                        />
                        <TechBlock
                            title="Real-time Socket.io Engine"
                            desc="Bi-directional WebSocket communication for live bin updates, route changes, alerts, and citizen reports — all propagated instantly to every connected client."
                        />
                        <TechBlock
                            title="node-cron Simulator"
                            desc="Automated bin fill-level simulation runs every 30 seconds, gradually incrementing bins and triggering route re-optimization when critical thresholds are crossed."
                        />
                    </div>

                    {/* Right: Architecture diagram */}
                    <div
                        className="sticky top-32 rounded-3xl p-8 min-h-[600px] flex items-center justify-center relative overflow-hidden"
                        style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(148,163,184,0.08)', backdropFilter: 'blur(12px)' }}
                    >
                        {/* Grid bg */}
                        <div
                            className="absolute inset-0 opacity-30"
                            style={{
                                backgroundImage: 'linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)',
                                backgroundSize: '40px 40px',
                            }}
                        />

                        <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">
                            {/* Input */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="w-full p-4 rounded-xl text-center text-sm font-semibold"
                                style={{ background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.12)', color: '#64748b' }}
                            >
                                IoT Sensors & Citizen Reports
                            </motion.div>

                            <div className="h-8 w-0.5" style={{ background: 'rgba(148,163,184,0.2)' }} />

                            {/* Core Engine */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="w-full p-6 rounded-2xl text-white text-center"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(34,211,164,0.15), rgba(59,130,246,0.15))',
                                    border: '1px solid rgba(34,211,164,0.25)',
                                    boxShadow: '0 0 30px rgba(34,211,164,0.1)',
                                }}
                            >
                                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#22d3a4' }}>
                                    The Core
                                </div>
                                <div className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>SwachhGrid Engine</div>
                                <div className="text-sm" style={{ color: '#64748b' }}>Node.js · Socket.io · Greedy VRP</div>
                            </motion.div>

                            <div className="h-8 w-0.5" style={{ background: 'rgba(148,163,184,0.2)' }} />

                            {/* Outputs */}
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.4 }}
                                    className="p-4 rounded-xl text-center"
                                    style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
                                >
                                    <div className="font-bold text-sm" style={{ color: '#3b82f6' }}>Dynamic Routes</div>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.5 }}
                                    className="p-4 rounded-xl text-center"
                                    style={{ background: 'rgba(34,211,164,0.08)', border: '1px solid rgba(34,211,164,0.2)' }}
                                >
                                    <div className="font-bold text-sm" style={{ color: '#22d3a4' }}>AI Predictions</div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tech Stack Pills */}
            <section className="py-24 px-6" style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}>
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-2xl font-bold mb-12" style={{ color: '#f1f5f9' }}>Powered by Modern Infrastructure</h2>
                    <div className="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto">
                        {TECH_STACK.map((tech, i) => (
                            <motion.span
                                key={tech}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ scale: 1.05 }}
                                className="px-5 py-2.5 rounded-full text-sm font-medium cursor-default transition-all"
                                style={{
                                    background: 'rgba(15,23,42,0.7)',
                                    border: '1px solid rgba(148,163,184,0.12)',
                                    color: '#94a3b8',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(34,211,164,0.4)';
                                    e.currentTarget.style.color = '#22d3a4';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(148,163,184,0.12)';
                                    e.currentTarget.style.color = '#94a3b8';
                                }}
                            >
                                {tech}
                            </motion.span>
                        ))}
                    </div>
                </div>
            </section>

            <LandingFooter />
        </main>
    );
}
