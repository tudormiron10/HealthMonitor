import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Stethoscope, Clock, FileText, Link2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/application/hooks/useAuth';
import { adminApi } from '@/infrastructure/api/adminApi';
import type { PlatformStats } from '@/domain/models/AdminTypes';

export const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const displayName = profile?.first_name ?? 'Admin';

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(() => setError(t('adminDashboard.errorLoad')))
      .finally(() => setLoading(false));
  }, [t]);

  const kpiCards = [
    {
      label: t('adminDashboard.kpi.patients'),
      value: stats?.total_patients ?? 0,
      icon: Users,
      color: 'text-accent',
      bg: 'bg-accent/10',
      href: '/dashboard/admin/users?role=PATIENT',
      accent: false,
    },
    {
      label: t('adminDashboard.kpi.doctors'),
      value: stats?.total_doctors ?? 0,
      icon: Stethoscope,
      color: 'text-primary',
      bg: 'bg-primary/10',
      href: '/dashboard/admin/users?role=DOCTOR',
      accent: false,
    },
    {
      label: t('adminDashboard.kpi.nutritionistsCoaches'),
      value: stats?.total_nutritionists_coaches ?? 0,
      icon: Users,
      color: 'text-accent',
      bg: 'bg-accent/10',
      href: '/dashboard/admin/users?role=NUTRITIONIST',
      accent: false,
    },
    {
      label: t('adminDashboard.kpi.pendingVerifications'),
      value: stats?.pending_verifications ?? 0,
      icon: Clock,
      color: 'text-secondary',
      bg: 'bg-secondary/10',
      href: '/dashboard/admin/verification',
      accent: true,
    },
  ] as const;

  const statCards = [
    {
      label: t('adminDashboard.stats.records'),
      value: stats?.total_medical_records ?? 0,
      icon: FileText,
      hint: t('adminDashboard.stats.recordsHint'),
    },
    {
      label: t('adminDashboard.stats.relations'),
      value: stats?.active_relations ?? 0,
      icon: Link2,
      hint: null,
    },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-brand-dark rounded-3xl p-10 md:p-12 shadow-inner">
        <h2 className="text-4xl font-heading text-brand-light mb-2">
          {t('adminDashboard.welcome', { name: displayName })}
        </h2>
        <p className="text-lg text-brand-light/70 uppercase tracking-widest font-bold">
          {t('adminDashboard.subtitle')}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-600 rounded-lg text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color, bg, href, accent }) => {
          const isPendingCard = accent && value > 0;
          const card = (
            <div className={`rounded-2xl border shadow-sm p-6 flex items-center gap-4 transition-all group ${
              isPendingCard
                ? 'bg-secondary/10 border-secondary/30 hover:bg-secondary/15 hover:shadow-md cursor-pointer'
                : 'bg-white/60 border-brand-dark/10 hover:bg-white/80 hover:shadow-md'
            }`}>
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                {loading ? (
                  <div className="h-7 w-12 bg-brand-dark/10 rounded animate-pulse mb-1" />
                ) : (
                  <p className={`text-3xl font-heading ${isPendingCard ? 'text-secondary' : 'text-brand-dark'}`}>
                    {value}
                  </p>
                )}
                <p className="text-sm text-brand-dark/60 font-medium">{label}</p>
              </div>
            </div>
          );

          return (
            <Link key={label} to={href}>{card}</Link>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statCards.map(({ label, value, icon: Icon, hint }) => (
          <div
            key={label}
            className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm p-6 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              {loading ? (
                <div className="h-7 w-14 bg-brand-dark/10 rounded animate-pulse mb-1" />
              ) : (
                <p className="text-3xl font-heading text-brand-dark">{value}</p>
              )}
              <p className="text-sm text-brand-dark/60 font-medium">{label}</p>
              {hint && <p className="text-xs text-brand-dark/40 mt-0.5 leading-snug">{hint}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
