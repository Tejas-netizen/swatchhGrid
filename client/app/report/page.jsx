'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { FiMapPin, FiAlertCircle, FiCamera, FiSend, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';

const ISSUE_TYPES = [
  { value: 'overflow', label: 'Overflowing Bin', emoji: '🗑️', color: '#ef4444' },
  { value: 'missed_pickup', label: 'Missed Pickup', emoji: '🚛', color: '#f59e0b' },
  { value: 'illegal_dumping', label: 'Illegal Dumping', emoji: '⚠️', color: '#f97316' },
  { value: 'other', label: 'Other Issue', emoji: '📋', color: '#8b5cf6' },
];

export default function ReportPage() {
  const [form, setForm] = useState({ issueType: 'overflow', description: '', lat: null, lng: null });
  const [photo, setPhoto] = useState(null);
  const [locStatus, setLocStatus] = useState('idle');
  const [submitStatus, setSubmitStatus] = useState('idle');

  const getLocation = () => {
    setLocStatus('loading');
    if (!navigator.geolocation) { setLocStatus('error'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setLocStatus('done');
      },
      () => setLocStatus('error')
    );
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.lat || !form.lng) { alert('Please capture your location first'); return; }
    setSubmitStatus('loading');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: form.lat, lng: form.lng, issue_type: form.issueType, description: form.description, photo_base64: photo }),
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitStatus('done');
    } catch {
      setSubmitStatus('error');
    }
  };

  if (submitStatus === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#030712' }}>
        <Navbar />
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-center max-w-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 250 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(34, 211, 164, 0.15)', border: '2px solid rgba(34, 211, 164, 0.4)' }}
          >
            <FiCheckCircle size={36} style={{ color: '#22d3a4' }} />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#f1f5f9' }}>Report Submitted!</h2>
          <p className="mb-8 text-sm" style={{ color: '#64748b' }}>Nearest truck has been notified. Thank you!</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => { setSubmitStatus('idle'); setForm({ issueType: 'overflow', description: '', lat: null, lng: null }); setPhoto(null); setLocStatus('idle'); }}
              className="px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d' }}
            >
              Report Another
            </motion.button>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link href="/" className="block px-6 py-3 rounded-xl font-semibold text-sm" style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)', color: '#94a3b8' }}>
                ← Back to Map
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  const selectedIssue = ISSUE_TYPES.find((t) => t.value === form.issueType);

  return (
    <div className="min-h-screen" style={{ background: '#030712' }}>
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-20 pb-8">

        {/* Hero Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm mb-5 hover:opacity-80 transition-opacity" style={{ color: '#64748b' }}>
            <FiArrowLeft size={14} /> Back to Map
          </Link>
          <h1 className="text-3xl font-bold mb-2">
            <span style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Report an Issue
            </span>
          </h1>
          <p className="text-sm" style={{ color: '#64748b' }}>Help keep Pune clean — your report reaches the nearest truck instantly.</p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl p-6 space-y-5"
          style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148,163,184,0.1)', backdropFilter: 'blur(16px)' }}
        >
          {/* Issue Type */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: '#475569' }}>Issue Type</label>
            <div className="grid grid-cols-2 gap-2">
              {ISSUE_TYPES.map((t) => (
                <motion.button
                  key={t.value}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setForm((f) => ({ ...f, issueType: t.value }))}
                  className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium text-left transition-all"
                  style={{
                    background: form.issueType === t.value ? `rgba(${t.color === '#ef4444' ? '239,68,68' : t.color === '#f59e0b' ? '245,158,11' : t.color === '#f97316' ? '249,115,22' : '139,92,246'}, 0.15)` : 'rgba(30,41,59,0.5)',
                    border: `1px solid ${form.issueType === t.value ? t.color + '55' : 'rgba(148,163,184,0.1)'}`,
                    color: form.issueType === t.value ? t.color : '#64748b',
                  }}
                >
                  <span>{t.emoji}</span>
                  <span className="text-xs">{t.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: '#475569' }}>
              <FiMapPin size={11} className="inline mr-1" />Location
            </label>
            <AnimatePresence mode="wait">
              {form.lat ? (
                <motion.div
                  key="loc-done"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(34,211,164,0.08)', border: '1px solid rgba(34,211,164,0.2)', color: '#22d3a4' }}
                >
                  ✅ {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                </motion.div>
              ) : (
                <motion.button
                  key="loc-btn"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                  onClick={getLocation}
                  disabled={locStatus === 'loading'}
                  className="w-full p-3 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.12)', color: '#64748b' }}
                >
                  {locStatus === 'loading' ? '📍 Getting location...' : '📍 Capture My Location'}
                </motion.button>
              )}
            </AnimatePresence>
            {locStatus === 'error' && (
              <p className="text-xs mt-1" style={{ color: '#f87171' }}>Could not get location. Enable GPS and try again.</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: '#475569' }}>Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the issue..."
              rows={3}
              className="w-full p-3 rounded-xl text-sm resize-none outline-none transition-all"
              style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.1)', color: '#f1f5f9' }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(34,211,164,0.4)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(148,163,184,0.1)'}
            />
          </div>

          {/* Photo */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: '#475569' }}>
              <FiCamera size={11} className="inline mr-1" />Photo (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              className="w-full text-sm"
              style={{ color: '#64748b' }}
            />
            {photo && (
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                src={photo}
                alt="preview"
                className="mt-2 w-full h-32 object-cover rounded-xl"
                style={{ border: '1px solid rgba(148,163,184,0.1)' }}
              />
            )}
          </div>

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(245,158,11,0.4)' }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={submitStatus === 'loading'}
            className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: submitStatus === 'loading' ? 'rgba(245,158,11,0.3)' : 'linear-gradient(135deg, #f59e0b, #ef4444)',
              color: '#fff',
              border: 'none',
            }}
          >
            <FiSend size={14} />
            {submitStatus === 'loading' ? 'Submitting...' : 'Submit Report'}
          </motion.button>

          {submitStatus === 'error' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-center" style={{ color: '#f87171' }}>
              Failed to submit. Please try again.
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
