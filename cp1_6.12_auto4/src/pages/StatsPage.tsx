import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import StatsPanel from '@/components/StatsPanel';
import { ArrowLeft } from 'lucide-react';

export default function StatsPage() {
  const navigate = useNavigate();
  const { distribution, comparison, cumulative, loadDistribution, loadComparison, loadCumulative } =
    useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([loadDistribution(), loadComparison(), loadCumulative()]);
      setLoading(false);
    }
    loadData();
  }, [loadDistribution, loadComparison, loadCumulative]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-16 bg-primary border-b border-primary-dark flex items-center px-4 sm:px-6 gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-white p-2 hover:bg-primary-light rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-white">Statistics</h1>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            <p className="text-gray-500">Loading statistics...</p>
          </div>
        ) : (
          <StatsPanel
            distribution={distribution}
            comparison={comparison}
            cumulative={cumulative}
          />
        )}
      </div>
    </div>
  );
}
