import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, Loader2, MessageSquare } from 'lucide-react';
import type { PatientCard } from '@/domain/models/Relation';
import { chatApi } from '@/infrastructure/api/chatApi';
import { formatDate } from '@/application/utils/formatDate';

interface Props {
  patients: PatientCard[];
  loading: boolean;
  hideHeader?: boolean;
  emptyMessage?: string;
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function healthScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

export const PatientTable: React.FC<Props> = ({ patients, loading, hideHeader = false, emptyMessage }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [chatting, setChatting] = useState<Record<string, boolean>>({});

  const handleChat = async (patientUserId: string) => {
    setChatting((prev) => ({ ...prev, [patientUserId]: true }));
    try {
      const conv = await chatApi.openOrCreateConversation(patientUserId);
      navigate(`/dashboard/messages/${conv.id}`);
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setChatting((prev) => ({ ...prev, [patientUserId]: false }));
    }
  };

  const columns = [
    t('specialistDashboard.patientTable.name'),
    t('specialistDashboard.patientTable.sex'),
    t('specialistDashboard.patientTable.age'),
    t('specialistDashboard.patientTable.healthScore'),
    t('specialistDashboard.patientTable.testDate'),
    t('specialistDashboard.patientTable.redFlags'),
    t('specialistDashboard.patientTable.actions'),
  ];

  return (
    <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm overflow-hidden">
      {!hideHeader && (
        <div className="px-6 py-4 border-b border-brand-dark/5">
          <h3 className="font-heading text-xl text-brand-dark">
            {t('specialistDashboard.patientTable.title')}
          </h3>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-dark/5 bg-brand-light/50">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-brand-dark/40 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-brand-dark/5">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-5 bg-brand-dark/5 rounded-lg animate-pulse" />
                  </td>
                </tr>
              ))}

            {!loading && patients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-brand-dark/40 font-heading text-lg">
                  {emptyMessage ?? t('specialistDashboard.patientTable.empty')}
                </td>
              </tr>
            )}

            {!loading &&
              patients.map((patient) => (
                <tr
                  key={patient.user_id}
                  className="hover:bg-brand-light/30 transition-colors"
                >
                  <td className="px-4 py-3 text-center font-medium text-brand-dark whitespace-nowrap">
                    {patient.first_name} {patient.last_name}
                  </td>
                  <td className="px-4 py-3 text-center text-brand-dark/60">
                    {patient.sex === 1
                      ? t('specialistDashboard.patientTable.sexMale')
                      : t('specialistDashboard.patientTable.sexFemale')}
                  </td>
                  <td className="px-4 py-3 text-center text-brand-dark/70">
                    {calculateAge(patient.date_of_birth)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {patient.health_score !== null ? (
                      <span className={`font-heading text-lg leading-none ${healthScoreColor(patient.health_score)}`}>
                        {patient.health_score}
                      </span>
                    ) : (
                      <span className="text-brand-dark/30">{t('specialistDashboard.patientTable.na')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-brand-dark/60 whitespace-nowrap">
                    {patient.last_update ? (
                      <div className="flex flex-col items-center leading-tight">
                        <span>{formatDate(patient.last_update, i18n.language, 'short')}</span>
                        {patient.uploaded_at && (
                          <span className="text-[10px] text-brand-dark/35">
                            {t('specialistDashboard.patientTable.uploadedAt', { date: formatDate(patient.uploaded_at, i18n.language, 'short') })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-brand-dark/30">{t('specialistDashboard.patientTable.na')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {patient.red_flags.length === 0 ? (
                      <span className="text-brand-dark/25">—</span>
                    ) : (
                      <div className="flex flex-wrap justify-center gap-1">
                        {patient.red_flags.map((flag) => (
                          <span
                            key={flag}
                            className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200"
                          >
                            {t(`redFlags.${flag}`, { defaultValue: flag })}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        to={`/dashboard/specialist/patients/${patient.user_id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('specialistDashboard.patientTable.view')}</span>
                      </Link>
                      <button
                        onClick={() => handleChat(patient.user_id)}
                        disabled={chatting[patient.user_id] ?? false}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        aria-label={t('specialistDashboard.patientTable.chat')}
                      >
                        {chatting[patient.user_id] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
