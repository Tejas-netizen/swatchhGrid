'use client';
import { useState, useEffect } from 'react';

export default function BinPopup({ bin, onClose, onOverride }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_SOCKET_URL}/api/predict/${bin.id}`,
      { method: 'POST' },
    )
      .then((r) => r.json())
      .then(setPrediction)
      .catch(() => setPrediction(null))
      .finally(() => setLoading(false));
  }, [bin.id]);

  useEffect(() => {
    if (!bin) return;

    let isCancelled = false;
    const controller = new AbortController();
    const TIMEOUT_MS = 8000;

    const getBinNumeric = (value, fallback) => {
      const v = typeof value === 'number' ? value : parseFloat(value);
      return Number.isFinite(v) ? v : fallback;
    };

    const fetchStreamingMarkdown = async (url, signal) => {
      const res = await fetch(url, { method: 'GET', signal });
      if (!res.ok) {
        throw new Error('Failed streaming fetch');
      }

      if (!res.body) {
        return await res.text();
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      // Read until we find a line starting with "data:"
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith('data:')) {
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;
            try {
              const parsed = JSON.parse(jsonStr);
              // Gradio returns an array; the first item is the markdown string
              if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
                return parsed[0];
              }
              return JSON.stringify(parsed);
            } catch {
              // Keep reading if JSON parse fails
              continue;
            }
          }
        }

        // Keep the last partial line in the buffer
        buffer = lines[lines.length - 1];
      }

      return buffer;
    };

    const parseForecastMarkdown = (markdown) => {
      if (!markdown || typeof markdown !== 'string') return null;

      const lines = markdown.split('\n').map((l) => l.trim());
      let forecast6h = null;
      let forecast12h = null;
      let urgency = null;

      for (const line of lines) {
        if (line.toLowerCase().includes('+6 hours')) {
          const match =
            line.match(/\+6\s*hours\s*\|\s*([0-9]+(?:\.[0-9]+)?)\s*%?/i) ||
            line.match(/predicted_6h[^0-9]*([0-9]+(?:\.[0-9]+)?)/i);
          if (match) {
            forecast6h = parseFloat(match[1]);
          }
        }

        if (line.toLowerCase().includes('+12 hours')) {
          const match =
            line.match(/\+12\s*hours\s*\|\s*([0-9]+(?:\.[0-9]+)?)\s*%?/i) ||
            line.match(/predicted_12h[^0-9]*([0-9]+(?:\.[0-9]+)?)/i);
          if (match) {
            forecast12h = parseFloat(match[1]);
          }
        }

        if (line.toLowerCase().includes('collection urgency')) {
          urgency = line;
        }
      }

      if (forecast6h == null && forecast12h == null && !urgency) {
        return null;
      }

      return {
        forecast6h,
        forecast12h,
        urgency,
      };
    };

    const parseCurrentStatusMarkdown = (markdown) => {
      if (!markdown || typeof markdown !== 'string') return null;

      const lines = markdown.split('\n').map((l) => l.trim());
      let status = null;
      let confidence = null;

      for (const line of lines) {
        const statusMatch = line.match(/\b(GREEN|YELLOW|RED)\b/i);
        if (statusMatch && !status) {
          status = statusMatch[1].toUpperCase();
        }

        if (line.toLowerCase().includes('confidence')) {
          const confMatch = line.match(
            /([0-9]+(?:\.[0-9]+)?)\s*%?\s*(confidence)?/i,
          );
          if (confMatch) {
            confidence = parseFloat(confMatch[1]);
          }
        }
      }

      if (!status && confidence == null) {
        return null;
      }

      return {
        status,
        confidence,
      };
    };

    const fetchForecast = async (signal) => {
      const ultrasonic = getBinNumeric(
        bin.ultrasonic,
        30,
      );
      const weight = getBinNumeric(bin.weight, 15);
      const fillLevel = getBinNumeric(
        bin.fill_level ?? bin.fillLevel,
        50,
      );
      const fillRate = getBinNumeric(
        bin.fill_rate ?? bin.fillRate,
        1.0,
      );

      const now = new Date();

      const body = {
        data: [
          ultrasonic,
          weight,
          fillLevel,
          now.getHours(),
          now.getDay(),
          bin.bin_type ?? bin.binType ?? 'commercial',
          bin.location ?? 'urban',
          bin.zone ?? 'central',
          fillRate,
          fillRate * 3,
        ],
      };

      const res = await fetch(
        'https://tejas2110-smart-ai-hack.hf.space/call/predict_forecast',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        },
      );

      if (!res.ok) {
        throw new Error('Forecast POST failed');
      }

      const { event_id: eventId } = await res.json();
      if (!eventId) {
        throw new Error('Missing forecast event_id');
      }

      const markdown = await fetchStreamingMarkdown(
        `https://tejas2110-smart-ai-hack.hf.space/call/predict_forecast/${eventId}`,
        signal,
      );

      const parsed = parseForecastMarkdown(markdown);
      if (!parsed) {
        throw new Error('Failed to parse forecast markdown');
      }

      return parsed;
    };

    const fetchCurrentStatus = async (signal) => {
      const ultrasonic = getBinNumeric(
        bin.ultrasonic,
        30,
      );
      const weight = getBinNumeric(bin.weight, 15);
      const fillLevel = getBinNumeric(
        bin.fill_level ?? bin.fillLevel,
        50,
      );
      const fillRate = getBinNumeric(
        bin.fill_rate ?? bin.fillRate,
        1.0,
      );
      const hoursSinceCollection = getBinNumeric(
        bin.hours_since_collection ?? bin.hoursSinceCollection,
        24,
      );

      const now = new Date();

      const body = {
        data: [
          ultrasonic,
          weight,
          fillLevel,
          now.getHours(),
          now.getDay(),
          bin.bin_type ?? bin.binType ?? 'commercial',
          bin.location ?? 'urban',
          bin.zone ?? 'central',
          fillRate,
          hoursSinceCollection,
        ],
      };

      const res = await fetch(
        'https://tejas2110-smart-ai-hack.hf.space/call/predict_current_status',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        },
      );

      if (!res.ok) {
        throw new Error('Current status POST failed');
      }

      const { event_id: eventId } = await res.json();
      if (!eventId) {
        throw new Error('Missing current status event_id');
      }

      const markdown = await fetchStreamingMarkdown(
        `https://tejas2110-smart-ai-hack.hf.space/call/predict_current_status/${eventId}`,
        signal,
      );

      const parsed = parseCurrentStatusMarkdown(markdown);
      if (!parsed) {
        throw new Error('Failed to parse current status markdown');
      }

      return parsed;
    };

    const computeFallback = () => {
      const fillLevel = getBinNumeric(
        bin.fill_level ?? bin.fillLevel,
        50,
      );
      const fillRate = getBinNumeric(
        bin.fill_rate ?? bin.fillRate,
        1.0,
      );

      const hoursToFull =
        fillRate > 0 ? (100 - fillLevel) / fillRate : 999;
      const forecast6h = Math.min(100, fillLevel + fillRate * 6);
      const forecast12h = Math.min(100, fillLevel + fillRate * 12);

      const status =
        fillLevel >= 80 ? 'RED' : fillLevel >= 40 ? 'YELLOW' : 'GREEN';

      return {
        status,
        confidence: null,
        forecast6h,
        forecast12h,
        hoursToFull,
        urgency: null,
        source: 'fallback',
      };
    };

    const run = async () => {
      setAiLoading(true);
      setAiError(false);
      setAiResult(null);

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, TIMEOUT_MS);

      try {
        const [forecast, currentStatus] = await Promise.all([
          fetchForecast(controller.signal),
          fetchCurrentStatus(controller.signal),
        ]);

        if (isCancelled) return;

        clearTimeout(timeoutId);

        setAiResult({
          status: currentStatus.status ?? 'GREEN',
          confidence: currentStatus.confidence ?? null,
          forecast6h: forecast.forecast6h ?? null,
          forecast12h: forecast.forecast12h ?? null,
          hoursToFull: null,
          urgency: forecast.urgency ?? null,
          source: 'remote',
        });
        setAiError(false);
      } catch (error) {
        if (isCancelled) return;

        clearTimeout(timeoutId);

        const fallback = computeFallback();
        setAiResult(fallback);
        setAiError(true);
      } finally {
        if (!isCancelled) {
          setAiLoading(false);
        }
      }
    };

    run();

    return () => {
      isCancelled = true;
      clearTimeout(controller.abortTimeout);
      controller.abort();
    };
  }, [bin]);

  const fillColor =
    bin.fillLevel > 75
      ? 'border-red-500'
      : bin.fillLevel > 40
      ? 'border-amber-400'
      : 'border-green-500';
  const statusBg =
    bin.fillLevel > 75
      ? 'bg-red-500'
      : bin.fillLevel > 40
      ? 'bg-amber-400'
      : 'bg-green-500';

  return (
    <div
      className={`absolute top-4 right-4 w-72 bg-gray-900 border-2 ${fillColor} rounded-xl p-4 shadow-2xl z-10`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <span>{bin.name}</span>
            {aiResult && !aiError && (
              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                🧠 ML-Powered
              </span>
            )}
          </h3>
          <span className="text-gray-400 text-sm capitalize">
            {bin.zone} zone
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`${statusBg} text-white text-xs px-2 py-1 rounded-full font-semibold`}
          >
            {bin.status}
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Fill Level</span>
          <span className="text-white font-bold">{bin.fillLevel}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              bin.fillLevel > 75
                ? 'bg-red-500'
                : bin.fillLevel > 40
                ? 'bg-amber-400'
                : 'bg-green-500'
            }`}
            style={{ width: `${bin.fillLevel}%` }}
          />
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-3 mb-3 text-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-gray-100 flex items-center gap-1">
            <span>🤖 AI Prediction</span>
          </div>
          {aiResult && !aiError && (
            <span className="text-[10px] uppercase tracking-wide text-purple-300">
              🧠 ML-Powered
            </span>
          )}
        </div>

        {aiLoading && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            <span>Contacting HuggingFace model...</span>
          </div>
        )}

        {!aiLoading && aiResult && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Status</span>
              <span
                className="text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1"
                style={{
                  backgroundColor:
                    aiResult.status === 'RED'
                      ? '#dc2626'
                      : aiResult.status === 'YELLOW'
                      ? '#ca8a04'
                      : '#16a34a',
                  color: '#ffffff',
                }}
              >
                <span>
                  {aiResult.status === 'RED'
                    ? '🔴'
                    : aiResult.status === 'YELLOW'
                    ? '🟡'
                    : '🟢'}
                </span>
                <span>{aiResult.status || 'GREEN'}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Confidence</span>
              <span className="text-gray-100">
                {aiResult.confidence != null
                  ? `${aiResult.confidence.toFixed(1)}%`
                  : '—'}
              </span>
            </div>

            <div className="mt-2">
              <div className="text-gray-400 mb-1">Fill Forecast</div>
              <div className="space-y-1">
                {aiResult.forecast6h != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs w-10">+6h →</span>
                    <span className="text-gray-100 text-xs w-10">
                      {aiResult.forecast6h.toFixed(0)}%
                    </span>
                    <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, aiResult.forecast6h),
                          )}%`,
                          backgroundColor:
                            aiResult.forecast6h >= 80
                              ? '#dc2626'
                              : aiResult.forecast6h >= 40
                              ? '#ca8a04'
                              : '#16a34a',
                        }}
                      />
                    </div>
                  </div>
                )}

                {aiResult.forecast12h != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs w-10">+12h →</span>
                    <span className="text-gray-100 text-xs w-10">
                      {aiResult.forecast12h.toFixed(0)}%
                    </span>
                    <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, aiResult.forecast12h),
                          )}%`,
                          backgroundColor:
                            aiResult.forecast12h >= 80
                              ? '#dc2626'
                              : aiResult.forecast12h >= 40
                              ? '#ca8a04'
                              : '#16a34a',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {aiResult.urgency && (
              <div className="text-[11px] text-gray-400">
                {aiResult.urgency}
              </div>
            )}

            {aiError && (
              <div className="mt-2 text-[11px] text-amber-300">
                ⚡ Local estimate &mdash; Powered by Random Forest + Gradient
                Boosting
              </div>
            )}
          </div>
        )}

        {!aiLoading && !aiResult && (
          <div className="text-gray-500 text-xs">
            AI prediction unavailable &mdash; using local heuristics.
          </div>
        )}
      </div>

      <div className="space-y-1 mb-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Citizen Reports</span>
          <span className="text-white">{bin.citizenReports || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Priority Score</span>
          <span className="text-white">
            {parseFloat(bin.priorityScore || 0).toFixed(1)}
          </span>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-2 mb-3 text-sm">
        {loading ? (
          <span className="text-gray-400">🔮 Fetching AI prediction...</span>
        ) : prediction && prediction.hoursUntilOverflow ? (
          <>
            <div className="text-purple-400 font-semibold">
              🔮 Overflow in ~{prediction.hoursUntilOverflow.toFixed(1)} hrs
              <span className="text-gray-500 text-xs ml-1">
                ({prediction.confidence} confidence)
              </span>
            </div>
            {prediction.recommendation && (
              <div className="text-gray-400 text-xs mt-1 italic">
                {prediction.recommendation}
              </div>
            )}
          </>
        ) : (
          <span className="text-gray-500 text-xs">
            Prediction unavailable
          </span>
        )}
      </div>

      <button
        onClick={() => onOverride(95)}
        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
      >
        🚨 Mark as Critical — Reroute Truck
      </button>
    </div>
  );
}

