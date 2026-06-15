import React from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import type { MedicalRecordRead } from '@/domain/models/MedicalRecord';
import { formatDate } from '@/application/utils/formatDate';

interface CompareSelectorsProps {
  records: MedicalRecordRead[];
  recordAId: string;
  recordBId: string;
  setRecordAId: (id: string) => void;
  setRecordBId: (id: string) => void;
}

export const CompareSelectors: React.FC<CompareSelectorsProps> = ({
  records,
  recordAId,
  recordBId,
  setRecordAId,
  setRecordBId
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="bg-white/80 p-6 rounded-3xl shadow-sm border border-brand-light/50 backdrop-blur-sm space-y-6">
      <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-brand-dark/80 font-medium leading-relaxed">
          {t('comparePage.infoText1')}
          <strong className="text-primary">{t('comparePage.infoTextBold')}</strong>
          {t('comparePage.infoText2')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-brand-dark/60 uppercase tracking-widest mb-2">
            {t('comparePage.selectRecordA')}
          </label>
          <select 
            value={recordAId}
            onChange={(e) => setRecordAId(e.target.value)}
            className="w-full p-3 rounded-xl border border-brand-dark/10 bg-white text-brand-dark focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          >
            {records.map(r => (
              <option key={`a-${r.id}`} value={r.id}>
                {formatDate(r.record_date, i18n.language)} · {t('comparePage.uploadedAt', { date: formatDate(r.created_at, i18n.language, 'dayMonth') })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-brand-dark/60 uppercase tracking-widest mb-2">
            {t('comparePage.selectRecordB')}
          </label>
          <select 
            value={recordBId}
            onChange={(e) => setRecordBId(e.target.value)}
            className="w-full p-3 rounded-xl border border-brand-dark/10 bg-white text-brand-dark focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          >
            {records.map(r => (
              <option key={`b-${r.id}`} value={r.id}>
                {formatDate(r.record_date, i18n.language)} · {t('comparePage.uploadedAt', { date: formatDate(r.created_at, i18n.language, 'dayMonth') })}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
