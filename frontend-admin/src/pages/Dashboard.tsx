import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeatmapData, Cluster } from '../types';
import api from '../utils/api';
import Header from '../components/Header';
import ClusterHeatmap from '../components/ClusterHeatmap';
import ClusterDrawer from '../components/ClusterDrawer';
import ClustersList from '../components/ClustersList';
import SubmissionsTable from '../components/SubmissionsTable';
import DispatchModal from '../components/DispatchModal';
import { ToastContainer, useToasts } from '../components/Toast';
import SettingsPanel from '../components/SettingsPanel';
import SLADashboard from '../components/SLADashboard';
import AuditViewer from '../components/AuditViewer';
import SimulationPanel from '../components/SimulationPanel';
import LiveFeedWidget from '../components/LiveFeedWidget';
import PredictivePanel from '../components/PredictivePanel';

export default function Dashboard() {
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<number[]>([]);
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClusteringRunning, setIsClusteringRunning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Drawer state
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modal state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);

  const navigate = useNavigate();
  const { toasts, dismissToast, success, error, info } = useToasts();

  // Real KPIs from metrics API
  const [metrics, setMetrics] = useState<{
    submissions_24h?: number;
    active_clusters?: number;
    avg_resolution_time?: string;
    high_priority_queue?: number;
  } | null>(null);

  // Emergency Mode State
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);


  const kpiData = {
    totalSubmissions: metrics?.submissions_24h ?? heatmapData?.submissions?.length ?? 0,
    activeClusters: metrics?.active_clusters ?? heatmapData?.clusters?.length ?? 0,
    avgResolutionTime: metrics?.avg_resolution_time ?? '45 min',
    highPriorityQueue: metrics?.high_priority_queue ?? (heatmapData?.clusters || []).filter(c => c.priority === 'high' || c.escalated).length ?? 0,
  };

  useEffect(() => {
    if (!localStorage.getItem('admin_authenticated')) {
      navigate('/login');
      return;
    }
    loadData();
    const interval = setInterval(loadData, 5000);

    // Initial emergency check
    api.get('/emergency/status').then(r => {
      if (r.data) setIsEmergencyMode(!!r.data.active);
    }).catch(console.error);

    return () => clearInterval(interval);
  }, [navigate]);

  const loadData = async () => {
    try {
      const [clustersRes, metricsRes] = await Promise.all([
        api.get<HeatmapData>('/admin/clusters', { params: { password: 'admin123' } }),
        api.get('/admin/metrics', { params: { password: 'admin123' } }).catch(() => ({ data: null })),
      ]);
      setHeatmapData(clustersRes.data);
      if (metricsRes?.data) setMetrics(metricsRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
      if (!heatmapData) setHeatmapData({ clusters: [], submissions: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleRunClustering = async () => {
    setIsClusteringRunning(true);
    try {
      await api.post('/admin/cluster-trigger', null, {
        params: { password: 'admin123' },
      });
      await loadData();
      success('Clustering Complete', 'Analysis detected new patterns.');
    } catch (err) {
      console.error('Error triggering clustering:', err);
      error('Clustering Failed', 'Could not complete analysis.');
    } finally {
      setIsClusteringRunning(false);
    }
  };

  const handleOpenDispatch = () => {
    if (selectedSubmissionIds.length === 0 && selectedClusterIds.length === 0) {
      info('Select Items', 'Please select submissions or clusters first.');
      return;
    }
    setIsDispatchModalOpen(true);
  };

  const handleConfirmDispatch = async (_crewId: string, eta: number) => {
    // Get all submission IDs (from direct selection + selected clusters)
    let allSubmissionIds = [...selectedSubmissionIds];

    if (selectedClusterIds.length > 0 && heatmapData) {
      const clusterSubmissionIds = heatmapData.clusters
        .filter(c => selectedClusterIds.includes(c.cluster_id))
        .flatMap(c => c.submission_ids || []);
      allSubmissionIds = [...new Set([...allSubmissionIds, ...clusterSubmissionIds])];
    }

    if (allSubmissionIds.length === 0) {
      error('No Submissions', 'No submissions to dispatch.');
      return;
    }

    try {
      await api.post(
        '/admin/simulate-update',
        {
          submission_ids: allSubmissionIds,
          status: 'assigned',
          priority: 'high',
        },
        { params: { password: 'admin123' } }
      );

      await loadData();
      setSelectedSubmissionIds([]);
      setSelectedClusterIds([]);
      setIsDispatchModalOpen(false);

      success(
        'Dispatch Successful',
        `${allSubmissionIds.length} submissions assigned to crew. ETA: ${eta} min.`
      );
    } catch (err) {
      console.error('Error dispatching:', err);
      error('Dispatch Failed', 'Could not update submissions.');
    }
  };

  const handleSeedDemo = async () => {
    info('Seeding Demo', 'Creating 200 submissions + hot clusters...');
    try {
      await api.post('/admin/seed-demo', null, { params: { password: 'admin123' } });
      await loadData();
      success('Demo Seeded', '200 submissions, 2 hot clusters, and crews created.');
    } catch (err) {
      console.error('Seed error:', err);
      error('Seed Failed', 'Could not seed demo data. Is the backend running?');
    }
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleOpenSimulation = () => {
    setIsSimulationOpen(true);
  };

  const handleClusterClick = (cluster: Cluster) => {
    setSelectedCluster(cluster);
    setIsDrawerOpen(true);
  };

  const handleClusterSelect = (clusterId: string, selected: boolean) => {
    if (selected) {
      setSelectedClusterIds(prev => [...prev, clusterId]);
    } else {
      setSelectedClusterIds(prev => prev.filter(id => id !== clusterId));
    }
  };

  const handleSelectAllClusters = (selected: boolean) => {
    if (selected && heatmapData) {
      setSelectedClusterIds(heatmapData.clusters.map(c => c.cluster_id));
    } else {
      setSelectedClusterIds([]);
    }
  };

  const handleAssignCrew = (clusterId: string) => {
    // Pre-select this cluster and open dispatch modal
    if (!selectedClusterIds.includes(clusterId)) {
      setSelectedClusterIds([clusterId]);
    }
    setIsDrawerOpen(false);
    setIsDispatchModalOpen(true);
  };

  const handleMarkResolved = async (clusterId: string) => {
    const cluster = heatmapData?.clusters.find(c => c.cluster_id === clusterId);
    if (!cluster) return;

    try {
      await api.post(
        '/admin/simulate-update',
        {
          submission_ids: cluster.submission_ids || [],
          status: 'resolved',
        },
        { params: { password: 'admin123' } }
      );

      await loadData();
      setIsDrawerOpen(false);
      success('Cluster Resolved', `Cluster ${clusterId} marked as resolved.`);
    } catch (err) {
      error('Failed', 'Could not mark cluster as resolved.');
    }
  };

  const handleExportCSV = (clusterId: string) => {
    const cluster = heatmapData?.clusters.find(c => c.cluster_id === clusterId);
    if (!cluster) return;

    // Generate simple CSV
    const csv = [
      'Cluster ID,Intent,Size,Priority,Escalated',
      `${cluster.cluster_id},${cluster.intent},${cluster.size},${cluster.priority},${cluster.escalated}`,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cluster-${clusterId}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    success('Exported', 'CSV file downloaded.');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-cyan-500/30 border-t-cyan-400"></div>
          <p className="text-xl text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }


  const handleToggleEmergency = async () => {
    try {
      const newState = !isEmergencyMode;
      await api.post('/emergency/toggle', {
        active: newState,
        type: newState ? 'flood' : null,
        message: newState ? 'Emergency Alert Declared' : null
      });
      setIsEmergencyMode(newState);
      if (newState) {
        error('DISASTER MODE ACTIVATED', 'Emergency protocols initiated. All non-critical systems suspended.');
      } else {
        success('Emergency Stand Down', 'System returned to normal operations.');
      }
    } catch (e) {
      console.error(e);
      error('Failed to toggle emergency mode');
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-1000 ${isEmergencyMode ? 'bg-red-950' : 'bg-slate-900'}`}>
      {/* Header */}
      <Header
        kpiData={kpiData}
        onRunClustering={handleRunClustering}
        onOpenDispatch={handleOpenDispatch}
        onSeedDemo={handleSeedDemo}
        onOpenSimulation={handleOpenSimulation}
        onOpenSettings={handleOpenSettings}
        isClusteringRunning={isClusteringRunning}
        onToggleEmergency={handleToggleEmergency}
        isEmergencyMode={isEmergencyMode}
      />

      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto">
        {/* Escalation Alerts */}
        {heatmapData?.clusters.some(c => c.escalated) && (
          <div className="mb-6 rounded-xl border border-rose-500/50 bg-rose-500/10 p-4">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-rose-400">
              ⚠️ ESCALATION ALERT
            </h2>
            <p className="text-slate-300">
              {heatmapData.clusters.filter(c => c.escalated).length} cluster(s) require immediate attention.
            </p>
          </div>
        )}

        {/* Heatmap Section */}
        <div className="mb-6">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-white">📍 Cluster Heatmap</h2>
            {heatmapData && (
              <ClusterHeatmap
                clusters={heatmapData.clusters}
                submissions={heatmapData.submissions}
                onClusterClick={handleClusterClick}
              />
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* Clusters List */}
          <div>
            {heatmapData && (
              <ClustersList
                clusters={heatmapData.clusters}
                selectedClusterIds={selectedClusterIds}
                onSelectCluster={handleClusterSelect}
                onSelectAll={handleSelectAllClusters}
                onClusterClick={handleClusterClick}
                onBulkDispatch={handleOpenDispatch}
              />
            )}
          </div>

          {/* Submissions Table */}
          <div>
            {heatmapData && (
              <SubmissionsTable
                submissions={heatmapData.submissions}
                onSelect={setSelectedSubmissionIds}
                selectedIds={selectedSubmissionIds}
              />
            )}
          </div>
        </div>


        // ... (previous imports)

        // ... (inside Dashboard component)

        {/* New Hyper-Scale Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <div className="xl:col-span-2 h-[400px]">
            <LiveFeedWidget />
          </div>
          <div className="h-[400px]">
            <PredictivePanel />
          </div>
        </div>

        {/* SLA & Audit Section */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">📊 Operations Dashboard</h2>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              {showAdvanced ? '▲ Hide Audit Log' : '▼ Show Audit Log'}
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SLADashboard onClusterSelect={(clusterId) => {
              const cluster = heatmapData?.clusters.find(c => c.cluster_id === clusterId);
              if (cluster) {
                handleClusterClick(cluster);
              }
            }} />

            {showAdvanced && <AuditViewer limit={20} />}
          </div>
        </div>
      </main>

      {/* Cluster Drawer */}
      <ClusterDrawer
        cluster={selectedCluster}
        submissions={heatmapData?.submissions || []}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onAssignCrew={handleAssignCrew}
        onMarkResolved={handleMarkResolved}
        onExportCSV={handleExportCSV}
      />

      {/* Dispatch Modal */}
      <DispatchModal
        isOpen={isDispatchModalOpen}
        selectedCount={
          selectedSubmissionIds.length +
          (selectedClusterIds.length > 0 && heatmapData
            ? heatmapData.clusters
              .filter(c => selectedClusterIds.includes(c.cluster_id))
              .reduce((sum, c) => sum + (c.submission_ids?.length || 0), 0)
            : 0)
        }
        onClose={() => setIsDispatchModalOpen(false)}
        onConfirm={handleConfirmDispatch}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Simulation Panel */}
      <SimulationPanel
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
