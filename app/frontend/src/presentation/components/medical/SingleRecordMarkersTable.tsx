import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { MEDICAL_STANDARDS } from '@/application/utils/medicalStandards';
import { MARKER_GROUPS } from '@/application/utils/markerGroups';
import type { MedicalRecordRead } from '@/domain/models/MedicalRecord';

// Single-value thresholds. Sex-specific markers use the stricter bound
// so we never under-flag without knowing the patient's sex.
const THRESHOLDS: Record<string, (v: number) => boolean> = {
  hba1c:               (v) => v < 5.7,
  fasting_glucose:     (v) => v < 100,
  ldl:                 (v) => v < 100,
  total_cholesterol:   (v) => v < 200,
  triglycerides:       (v) => v < 150,
  hdl:                 (v) => v >= 40,
  systolic_bp:         (v) => v < 130,
  diastolic_bp:        (v) => v < 85,
  bmi:                 (v) => v >= 18.5 && v <= 24.9,
  waist_circumference: (v) => v < 88,
  hemoglobin:          (v) => v >= 12.0,
  mcv:                 (v) => v >= 80 && v <= 100,
  ferritin:            (v) => v >= 15 && v <= 200,
  alt:                 (v) => v < 40,
  ast:                 (v) => v < 40,
  ggt:                 (v) => v < 60,
  crp:                 (v) => v < 3.0,
  creatinine:          (v) => v < 1.0,
  urea:                (v) => v < 50,
  uacr:                (v) => v < 30,
  uric_acid:           (v) => v < 6.0,
  vitamin_d:           (v) => v >= 30,
  folate:              (v) => v >= 4.0,
  smoker_status:       (v) => v === 0,
};

const getStatus = (marker: string, value: number): 'ok' | 'flag' | 'neutral' => {
  const std = MEDICAL_STANDARDS[marker];
  if (!std || std.trend === 'neutral') return 'neutral';
  const fn = THRESHOLDS[marker];
  if (!fn) return 'neutral';
  return fn(value) ? 'ok' : 'flag';
};

const formatValue = (raw: unknown): string => {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) ? raw.toString() : raw.toFixed(1);
  }
  return String(raw);
};

interface Props {
  record: MedicalRecordRead;
  onRequestAccess?: (marker: string) => void;
}

export const SingleRecordMarkersTable: React.FC<Props> = ({ record, onRequestAccess }) => {
  const { t } = useTranslation();
  const markers = (record.raw_markers as Record<string, unknown>) ?? {};
  const access = record.markers_access ?? {};

  const hasValue = (m: string) => markers[m] !== undefined && markers[m] !== null;
  const isLocked = (m: string) => access[m] === 'LOCKED' && !hasValue(m);
  const isPresent = (m: string) => hasValue(m) || isLocked(m);

  const anyMarker = Object.values(MARKER_GROUPS).flat().some(isPresent);

  if (!anyMarker) {
    return (
      <div className="flex items-center justify-center py-20 rounded-2xl border border-brand-dark/10 bg-white/50">
        <p className="text-brand-dark/40 font-medium text-center px-8">
          {t('patientHistory.noMarkersInRecord')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(MARKER_GROUPS).map(([groupKey, groupMarkers]) => {
        const present = groupMarkers.filter(isPresent);
        if (present.length === 0) return null;

        return (
          <div key={groupKey} className="bg-white rounded-2xl border border-brand-dark/10 overflow-hidden">
            {/* Group header */}
            <div className="px-5 py-3 bg-brand-dark/3 border-b border-brand-dark/10">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-dark/70 font-heading">
                {t(`markerGroups.${groupKey}`)}
              </span>
            </div>

            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[42%]" />
                <col className="w-[13%]" />
                <col className="w-[30%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-brand-dark/5">
                  <th className="text-left px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-brand-dark/40 font-heading">
                    {t('patientHistory.colMarker')}
                  </th>
                  <th className="text-right px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-brand-dark/40 font-heading">
                    {t('patientHistory.colValue')}
                  </th>
                  <th className="text-right px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-brand-dark/40 font-heading hidden sm:table-cell">
                    {t('patientHistory.colReference')}
                  </th>
                  <th className="text-right px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-brand-dark/40 font-heading">
                    {t('patientHistory.colStatus')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dark/5">
                {present.map((marker) => {
                  const std = MEDICAL_STANDARDS[marker];

                  if (isLocked(marker)) {
                    return (
                      <tr key={marker} className="hover:bg-brand-dark/2 transition-colors">
                        <td className="px-5 py-3 text-brand-dark/50 font-medium truncate">
                          {t(`markers.${marker}`)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {onRequestAccess ? (
                            <button
                              type="button"
                              onClick={() => onRequestAccess(marker)}
                              title={t('records.markersLockedHint')}
                              className="inline-flex items-center justify-center text-secondary/70 hover:text-secondary transition-colors"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          ) : (
                            <span
                              title={t('records.markersLockedHint')}
                              className="inline-flex items-center justify-center text-secondary/40"
                            >
                              <Lock className="w-4 h-4" />
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-brand-dark/50 hidden sm:table-cell text-xs">
                          {std?.label ?? '—'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end">
                            <span className="text-brand-dark/30 text-[10px] font-mono">—</span>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const rawVal = markers[marker];
                  const numVal = Number(rawVal);
                  const status = getStatus(marker, numVal);

                  return (
                    <tr key={marker} className="hover:bg-brand-dark/2 transition-colors">
                      <td className="px-5 py-3 text-brand-dark font-medium truncate">
                        {t(`markers.${marker}`)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-brand-dark font-semibold">
                        {formatValue(rawVal)}
                      </td>
                      <td className="px-5 py-3 text-right text-brand-dark/50 hidden sm:table-cell text-xs">
                        {std?.label ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          {status === 'ok' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700">
                              {t('patientHistory.statusOk')}
                            </span>
                          )}
                          {status === 'flag' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-rose-50 text-rose-700">
                              {t('patientHistory.statusFlag')}
                            </span>
                          )}
                          {status === 'neutral' && (
                            <span className="text-brand-dark/30 text-[10px] font-mono">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};
