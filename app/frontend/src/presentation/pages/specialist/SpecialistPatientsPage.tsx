import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { specialistApi } from '@/infrastructure/api/specialistApi';
import type { PatientCard } from '@/domain/models/Relation';
import { PatientTable } from './components/PatientTable';

export const SpecialistPatientsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [patients, setPatients] = useState<PatientCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState('');
  const [alertsOnly, setAlertsOnly] = useState(searchParams.get('alerts') === 'true');

  useEffect(() => {
    setAlertsOnly(searchParams.get('alerts') === 'true');
  }, [searchParams]);

  useEffect(() => {
    specialistApi.getMyPatients()
      .then(setPatients)
      .catch((err) => console.error('Error loading patients:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter((p) => {
    if (alertsOnly && p.red_flags.length === 0) return false;
    if (nameFilter.trim()) {
      const q = nameFilter.toLowerCase();
      return (
        p.first_name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-heading text-brand-dark">
          {t('specialistPatients.title')}
        </h1>
        <p className="text-brand-dark/60 mt-1 font-medium">
          {t('specialistPatients.subtitle')}
        </p>
      </div>

      {/* Search + filter toggle */}
      <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/30" />
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder={t('specialistPatients.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-dark/15 bg-white/70 text-brand-dark placeholder:text-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-accent/30 text-sm"
          />
        </div>
        <div className="flex rounded-xl border border-brand-dark/15 overflow-hidden shrink-0">
          <button
            onClick={() => setAlertsOnly(false)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
              !alertsOnly
                ? 'bg-primary text-white'
                : 'bg-white/70 text-brand-dark/60 hover:bg-white'
            }`}
          >
            {t('specialistPatients.filterAll')}
          </button>
          <button
            onClick={() => setAlertsOnly(true)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
              alertsOnly
                ? 'bg-secondary text-white'
                : 'bg-white/70 text-brand-dark/60 hover:bg-white'
            }`}
          >
            {t('specialistPatients.filterAlerts')}
          </button>
        </div>
      </div>

      {/* Patient table — filtered client-side, no extra API call */}
      <PatientTable
        patients={filtered}
        loading={loading}
        hideHeader
        emptyMessage={
          alertsOnly
            ? t('specialistPatients.emptyAlerts')
            : t('specialistPatients.empty')
        }
      />
    </div>
  );
};
