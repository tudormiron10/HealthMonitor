import React from 'react';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MedicalRecordRead } from '@/domain/models/MedicalRecord';
import { MEDICAL_STANDARDS, getTrendColor } from '@/application/utils/medicalStandards';
import { formatDate } from '@/application/utils/formatDate';

interface RawMarkersTableProps {
  recordA: MedicalRecordRead;
  recordB: MedicalRecordRead;
  markerKeys: string[];
  markersAccess?: Record<string, 'DECRYPTED' | 'LOCKED'>;
  onRequestAccess?: (marker: string) => void;
}

export const RawMarkersTable: React.FC<RawMarkersTableProps> = ({ recordA, recordB, markerKeys, markersAccess, onRequestAccess }) => {
  const { t, i18n } = useTranslation();

  const aIsNewer =
    new Date(recordA.record_date).getTime() > new Date(recordB.record_date).getTime() ||
    (new Date(recordA.record_date).getTime() === new Date(recordB.record_date).getTime() &&
      new Date(recordA.created_at).getTime() >= new Date(recordB.created_at).getTime());

  return (
    <div className="bg-white/80 p-6 sm:p-8 rounded-3xl shadow-sm border border-brand-light/50 backdrop-blur-sm overflow-hidden">
      <h3 className="text-2xl font-heading text-brand-dark mb-6">{t('comparePage.markersComparison')}</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-center align-middle border-collapse">
          <thead>
            <tr className="border-b-2 border-brand-dark/10">
              <th className="p-3 text-sm font-bold text-brand-dark/50 uppercase tracking-widest">{t('comparePage.marker')}</th>
              <th className="p-3 text-sm font-bold text-brand-dark/50 uppercase tracking-widest">
                <div className="flex flex-col">
                  <span>{t('comparePage.recordA')} ({formatDate(recordA.record_date, i18n.language)})</span>
                  <span className="text-[10px] font-medium normal-case tracking-normal text-brand-dark/35">
                    {t('comparePage.uploadedAt', { date: formatDate(recordA.created_at, i18n.language, 'short') })}
                  </span>
                </div>
              </th>
              <th className="p-3 text-sm font-bold text-brand-dark/50 uppercase tracking-widest">
                <div className="flex flex-col">
                  <span>{t('comparePage.recordB')} ({formatDate(recordB.record_date, i18n.language)})</span>
                  <span className="text-[10px] font-medium normal-case tracking-normal text-brand-dark/35">
                    {t('comparePage.uploadedAt', { date: formatDate(recordB.created_at, i18n.language, 'short') })}
                  </span>
                </div>
              </th>
              <th className="p-3 text-sm font-bold text-brand-dark/50 uppercase tracking-widest">{t('comparePage.difference')}</th>
              <th className="p-3 text-sm font-bold text-brand-dark/50 uppercase tracking-widest">{t('comparePage.standard')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-dark/5">
            {markerKeys.sort().map(key => {
              const valA = ((recordA.raw_markers || {}) as any)[key] as number | undefined;
              const valB = ((recordB.raw_markers || {}) as any)[key] as number | undefined;
              const isLocked = markersAccess?.[key] === 'LOCKED';
              const standardLabel = MEDICAL_STANDARDS[key]?.label || '-';

              const lockIcon = isLocked
                ? onRequestAccess
                  ? (
                    <button
                      type="button"
                      onClick={() => onRequestAccess(key)}
                      title={t('records.markersLockedHint')}
                      className="inline-flex items-center justify-center text-secondary/70 hover:text-secondary transition-colors"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  ) : (
                    <span title={t('records.markersLockedHint')} className="inline-flex items-center justify-center text-secondary/40">
                      <Lock className="w-4 h-4" />
                    </span>
                  )
                : null;

              let diffDisplay = <span className="text-brand-dark/30">-</span>;

              if (!isLocked && typeof valB === 'number' && typeof valA === 'number') {
                // Always compare newer − older so green means clinical improvement
                const [newerVal, olderVal] = aIsNewer ? [valA, valB] : [valB, valA];
                const diffInfo = getTrendColor(newerVal, olderVal, key);
                const absDiff = Math.abs(newerVal - olderVal).toFixed(2);
                diffDisplay = (
                  <span className={`flex items-center justify-center gap-1.5 ${diffInfo.color}`}>
                    {diffInfo.symbol === '=' ? (
                      <span>= {absDiff}</span>
                    ) : (
                      <>
                        <span className="font-sans text-base leading-none">{diffInfo.symbol}</span>
                        <span>{absDiff}</span>
                      </>
                    )}
                  </span>
                );
              }

              return (
                <tr key={key} className="hover:bg-brand-light/10 transition-colors group">
                  <td className="p-3 font-mono text-sm text-brand-dark font-bold uppercase tracking-wider">{key.replace(/_/g, ' ')}</td>
                  <td className="p-3 font-medium text-brand-dark/80">
                    {isLocked ? lockIcon : (typeof valA === 'number' ? valA.toFixed(2) : '-')}
                  </td>
                  <td className="p-3 font-medium text-brand-dark/80">
                    {isLocked ? lockIcon : (typeof valB === 'number' ? valB.toFixed(2) : '-')}
                  </td>
                  <td className="p-3 font-bold font-mono text-sm">{diffDisplay}</td>
                  <td className="p-3 font-bold text-brand-dark/70 bg-brand-light/10 group-hover:bg-brand-light/30 transition-colors">{standardLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-brand-dark/10">
        <h4 className="text-sm font-bold text-brand-dark/50 uppercase tracking-widest mb-4">
          {t('comparePage.legendTitle')}
        </h4>
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-8">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
            <span className="text-sm font-medium text-brand-dark/80">{t('comparePage.legendPositive')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"></span>
            <span className="text-sm font-medium text-brand-dark/80">{t('comparePage.legendNegative')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]"></span>
            <span className="text-sm font-medium text-brand-dark/80">{t('comparePage.legendNeutral')}</span>
          </div>
        </div>
        <p className="text-xs text-brand-dark/40 mt-4 font-medium italic">
          {t('comparePage.legendNote')}
        </p>
      </div>
    </div>
  );
};
