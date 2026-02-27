import Link from 'next/link';
import { RiLeafLine } from 'react-icons/ri';

export default function LandingFooter() {
    return (
        <footer
            className="border-t py-12 relative z-10"
            style={{ background: '#030712', borderColor: 'rgba(148,163,184,0.08)' }}
        >
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2">
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #22d3a4, #3b82f6)' }}
                    >
                        <RiLeafLine className="text-white text-sm" />
                    </div>
                    <span className="font-bold" style={{ color: '#f1f5f9' }}>SwachhGrid</span>
                    <span className="text-sm ml-1" style={{ color: '#475569' }}>© 2025</span>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/" className="text-sm font-semibold px-4 py-2 rounded-full transition-all" style={{ background: 'rgba(34,211,164,0.1)', border: '1px solid rgba(34,211,164,0.25)', color: '#22d3a4' }}>
                        → Open Dashboard
                    </Link>
                </div>

                <div className="flex gap-6">
                    {['Privacy Policy', 'Terms of Service', 'Contact'].map((label) => (
                        <a key={label} href="#" className="text-sm transition-colors hover:opacity-80" style={{ color: '#475569' }}>
                            {label}
                        </a>
                    ))}
                </div>
            </div>
        </footer>
    );
}
