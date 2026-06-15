import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft } from 'lucide-react';
import { MarkerTrendChart } from '@/presentation/components/charts/MarkerTrendChart';
import { MedicalTimeline } from '@/presentation/components/medical/MedicalTimeline';
import { SingleRecordMarkersTable } from '@/presentation/components/medical/SingleRecordMarkersTable';
import { RecordDetailDrawer } from './components/RecordDetailDrawer';
import { recordsApi } from '@/infrastructure/api/recordsApi';
import { predictionsApi } from '@/infrastructure/api/predictionsApi';
import type { PredictionRead } from '@/infrastructure/api/predictionsApi';
import type { MedicalRecordRead } from '@/domain/models/MedicalRecord';
import { formatDate } from '@/application/utils/formatDate';

const TABS = ['predictions', 'markers'] as const;
type Tab = (typeof TABS)[number];

export const PatientHistoryPage = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords] = useState<MedicalRecordRead[]>([]);
  const [predictions, setPredictions] = useState<PredictionRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [drawerRecord, setDrawerRecord] = useState<MedicalRecordRead | null>(null);

  const rawTab = searchParams.get('tab');
  const activeTab: Tab = rawTab === 'markers' ? 'markers' : 'predictions';

  const switchTab = (tab: Tab) => {
    setSearchParams(tab === 'predictions' ? {} : { tab });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recs, preds] = await Promise.all([
          recordsApi.getMyRecords(),
          predictionsApi.getMyHistory(),
        ]);
        setRecords(recs);
        setPredictions(preds);
        if (recs.length > 0) {
          const sorted = [...recs].sort((a, b) => {
            const byDate = new Date(b.record_date).getTime() - new Date(a.record_date).getTime();
            return byDate !== 0 ? byDate : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          setSelectedRecordId(sorted[0].id);
        }
      } catch (err) {
        console.error('Error fetching history data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 w-full h-full min-h-100 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-brand-dark/60 font-mono animate-pulse">
          {t('patientHistory.loading')}
        </p>
      </div>
    );
  }

  const sortedRecords = [...records].sort((a, b) => {
    const byDate = new Date(b.record_date).getTime() - new Date(a.record_date).getTime();
    if (byDate !== 0) return byDate;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const selectedRecord = sortedRecords.find((r) => r.id === selectedRecordId) ?? sortedRecords[0];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Link
          to="/dashboard"
          className="p-3 bg-white/50 border border-brand-dark/10 rounded-xl text-brand-dark/60 hover:text-primary hover:bg-white transition-all shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading text-brand-dark">
            {t('patientHistory.title')}
          </h1>
          <p className="text-brand-dark/60 mt-1 font-medium">
            {t('patientHistory.subtitle')}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-brand-dark/5 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => switchTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-widest transition-all ${
              activeTab === tab
                ? 'bg-white text-brand-dark shadow-sm'
                : 'text-brand-dark/50 hover:text-brand-dark/80'
            }`}
          >
            {t(`patientHistory.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}` as any)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'predictions' && (
        <>
          {/* Chart Section */}
          <div className="h-100">
            <MarkerTrendChart records={records} />
          </div>

          {/* Timeline Section */}
          <MedicalTimeline
            records={records}
            predictions={predictions}
            onOpenDrawer={setDrawerRecord}
          />
        </>
      )}

      {activeTab === 'markers' && (
        <>
          {sortedRecords.length === 0 ? (
            <div className="flex items-center justify-center py-20 rounded-2xl border border-brand-dark/10 bg-white/50">
              <p className="text-brand-dark/40 font-medium text-center px-8">
                {t('patientHistory.noRecordsYet')}
              </p>
            </div>
          ) : (
            <>
              {/* Record selector */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold uppercase tracking-widest text-brand-dark/50 font-heading shrink-0">
                  {t('patientHistory.selectRecord')}
                </label>
                <select
                  value={selectedRecordId}
                  onChange={(e) => setSelectedRecordId(e.target.value)}
                  className="flex-1 max-w-xs rounded-xl border border-brand-dark/20 bg-white px-4 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  {sortedRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatDate(r.record_date, i18n.language)}
                      {r.source === 'PDF_PARSED' ? ' — PDF' : ' — Manual'}
                      {` · ${t('patientHistory.uploadedAt', { date: formatDate(r.created_at, i18n.language, 'dayMonth') })}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Markers table vs. clinical standards */}
              {selectedRecord && <SingleRecordMarkersTable record={selectedRecord} />}
            </>
          )}
        </>
      )}
      <RecordDetailDrawer
        record={drawerRecord}
        isOpen={drawerRecord !== null}
        onClose={() => setDrawerRecord(null)}
      />
    </div>
  );
};
