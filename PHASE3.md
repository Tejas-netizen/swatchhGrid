# Phase 3 — Citizen Reporting
## Tool: Any | Paste with: CONTEXT.md + PROGRESS.md

---

## Goal
Public report form → submit issue → ⚠️ pin appears on map instantly via Socket.io.

## Prerequisite
Phases 1 and 2 done. Map working.

---

## Step 1 — Report API (server side — if not done in Phase 1)

Make sure `server/routes/reports.js` exists and has:
```javascript
const router = require('express').Router();
const { query } = require('../db');
let io;
const setIO = (socketIo) => { io = socketIo; };

router.post('/', async (req, res) => {
  const { lat, lng, issueType, description, photoBase64, binId } = req.body;
  if (!lat || !lng || !issueType) return res.status(400).json({ error: 'lat, lng, issueType required' });
  
  const result = await query(
    'INSERT INTO reports (bin_id, lat, lng, issue_type, description, photo_base64) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [binId || null, lat, lng, issueType, description || null, photoBase64 || null]
  );
  const report = result.rows[0];
  
  // If linked to a bin, increment citizen_reports
  if (binId) {
    await query('UPDATE bins SET citizen_reports = citizen_reports + 1 WHERE id = $1', [binId]);
  }
  
  io.emit('report:created', { report });
  res.json({ success: true, report });
});

router.get('/', async (req, res) => {
  const result = await query("SELECT * FROM reports WHERE status = 'open' ORDER BY created_at DESC LIMIT 50");
  res.json(result.rows);
});

router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  await query('UPDATE reports SET status=$1 WHERE id=$2', [status, req.params.id]);
  res.json({ success: true });
});

module.exports = { router, setIO };
```

Make sure `server/index.js` imports and uses setIO for reports too.

---

## Step 2 — Report Page (client)

Create `client/app/report/page.jsx`:
```javascript
'use client';
import { useState } from 'react';
import Link from 'next/link';

const ISSUE_TYPES = [
  { value: 'overflow', label: '🗑️ Overflowing Bin' },
  { value: 'missed_pickup', label: '🚛 Missed Pickup' },
  { value: 'illegal_dumping', label: '⚠️ Illegal Dumping' },
  { value: 'other', label: '📋 Other Issue' },
];

export default function ReportPage() {
  const [form, setForm] = useState({ issueType: 'overflow', description: '', lat: null, lng: null });
  const [photo, setPhoto] = useState(null);
  const [locStatus, setLocStatus] = useState('idle'); // idle | loading | done | error
  const [submitStatus, setSubmitStatus] = useState('idle'); // idle | loading | done | error

  const getLocation = () => {
    setLocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setLocStatus('done');
      },
      () => setLocStatus('error')
    );
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result); // base64
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.lat || !form.lng) return alert('Please capture your location first');
    setSubmitStatus('loading');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photoBase64: photo })
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitStatus('done');
    } catch {
      setSubmitStatus('error');
    }
  };

  if (submitStatus === 'done') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-white text-2xl font-bold mb-2">Report Submitted</h2>
          <p className="text-gray-400 mb-6">Our team has been notified. The bin is now visible on the live map.</p>
          <Link href="/" className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-500">
            Back to Live Map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-gray-400 hover:text-white">← Back</Link>
          <h1 className="text-white text-xl font-bold">📢 Report Waste Issue</h1>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Issue Type</label>
            <select
              value={form.issueType}
              onChange={e => setForm(f => ({ ...f, issueType: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-green-500 outline-none"
            >
              {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Location</label>
            {form.lat ? (
              <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 text-green-400 text-sm">
                ✅ {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
              </div>
            ) : (
              <button
                onClick={getLocation}
                disabled={locStatus === 'loading'}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-lg p-3 text-sm"
              >
                {locStatus === 'loading' ? '📍 Getting location...' : '📍 Capture My Location'}
              </button>
            )}
            {locStatus === 'error' && (
              <p className="text-red-400 text-xs mt-1">Could not get location. Enable GPS and try again.</p>
            )}
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the issue..."
              rows={3}
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-green-500 outline-none resize-none text-sm"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Photo (optional)</label>
            <input type="file" accept="image/*" onChange={handlePhoto}
              className="w-full text-gray-400 text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-700 file:text-white" />
            {photo && <img src={photo} alt="preview" className="mt-2 w-full h-32 object-cover rounded-lg" />}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitStatus === 'loading'}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {submitStatus === 'loading' ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 3 Checkpoint

1. Open `http://localhost:3000/report`
2. Select issue type → capture location → submit
3. Switch to `http://localhost:3000` map → orange ⚠️ pin should appear instantly
4. No page refresh needed

Update PROGRESS.md. Mark Phase 3 DONE.
**Ask user to confirm before starting Phase 4.**
