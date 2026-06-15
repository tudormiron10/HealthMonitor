import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, ClipboardList, AlertTriangle, Dumbbell, Eye, User, Check, UtensilsCrossed, X } from 'lucide-react';
import { useAuth } from '@/application/hooks/useAuth';
import { UserRole } from '@/domain/enums/UserRole';
import { useChatContext } from '@/application/hooks/useChatContext';
import { specialistApi } from '@/infrastructure/api/specialistApi';
import { relationsApi } from '@/infrastructure/api/relationsApi';
import type { PatientCard, Relation } from '@/domain/models/Relation';

export const SpecialistHomePage: React.FC = () => {
  const { profile, role } = useAuth();
  const { t } = useTranslation();

  const [patients, setPatients] = useState<PatientCard[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      specialistApi.getMyPatients(),
      specialistApi.getPendingRequests(),
    ])
      .then(([patientsData, requestsData]) => {
        setPatients(patientsData);
        setPendingRequests(requestsData);
      })
      .catch((err) => console.error('Error loading specialist home:', err))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const { latestRelationEvent, clearRelationEvent } = useChatContext();

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (latestRelationEvent) {
      handleRefresh();
      clearRelationEvent();
    }
  }, [latestRelationEvent, handleRefresh, clearRelationEvent]);

  const handleRequestAction = async (relationId: string, action: 'approve' | 'reject') => {
    setProcessing((prev) => ({ ...prev, [relationId]: true }));
    try {
      if (action === 'approve') {
        await relationsApi.approve(relationId);
      } else {
        await relationsApi.reject(relationId);
      }
      handleRefresh();
    } catch (err) {
      console.error(`Error processing request:`, err);
    } finally {
      setProcessing((prev) => ({ ...prev, [relationId]: false }));
    }
  };

  const redFlagCount = patients.filter((p) => p.red_flags.length > 0).length;
  const displayName = profile?.first_name ?? t('specialistDashboard.welcomeFallback');

  const kpiCards = [
    {
      label: t('specialistDashboard.kpi.activePatients'),
      value: patients.length,
      icon: Users,
      color: 'text-accent',
      bg: 'bg-accent/10',
      href: '/dashboard/specialist/patients',
    },
    {
      label: t('specialistDashboard.kpi.pendingRequests'),
      value: pendingRequests.length,
      icon: ClipboardList,
      color: 'text-primary',
      bg: 'bg-primary/10',
      href: '/dashboard/specialist/requests',
    },
    {
      label: t('specialistDashboard.kpi.redFlags'),
      value: redFlagCount,
      icon: AlertTriangle,
      color: 'text-secondary',
      bg: 'bg-secondary/10',
      href: '/dashboard/specialist/patients?alerts=true',
    },
  ] as const;

  const recentPatients = [...patients]
    .sort((a, b) => {
      const aFlagged = a.red_flags.length > 0 ? 1 : 0;
      const bFlagged = b.red_flags.length > 0 ? 1 : 0;
      if (bFlagged !== aFlagged) return bFlagged - aFlagged;
      if (!a.last_update && !b.last_update) return 0;
      if (!a.last_update) return 1;
      if (!b.last_update) return -1;
      return new Date(b.last_update).getTime() - new Date(a.last_update).getTime();
    })
    .slice(0, 5);

  const recentRequests = pendingRequests.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-brand-light rounded-3xl p-10 md:p-12 shadow-inner border border-brand-dark/5">
        <h2 className="text-4xl font-heading text-brand-dark mb-2">
          {t('specialistDashboard.welcome', { name: displayName })}
        </h2>
        <p className="text-lg text-brand-dark/70">
          {t('specialistDashboard.subtitle')}
        </p>
      </div>

      {/* KPI strip — each card navigates to the relevant page */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link
            key={label}
            to={href}
            className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm p-6 flex items-center gap-4 hover:bg-white/80 hover:shadow-md transition-all group"
          >
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest mb-1">
                {label}
              </p>
              {loading ? (
                <div className="h-8 w-10 bg-brand-dark/10 rounded-lg animate-pulse" />
              ) : (
                <p className="text-3xl font-heading text-brand-dark leading-none group-hover:text-accent transition-colors">
                  {value}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Role-specific promo card */}
      {role === UserRole.NUTRITIONIST && (
        <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm p-6 flex items-center gap-6">
          <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-7 h-7 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-lg text-brand-dark mb-1">{t('specialistHome.mealPlanCard.title')}</h3>
            <p className="text-sm text-brand-dark/60">{t('specialistHome.mealPlanCard.description')}</p>
          </div>
          <Link
            to="/dashboard/messages"
            className="shrink-0 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-bold uppercase tracking-widest hover:bg-accent/80 transition-colors"
          >
            {t('specialistHome.mealPlanCard.cta')}
          </Link>
        </div>
      )}
      {role === UserRole.COACH && (
        <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm p-6 flex items-center gap-6">
          <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Dumbbell className="w-7 h-7 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-lg text-brand-dark mb-1">{t('specialistHome.workoutPlanCard.title')}</h3>
            <p className="text-sm text-brand-dark/60">{t('specialistHome.workoutPlanCard.description')}</p>
          </div>
          <Link
            to="/dashboard/messages"
            className="shrink-0 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-bold uppercase tracking-widest hover:bg-accent/80 transition-colors"
          >
            {t('specialistHome.workoutPlanCard.cta')}
          </Link>
        </div>
      )}

      {/* Recent Patients */}
      <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-dark/5 flex items-center justify-between">
          <h3 className="font-heading text-xl text-brand-dark">
            {t('specialistHome.recentPatients.title')}
          </h3>
          <Link
            to="/dashboard/specialist/patients"
            className="text-xs text-accent font-bold uppercase tracking-widest hover:underline"
          >
            {t('specialistHome.recentPatients.viewAll')} →
          </Link>
        </div>
        <div className="divide-y divide-brand-dark/5">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <div className="h-5 bg-brand-dark/5 rounded-lg animate-pulse" />
              </div>
            ))}

          {!loading && recentPatients.length === 0 && (
            <p className="py-10 text-center text-brand-dark/40 font-heading text-lg">
              {t('specialistHome.recentPatients.empty')}
            </p>
          )}

          {!loading &&
            recentPatients.map((patient) => (
              <div
                key={patient.user_id}
                className="px-6 py-3 flex items-center gap-4 hover:bg-brand-light/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-brand-dark truncate">
                    {patient.first_name} {patient.last_name}
                  </p>
                  {patient.red_flags.length > 0 && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {patient.red_flags.map((flag) => (
                        <span
                          key={flag}
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200"
                        >
                          {t(`redFlags.${flag}`, { defaultValue: flag })}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Link
                  to={`/dashboard/specialist/patients/${patient.user_id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 text-xs font-bold uppercase tracking-widest transition-colors shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t('specialistDashboard.patientTable.view')}</span>
                </Link>
              </div>
            ))}
        </div>
      </div>

      {/* Pending Requests Preview */}
      <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-dark/5 flex items-center justify-between">
          <h3 className="font-heading text-xl text-brand-dark">
            {t('specialistHome.recentRequests.title')}
          </h3>
          <Link
            to="/dashboard/specialist/requests"
            className="text-xs text-accent font-bold uppercase tracking-widest hover:underline"
          >
            {t('specialistHome.recentRequests.viewAll')} →
          </Link>
        </div>
        <div className="p-4 space-y-3">
          {loading &&
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 bg-brand-dark/5 rounded-xl animate-pulse" />
            ))}

          {!loading && recentRequests.length === 0 && (
            <p className="py-8 text-center text-brand-dark/40 font-heading text-lg">
              {t('specialistHome.recentRequests.empty')}
            </p>
          )}

          {!loading &&
            recentRequests.map((req) => {
              const isProcessing = processing[req.id] ?? false;
              const name = req.counterparty
                ? `${req.counterparty.first_name} ${req.counterparty.last_name}`
                : req.patient_id;

              return (
                <div
                  key={req.id}
                  className="flex items-center gap-3 rounded-xl border border-brand-dark/8 bg-white/50 px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-brand-dark truncate">{name}</p>
                    <p className="text-xs text-brand-dark/40 uppercase tracking-widest">
                      {t('specialistDashboard.requestInbox.from')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRequestAction(req.id, 'approve')}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('specialistDashboard.requestInbox.approve')}</span>
                    </button>
                    <button
                      onClick={() => handleRequestAction(req.id, 'reject')}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{t('specialistDashboard.requestInbox.reject')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
