'use client';
import { useRef, useEffect, useState } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';
import Link from 'next/link';
import { FiArrowRight, FiZap, FiCheckCircle, FiTrendingUp } from 'react-icons/fi';

const frameCount = 120;
const generateFramePath = (index) =>
    `/sequence/frame_${index.toString().padStart(4, '0')}.png`;

export default function DustbinSequence() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [images, setImages] = useState([]);
    const [loaded, setLoaded] = useState(false);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end end'],
    });

    const frameIndex = useTransform(scrollYProgress, [0, 1], [0, frameCount - 1]);

    // Preload images
    useEffect(() => {
        const loadImages = async () => {
            const imgs = [];
            const promises = [];
            for (let i = 1; i <= frameCount; i++) {
                const img = new Image();
                img.src = generateFramePath(i);
                promises.push(
                    new Promise((resolve) => {
                        img.onload = () => resolve(img);
                        img.onerror = () => resolve(null);
                    })
                );
                imgs.push(img);
            }
            await Promise.all(promises);
            setImages(imgs);
            setLoaded(true);
        };
        loadImages();
    }, []);

    // Canvas rendering
    useEffect(() => {
        if (!loaded || !canvasRef.current || images.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const renderFrame = (idx) => {
            const safeIndex = Math.min(frameCount - 1, Math.max(0, Math.round(idx)));
            const img = images[safeIndex];
            if (!img) return;

            const hRatio = canvas.width / img.width;
            const vRatio = canvas.height / img.height;
            const ratio = Math.min(hRatio, vRatio);
            const cx = (canvas.width - img.width * ratio) / 2;
            const cy = (canvas.height - img.height * ratio) / 2;

            // Dark background instead of light
            ctx.fillStyle = '#030712';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, img.width, img.height, cx, cy, img.width * ratio, img.height * ratio);
        };

        const updateSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            renderFrame(frameIndex.get());
        };

        updateSize();
        const unsubscribe = frameIndex.on('change', renderFrame);
        window.addEventListener('resize', updateSize);

        return () => {
            unsubscribe();
            window.removeEventListener('resize', updateSize);
        };
    }, [loaded, images, frameIndex]);

    return (
        <div ref={containerRef} className="relative h-[600vh]" style={{ background: '#030712' }}>
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                <canvas ref={canvasRef} className="block w-full h-full object-contain" />

                {/* Loading */}
                {!loaded && (
                    <div
                        className="absolute inset-0 flex items-center justify-center z-20"
                        style={{ background: '#030712' }}
                    >
                        <div className="flex flex-col items-center gap-4">
                            <div
                                className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
                                style={{ borderColor: '#22d3a4' }}
                            />
                            <p className="text-sm font-medium" style={{ color: '#475569' }}>
                                Loading Experience...
                            </p>
                        </div>
                    </div>
                )}

                {/* Narrative overlays */}
                <NarrativeOverlay scrollYProgress={scrollYProgress} />
            </div>
        </div>
    );
}

