'use client';
import dynamic from 'next/dynamic';
import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';

const LandingDustbinSequence = dynamic(() => import('@/components/LandingDustbinSequence'), { ssr: false });

export default function LandingPage() {
    return (
        <main className="min-h-screen" style={{ background: '#030712' }}>
            <LandingNavbar />
            <LandingDustbinSequence />
            <LandingFooter />
        </main>
    );
}
