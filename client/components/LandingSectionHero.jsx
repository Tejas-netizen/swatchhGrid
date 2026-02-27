'use client';
import { motion } from 'framer-motion';

export default function SectionHero({ title, subtitle, centered = true }) {
    return (
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
            {/* Radial gradient */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at top, rgba(34,211,164,0.06) 0%, transparent 60%)',
                }}
            />
            <div className={`max-w-7xl mx-auto relative z-10 ${centered ? 'text-center' : 'text-left'}`}>
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="text-5xl md:text-6xl font-bold tracking-tight mb-6"
                    style={{ color: '#f1f5f9' }}
                >
                    {title}
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                    className={`text-xl md:text-2xl max-w-3xl ${centered ? 'mx-auto' : ''}`}
                    style={{ color: '#64748b' }}
                >
                    {subtitle}
                </motion.p>
            </div>
        </section>
    );
}
