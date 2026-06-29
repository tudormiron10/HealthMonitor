import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/application/hooks/useAuth';
import { recordsApi } from '@/infrastructure/api/recordsApi';
import { predictionsApi } from '@/infrastructure/api/predictionsApi';
import type { PredictionRead } from '@/infrastructure/api/predictionsApi';
import type { MedicalRecordRead } from '@/domain/models/MedicalRecord';
import { MarkerTrendChart } from '@/presentation/components/charts/MarkerTrendChart';
import { MedicalAlertsCard } from '@/presentation/pages/patient/components/MedicalAlertsCard';

export const PatientDashboard: React.FC = () => {
  const { profile, role } = useAuth();
  const { t } = useTranslation();
  
  const [records, setRecords] = useState<MedicalRecordRead[]>([]);
  const [latestPrediction, setLatestPrediction] = useState<PredictionRead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'PATIENT') {
      Promise.all([
        recordsApi.getMyRecords().then(setRecords).catch(err => console.error("Error fetching records:", err)),
        predictionsApi.getMyHistory()
          .then(history => setLatestPrediction(history[0] ?? null))
          .catch(err => console.error("Error fetching predictions:", err)),
      ]).finally(() => setLoading(false));
    }
  }, [role]);

  return (
    <div className="space-y-6">
      <div className="bg-brand-light rounded-3xl p-10 md:p-12 shadow-inner border border-brand-dark/5">
        <h2 className="text-4xl font-heading text-brand-dark mb-4">
          {t('patientDashboard.welcome', { name: profile ? profile.first_name : t('patientDashboard.welcomeFallback') })}
        </h2>
        {role === 'PATIENT' && (
          <p className="text-lg text-brand-dark/70">
            {t('patientDashboard.subtitle')}
          </p>
        )}
        <div
          className="mt-5 inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/60 border border-brand-dark/10 shadow-sm"
          aria-label={t('patientDashboard.abeShieldLabel')}
        >
          <Shield className="w-5 h-5 text-accent shrink-0" />
          <div>
            <p className="text-sm font-bold text-brand-dark">{t('patientDashboard.abeStatus')}</p>
            <p className="text-xs text-brand-dark/60">{t('patientDashboard.abeStatusDetail')}</p>
          </div>
        </div>
      </div>

      {role === 'PATIENT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           
           <div className="lg:col-span-2 md:col-span-2 h-96">
             {loading ? (
                <div className="w-full h-full flex items-center justify-center bg-white/50 rounded-xl">{t('patientDashboard.loading')}</div>
             ) : (
                <MarkerTrendChart records={records} />
             )}
           </div>

           <div className="grid grid-cols-1 gap-6">
             <MedicalAlertsCard records={records} prediction={latestPrediction} loading={loading} />
             
             <Link 
                to="/dashboard/patient/add-record"
                className="h-44 rounded-xl border border-brand-dark/10 bg-white/50 hover:bg-white/80 transition-all shadow-sm flex flex-col items-center justify-center cursor-pointer group"
             >
                <span className="text-brand-dark/70 font-heading text-2xl group-hover:text-primary transition-colors mb-2 text-center leading-none">
                  {t('patientDashboard.addRecords')}
                </span>
                <span className="text-brand-dark/50 text-sm">{t('patientDashboard.addRecordsSub')}</span>
             </Link>
           </div>

        </div>
      )}
    </div>
  );
};

