'use client';
import { useState, useEffect } from 'react';

export default function BinPopup({ bin, onClose, onOverride }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

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
          <h3 className="text-white font-bold text-lg">{bin.name}</h3>
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

