import { useRef, useState } from 'react';
import { MapContainer, TileLayer, Popup, Circle } from 'react-leaflet';
import { Cluster, Submission } from '../types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface ClusterHeatmapProps {
  clusters: Cluster[];
  submissions: Submission[];
  onClusterClick?: (cluster: Cluster) => void;
}

// Priority color gradient
const getPriorityColor = (priority: string, escalated: boolean) => {
  if (escalated) return '#ef4444'; // danger
  switch (priority) {
    case 'urgent':
      return '#ef4444'; // danger/red
    case 'high':
      return '#ff9f43'; // warning/orange
    default:
      return '#0ea5a3'; // accent/teal
  }
};

export default function ClusterHeatmap({
  clusters,
  submissions,
  onClusterClick
}: ClusterHeatmapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Default center (Bangalore, India)
  const defaultCenter: [number, number] = [12.9716, 77.5946];
  const defaultZoom = 12;

  const intentIcons: Record<string, string> = {
    water_outage: '💧',
    electricity_outage: '⚡',
    garbage: '🗑️',
    road: '🛣️',
    sewage: '🚰',
    streetlight: '💡',
    other: '📋',
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return '#10b981';
      case 'assigned':
        return '#3b82f6';
      default:
        return '#ff9f43';
    }
  };

  const [mode, setMode] = useState<'priority' | 'sentiment'>('priority');

  const getMarkerColor = (submission: Submission) => {
    if (mode === 'sentiment') {
      const sentiment = submission.sentiment || 0.5;
      // Green (0.0) -> Red (1.0)
      if (sentiment > 0.7) return '#ef4444'; // Angry
      if (sentiment > 0.4) return '#f59e0b'; // Neutral/Annoyed
      return '#10b981'; // Happy
    }
    return getStatusColor(submission.status);
  };

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-xl border border-slate-700/60 shadow-inner group">
      {/* Mode Toggle */}
      <div className="absolute top-4 right-4 z-[400] bg-slate-800/90 backdrop-blur rounded-lg border border-slate-600 p-1 flex gap-1">
        <button
          onClick={() => setMode('priority')}
          className={`px-3 py-1 text-xs font-bold rounded ${mode === 'priority' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Priority
        </button>
        <button
          onClick={() => setMode('sentiment')}
          className={`px-3 py-1 text-xs font-bold rounded ${mode === 'sentiment' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          😡 Sentiment
        </button>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Submission markers */}
        {submissions
          .filter((s) => s.latitude && s.longitude)
          .map((submission) => (
            <Circle
              key={`sub-${submission.id}`}
              center={[submission.latitude!, submission.longitude!]}
              radius={mode === 'sentiment' ? 60 : 30}
              pathOptions={{
                color: getMarkerColor(submission),
                fillColor: getMarkerColor(submission),
                fillOpacity: mode === 'sentiment' ? 0.6 : 0.8,
                weight: 0
              }}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{intentIcons[submission.intent] || '📋'}</span>
                    <span className="font-semibold">#{submission.id}</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <p><span className="text-slate-500 font-medium">Type:</span> <span className="text-slate-200 capitalize">{submission.intent.replace(/_/g, ' ')}</span></p>
                    <p>
                      <span className="text-slate-500 font-medium">Status:</span>{' '}
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider"
                        style={{ backgroundColor: getStatusColor(submission.status) }}
                      >
                        {submission.status}
                      </span>
                    </p>
                    <p><span className="text-slate-500 font-medium">Priority:</span> <span className="text-slate-200 capitalize">{submission.priority}</span></p>
                    {submission.sentiment !== undefined && (
                      <p><span className="text-slate-500 font-medium">Frustration:</span> <span className="text-slate-200">{(submission.sentiment * 100).toFixed(0)}%</span></p>
                    )}
                  </div>
                </div>
              </Popup>
            </Circle>
          ))}

        {/* Cluster circles (Only show in priority mode to reduce clutter) */}
        {mode === 'priority' && clusters
          .filter((c) => c.center_latitude && c.center_longitude)
          .map((cluster) => {
            const color = getPriorityColor(cluster.priority, cluster.escalated);

            return (
              <Circle
                key={cluster.cluster_id}
                center={[cluster.center_latitude!, cluster.center_longitude!]}
                radius={Math.max(200, cluster.size * 80)} // Scale radius by size
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: cluster.escalated ? 0.4 : 0.25,
                  weight: cluster.escalated ? 3 : 2,
                }}
                eventHandlers={{
                  click: () => {
                    if (onClusterClick) {
                      onClusterClick(cluster);
                    }
                  },
                }}
              >
                <Popup>
                  {/* ... popup content ... */}
                </Popup>
              </Circle>
            );
          })}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-[400] rounded-lg border border-slate-600/80 bg-slate-800/95 p-3 text-xs backdrop-blur-md">
        <div className="mb-2 font-semibold text-white">Legend ({mode})</div>
        <div className="space-y-1.5 text-slate-300">
          {mode === 'priority' ? (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#ef4444] shadow-lg shadow-rose-500/30"></div>
                <span>Escalated / Urgent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#f59e0b] shadow-lg shadow-amber-500/30"></div>
                <span>High Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#06b6d4] shadow-lg shadow-cyan-500/30"></div>
                <span>Normal</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#ef4444] shadow-lg shadow-rose-500/30"></div>
                <span>Anger / Frustration</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#f59e0b] shadow-lg shadow-amber-500/30"></div>
                <span>Neutral / Annoyed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#10b981] shadow-lg shadow-emerald-500/30"></div>
                <span>Positive / Calm</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
