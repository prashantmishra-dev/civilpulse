import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  LayoutGrid,
  Clock,
  AlertTriangle,
  Play,
  Rocket,
  Sprout,
  Settings,
  Keyboard,
  TrendingUp,
  Activity,
  Smartphone,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface KPIData {
  totalSubmissions: number;
  activeClusters: number;
  avgResolutionTime: string;
  highPriorityQueue: number;
}

interface HeaderProps {
  kpiData?: KPIData;
  onRunClustering: () => void;
  onOpenDispatch: () => void;
  onSeedDemo: () => void;
  onOpenSimulation: () => void;
  onOpenSettings: () => void;
  isClusteringRunning?: boolean;
  onToggleEmergency: () => void;
  isEmergencyMode: boolean;
}

function KPICard({
  label,
  value,
  icon: Icon,
  trend,
  color,
  sparkData,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
  sparkData?: number[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 backdrop-blur-sm transition-all hover:border-slate-600/80 hover:bg-slate-800/70 min-w-[140px]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-0.5 text-2xl font-bold text-white tabular-nums">{value}</p>
          {trend && (
            <span
              className={`mt-1 inline-flex items-center text-xs font-medium ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-500'
                }`}
            >
              <TrendingUp className="mr-0.5 h-3 w-3" />
              {trend === 'up' ? '+' : trend === 'down' ? '−' : '—'}
            </span>
          )}
        </div>
        <div className="rounded-lg bg-white/5 p-2">
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
      {sparkData && sparkData.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-8 opacity-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData.map((v, i) => ({ v, i }))}>
              <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.3} strokeWidth={1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

export default function Header({
  kpiData = {
    totalSubmissions: 0,
    activeClusters: 0,
    avgResolutionTime: '--',
    highPriorityQueue: 0,
  },
  onRunClustering,
  onOpenDispatch,
  onSeedDemo,
  onOpenSimulation,
  onOpenSettings,
  isClusteringRunning = false,
  onToggleEmergency,
  isEmergencyMode,
}: HeaderProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [liveDot, setLiveDot] = useState(true);

  const submissionSpark = [12, 19, 15, 25, 22, kpiData.totalSubmissions || 28];
  const clusterSpark = [2, 3, 2, 4, 3, kpiData.activeClusters || 4];
  const queueSpark = [5, 4, 6, 8, 7, kpiData.highPriorityQueue || 9];

  useEffect(() => {
    const t = setInterval(() => setLiveDot((d) => !d), 1500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return;
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        onRunClustering();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        onOpenDispatch();
      } else if (e.key === '?') setShowShortcuts((p) => !p);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRunClustering, onOpenDispatch]);

  return (
    <header className="sticky top-0 z-[1100] border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-xl">
      <div className="px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">CivicPulse</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${liveDot ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-slate-500'
                    }`}
                />
                Live Dashboard
              </div>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="hidden lg:flex items-center gap-3">
            <KPICard
              label="Submissions (24h)"
              value={kpiData.totalSubmissions}
              icon={Zap}
              trend="up"
              color="#06b6d4"
              sparkData={submissionSpark}
            />
            <KPICard
              label="Active Clusters"
              value={kpiData.activeClusters}
              icon={LayoutGrid}
              trend={kpiData.activeClusters > 3 ? 'up' : 'neutral'}
              color="#f59e0b"
              sparkData={clusterSpark}
            />
            <KPICard
              label="Avg Resolution"
              value={kpiData.avgResolutionTime}
              icon={Clock}
              color="#10b981"
            />
            <KPICard
              label="High Priority"
              value={kpiData.highPriorityQueue}
              icon={AlertTriangle}
              trend={kpiData.highPriorityQueue > 5 ? 'up' : 'neutral'}
              color="#ef4444"
              sparkData={queueSpark}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRunClustering}
              disabled={isClusteringRunning}
              className="flex items-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:opacity-50"
              title="Run Clustering (C)"
              aria-label="Run Clustering"
            >
              {isClusteringRunning ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Play className="h-4 w-4" />
                  </motion.div>
                  <span className="hidden sm:inline">Running...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span className="hidden sm:inline">Run Clustering</span>
                  <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-xs">C</kbd>
                </>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenDispatch}
              className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
              title="Dispatch (D)"
              aria-label="Dispatch"
            >
              <Rocket className="h-4 w-4" />
              <span className="hidden sm:inline">Dispatch</span>
              <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-xs">D</kbd>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSeedDemo}
              className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700/80"
              title="Seed Demo Data"
              aria-label="Seed Demo"
            >
              <Sprout className="h-4 w-4" />
              <span className="hidden sm:inline">Seed Demo</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenSimulation}
              className="flex items-center gap-2 rounded-lg border border-indigo-500/50 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20"
              title="Simulation Lab"
              aria-label="Simulation Lab"
            >
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Simulate</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowShortcuts((p) => !p)}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              title="Shortcuts (?)"
              aria-label="Keyboard shortcuts"
            >
              <Keyboard className="h-5 w-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenSettings}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleEmergency}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-all shadow-lg ${isEmergencyMode
                ? 'border-red-500 bg-red-600 text-white animate-pulse shadow-red-500/50'
                : 'border-slate-600 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80'
                }`}
            >
              <AlertTriangle className={`h-4 w-4 ${isEmergencyMode ? 'text-white' : 'text-slate-400'}`} />
              {isEmergencyMode ? 'DISASTER MODE ACTIVE' : 'Disaster Mode'}
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-6 top-full z-50 mt-2 rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-2xl"
            role="dialog"
            aria-label="Keyboard Shortcuts"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-white">Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex justify-between gap-8">
                <span>Run Clustering</span>
                <kbd className="rounded bg-slate-700 px-2 py-0.5 font-mono text-xs">C</kbd>
              </div>
              <div className="flex justify-between gap-8">
                <span>Open Dispatch</span>
                <kbd className="rounded bg-slate-700 px-2 py-0.5 font-mono text-xs">D</kbd>
              </div>
              <div className="flex justify-between gap-8">
                <span>Toggle Shortcuts</span>
                <kbd className="rounded bg-slate-700 px-2 py-0.5 font-mono text-xs">?</kbd>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