function NarrativeOverlay({ scrollYProgress }) {
    const useSectionOpacity = (start, end) =>
        useTransform(
            scrollYProgress,
            [start, start + 0.05, end - 0.05, end],
            [0, 1, 1, 0]
        );

    const heroOpacity = useSectionOpacity(0, 0.15);
    const problemOpacity = useSectionOpacity(0.15, 0.30);
    const solutionOpacity = useSectionOpacity(0.30, 0.50);
    const howItWorksOpacity = useSectionOpacity(0.50, 0.75);
    const impactOpacity = useSectionOpacity(0.75, 0.90);
    const ctaOpacity = useTransform(scrollYProgress, [0.90, 0.95], [0, 1]);

    const cardStyle = {
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
    };

    return (
        <>
            {/* 0-15%: Hero */}
            <motion.div style={{ opacity: heroOpacity }} className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                <div className="text-center max-w-3xl">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
                        style={{ background: 'rgba(34,211,164,0.12)', border: '1px solid rgba(34,211,164,0.25)', color: '#22d3a4' }}
                    >
                        <FiZap size={12} />
                        Smart City Tech
                    </motion.div>
                    <h1
                        className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
                        style={{ color: '#f1f5f9', textShadow: '0 2px 40px rgba(0,0,0,0.5)' }}
                    >
                        SwachhGrid
                    </h1>
                    <p className="text-xl md:text-2xl font-medium" style={{ color: '#94a3b8' }}>
                        Intelligent waste collection for tomorrow's cities.
                    </p>
                </div>
            </motion.div>

            {/* 15-30%: Problem */}
            <motion.div style={{ opacity: problemOpacity }} className="absolute inset-0 flex items-center justify-start pointer-events-none p-6 md:pl-24">
                <div className="max-w-xl" style={cardStyle}>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#f1f5f9' }}>
                        Waste doesn't wait.
                    </h2>
                    <p className="text-lg mb-4" style={{ color: '#94a3b8' }}>
                        Overflowing bins. Inefficient routes. Missed collections.
                    </p>
                    <p className="text-lg" style={{ color: '#94a3b8' }}>
                        Cities deserve better than reactive waste management.
                    </p>
                </div>
            </motion.div>

            {/* 30-50%: Solution */}
            <motion.div style={{ opacity: solutionOpacity }} className="absolute inset-0 flex items-center justify-end pointer-events-none p-6 md:pr-24">
                <div className="max-w-xl text-right" style={cardStyle}>
                    <h2
                        className="text-4xl md:text-5xl font-bold mb-6"
                        style={{
                            background: 'linear-gradient(135deg, #22d3a4, #3b82f6)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        Predict before it overflows.
                    </h2>
                    <p className="text-lg mb-4" style={{ color: '#94a3b8' }}>
                        AI-powered forecasting identifies bins at risk—before complaints arise.
                    </p>
                    <p className="text-lg" style={{ color: '#94a3b8' }}>
                        Real-time fill data meets intelligent routing.
                    </p>
                </div>
            </motion.div>

            {/* 50-75%: How it Works */}
            <motion.div style={{ opacity: howItWorksOpacity }} className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                <div className="max-w-4xl grid md:grid-cols-2 gap-12 items-center">
                    <div className="text-left" style={cardStyle}>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#f1f5f9' }}>
                            Dynamic routing.{' '}
                            <span style={{ color: '#22d3a4' }}>Zero waste.</span>
                        </h2>
                        <ul className="space-y-4 text-lg" style={{ color: '#94a3b8' }}>
                            {[
                                { dot: '#3b82f6', text: 'Live traffic integration' },
                                { dot: '#22d3a4', text: 'Optimal fleet allocation' },
                                { dot: '#f59e0b', text: 'Fuel & CO₂ reduction' },
                            ].map((item) => (
                                <li key={item.text} className="flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.dot }} />
                                    {item.text}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div />
                </div>
            </motion.div>

            {/* 75-90%: Impact */}
            <motion.div style={{ opacity: impactOpacity }} className="absolute inset-0 flex items-center justify-end pointer-events-none p-6 md:pr-24">
                <div className="max-w-xl text-right" style={cardStyle}>
                    <h2 className="text-4xl md:text-5xl font-bold mb-8" style={{ color: '#f1f5f9' }}>
                        Measurable impact.
                    </h2>
                    <div className="space-y-6">
                        {[
                            { value: '30%', label: 'FUEL REDUCTION', color: '#22d3a4' },
                            { value: '25%', label: 'CO₂ DECREASE', color: '#3b82f6' },
                            { value: '98%', label: 'SERVICE COVERAGE', color: '#f59e0b' },
                        ].map((stat) => (
                            <div key={stat.label}>
                                <div className="text-4xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                                <div className="text-sm uppercase tracking-wider" style={{ color: '#475569' }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* 90-100%: CTA */}
            <motion.div style={{ opacity: ctaOpacity }} className="absolute inset-0 flex items-center justify-center pointer-events-auto p-6 z-30">
                <div
                    className="text-center max-w-3xl p-12 rounded-3xl"
                    style={{
                        background: 'rgba(15,23,42,0.85)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid rgba(34,211,164,0.2)',
                        boxShadow: '0 0 60px rgba(34,211,164,0.1)',
                    }}
                >
                    <div
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
                        style={{ background: 'rgba(34,211,164,0.12)', border: '1px solid rgba(34,211,164,0.25)', color: '#22d3a4' }}
                    >
                        <FiCheckCircle size={11} />
                        Built for Hackathon Pune 2025
                    </div>
                    <h2 className="text-5xl md:text-6xl font-bold mb-4" style={{ color: '#f1f5f9' }}>
                        Cleaner cities start here.
                    </h2>
                    <p className="text-xl mb-8" style={{ color: '#64748b' }}>
                        SwachhGrid — Built for efficiency, designed for impact.
                    </p>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <Link href="/">
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(34,211,164,0.4)' }}
                                whileTap={{ scale: 0.97 }}
                                className="flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg text-white"
                                style={{ background: 'linear-gradient(135deg, #22d3a4, #3b82f6)' }}
                            >
                                Open Live Dashboard
                                <FiArrowRight size={18} />
                            </motion.button>
                        </Link>
                        <Link href="/landing/features">
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className="flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg"
                                style={{
                                    background: 'rgba(148,163,184,0.08)',
                                    border: '1px solid rgba(148,163,184,0.15)',
                                    color: '#94a3b8',
                                }}
                            >
                                <FiTrendingUp size={16} />
                                Explore Features
                            </motion.button>
                        </Link>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
