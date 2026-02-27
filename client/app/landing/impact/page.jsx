'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';
import LandingSectionHero from '@/components/LandingSectionHero';
import { Droplet, Recycle, Clock, Map } from 'lucide-react';

function MetricCard({ value, label, color, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ scale: 1.03, y: -4 }}
            className="p-10 rounded-3xl text-center"
            style={{
                background: 'rgba(15,23,42,0.7)',
                border: '1px solid rgba(148,163,184,0.08)',
                backdropFilter: 'blur(12px)',
            }}
        >
            <div className="text-6xl font-bold mb-4" style={{ color }}>{value}</div>
            <div className="text-sm uppercase tracking-wider font-medium" style={{ color: '#475569' }}>{label}</div>
        </motion.div>
    );
}

export default function ImpactPage() {
    return (
        <main className="min-h-screen" style={{ background: '#030712' }}>
            <LandingNavbar />

            <LandingSectionHero
                title="Measurable Results for Cities"
                subtitle="Real-world metrics from our pilot deployments demonstrating efficiency and sustainability."
                centered={true}
            />

            <section className="px-6 pb-24">
                {/* Top Metrics */}
                <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 mb-24">
                    <MetricCard value="30%" label="Average fuel reduction" color="#22d3a4" delay={0} />
                    <MetricCard value="25%" label="CO₂ emissions decrease" color="#3b82f6" delay={0.1} />
                    <MetricCard value="98%" label="Service coverage" color="#f59e0b" delay={0.2} />
                </div>

                {/* Charts + Map */}
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center mb-24">
                    {/* Fairness Chart */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="p-8 rounded-3xl"
                        style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(148,163,184,0.08)', backdropFilter: 'blur(12px)' }}
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <Clock size={22} style={{ color: '#3b82f6' }} />
                            <h3 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Service Fairness</h3>
                        </div>
                        <div className="space-y-6">
                            {[
                                { label: 'Max Wait Time', value: '60%', note: '-40% Reduction', color: '#22d3a4' },
                                { label: 'Zone Variance', value: '90%', note: 'Minimized', color: '#3b82f6' },
                            ].map((bar) => (
                                <div key={bar.label}>
                                    <div className="flex justify-between text-sm mb-2" style={{ color: '#64748b' }}>
                                        <span>{bar.label}</span>
                                        <span style={{ color: bar.color, fontWeight: 600 }}>{bar.note}</span>
                                    </div>
                                    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.1)' }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            whileInView={{ width: bar.value }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 1.2, delay: 0.3 }}
                                            className="h-full rounded-full"
                                            style={{ background: bar.color }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Map */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="rounded-3xl p-8 relative overflow-hidden min-h-[300px] flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(34,211,164,0.08), rgba(59,130,246,0.08))', border: '1px solid rgba(34,211,164,0.15)' }}
                    >
                        <div className="relative z-10 text-center">
                            <Map size={48} style={{ color: 'rgba(148,163,184,0.4)', margin: '0 auto 16px' }} />
                            <h3 className="text-2xl font-bold mb-2" style={{ color: '#f1f5f9' }}>Live Across Pune</h3>
                            <p style={{ color: '#64748b' }}>30 bins · 3 trucks · 3 zones</p>
                        </div>
                    </motion.div>
                </div>

                {/* Sustainability */}
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="rounded-3xl p-10 flex items-center gap-6"
                        style={{ background: 'rgba(34,211,164,0.06)', border: '1px solid rgba(34,211,164,0.15)' }}
                    >
                        <div className="p-4 rounded-2xl" style={{ background: 'rgba(34,211,164,0.12)' }}>
                            <Droplet size={32} style={{ color: '#22d3a4' }} />
                        </div>
                        <div>
                            <div className="text-4xl font-bold mb-1" style={{ color: '#22d3a4' }}>12,450 L</div>
                            <div className="font-medium" style={{ color: '#64748b' }}>Fuel Saved Annually</div>
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="rounded-3xl p-10 flex items-center gap-6"
                        style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}
                    >
                        <div className="p-4 rounded-2xl" style={{ background: 'rgba(59,130,246,0.12)' }}>
                            <Recycle size={32} style={{ color: '#3b82f6' }} />
                        </div>
                        <div>
                            <div className="text-4xl font-bold mb-1" style={{ color: '#3b82f6' }}>1,200 Bins</div>
                            <div className="font-medium" style={{ color: '#64748b' }}>Overflows Prevented</div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <LandingFooter />
        </main>
    );
}
