import React, { useState } from 'react';
import { Outlet, useNavigate, Link, NavLink } from 'react-router-dom';
import { useAuth } from '@/application/hooks/useAuth';
import {
  LogOut,
  Menu,
  MessageSquare,
  X,
  User,
  Activity,
  FileText,
  Home,
  Users,
  ClipboardList,
  Stethoscope,
  Clock,
} from 'lucide-react';
import { LanguageSwitcher } from '@/presentation/components/ui/LanguageSwitcher';
import { Toast } from '@/presentation/components/ui/Toast';
import apiClient from '@/infrastructure/api/apiClient';
import { MedicalSpecialization } from '@/domain/models/MedicalSpecialization';
import HealthLogo from '@/presentation/components/ui/HealthLogo';
import { useTranslation } from 'react-i18next';
import { UserRole } from '@/domain/enums/UserRole';
import type { SpecialistProfile } from '@/domain/models/UserProfile';
import { useChatContext } from '@/application/hooks/useChatContext';

export const DashboardLayout: React.FC = () => {
  const { profile, role, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { totalUnread, latestToast, clearToast, isPdfUploading, isMLPredicting } = useChatContext();
  const isNavLocked = isPdfUploading || isMLPredicting;
  const isSpecialist = role === UserRole.DOCTOR || role === UserRole.NUTRITIONIST || role === UserRole.COACH;
  const isAdmin = role === UserRole.ADMIN;

  const spProfile = isSpecialist ? (profile as SpecialistProfile | null) : null;
  const specTranslationKey = spProfile?.specialization
    ? (Object.entries(MedicalSpecialization).find(([, v]) => v === spProfile.specialization)?.[0] ?? null)
    : null;
  const isVerificationLocked = isSpecialist && (
    spProfile?.verification_status === 'PENDING_VERIFICATION' ||
    spProfile?.verification_status === 'REJECTED'
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
      isActive
        ? 'bg-white text-primary shadow-sm'
        : 'text-brand-dark/70 hover:bg-white hover:text-primary'
    }`;

  return (
    <div className="flex h-screen w-full bg-bg-main overflow-hidden font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-brand-dark/20 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-brand-light border-r border-brand-dark/10
        flex flex-col transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-brand-dark/10 shrink-0">
           <Link to="/" className="flex items-center gap-2 group">
              <HealthLogo className="w-10 h-10 transition-transform duration-500 group-hover:scale-110" />
              <h1 className="font-heading text-2xl text-brand-dark tracking-wide">
                Health<span className="text-accent">Monitor</span>
              </h1>
           </Link>
           <button className="lg:hidden text-brand-dark/60 hover:text-brand-dark" onClick={() => setSidebarOpen(false)}>
             <X className="w-6 h-6" />
           </button>
        </div>

        {/* User Card */}
        <div className="p-6 border-b border-brand-dark/5 bg-white/40">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0 overflow-hidden">
                {isSpecialist && spProfile?.photo_url ? (
                  <img
                    src={`${apiClient.defaults.baseURL}/${spProfile.photo_url}`}
                    alt={`${spProfile.first_name} ${spProfile.last_name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </div>
              <div className="overflow-hidden">
                <p className="font-heading text-xl text-brand-dark truncate">
                  {profile ? `${profile.first_name} ${profile.last_name}` : t('sidebar.memberFallback')}
                </p>
                {isSpecialist && specTranslationKey ? (
                  <p className="text-xs text-brand-dark/50 truncate">
                    {t(`specialistDashboard.specialization.${specTranslationKey}`)}
                  </p>
                ) : (
                  <p className="text-xs font-bold tracking-widest text-brand-dark/40 uppercase">
                    {t(`adminDashboard.users.roles.${role}`, { defaultValue: role ?? 'USER' })}
                  </p>
                )}
              </div>
           </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isAdmin ? (
            <>
              <NavLink end to="/dashboard/admin" onClick={() => setSidebarOpen(false)} className={navClass}>
                <Home className="w-5 h-5" />
                <span>{t('sidebar.home')}</span>
              </NavLink>
              <NavLink to="/dashboard/admin/users" onClick={() => setSidebarOpen(false)} className={navClass}>
                <Users className="w-5 h-5" />
                <span>{t('adminDashboard.actions.manageUsers')}</span>
              </NavLink>
              <NavLink to="/dashboard/admin/verification" onClick={() => setSidebarOpen(false)} className={navClass}>
                <Clock className="w-5 h-5" />
                <span>{t('adminDashboard.actions.verificationQueue')}</span>
              </NavLink>
            </>
          ) : isSpecialist ? (
            <>
              {isVerificationLocked ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-brand-dark/30 cursor-not-allowed select-none">
                    <Home className="w-5 h-5" />
                    <span>{t('sidebar.home')}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-brand-dark/30 cursor-not-allowed select-none">
                    <User className="w-5 h-5" />
                    <span>{t('sidebar.myProfile')}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-brand-dark/30 cursor-not-allowed select-none">
                    <Users className="w-5 h-5" />
                    <span>{t('sidebar.myPatients')}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-brand-dark/30 cursor-not-allowed select-none">
                    <ClipboardList className="w-5 h-5" />
                    <span>{t('sidebar.requests')}</span>
                  </div>
                  {(role === UserRole.NUTRITIONIST || role === UserRole.COACH) && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-brand-dark/30 cursor-not-allowed select-none">
                      <ClipboardList className="w-5 h-5" />
                      <span>{t('sidebar.sentPlans')}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <NavLink end to="/dashboard/specialist" onClick={() => setSidebarOpen(false)} className={navClass}>
                    <Home className="w-5 h-5" />
                    <span>{t('sidebar.home')}</span>
                  </NavLink>
                  <NavLink to="/dashboard/specialist/profile" onClick={() => setSidebarOpen(false)} className={navClass}>
                    <User className="w-5 h-5" />
                    <span>{t('sidebar.myProfile')}</span>
                  </NavLink>
                  <NavLink to="/dashboard/specialist/patients" onClick={() => setSidebarOpen(false)} className={navClass}>
                    <Users className="w-5 h-5" />
                    <span>{t('sidebar.myPatients')}</span>
                  </NavLink>
                  <NavLink to="/dashboard/messages" onClick={() => setSidebarOpen(false)} className={navClass}>
                    <MessageSquare className="w-5 h-5" />
                    <span className="flex-1">{t('sidebar.messages')}</span>
                    {totalUnread > 0 && (
                      <span className="min-w-5 h-5 flex items-center justify-center rounded-full bg-accent text-white text-xs px-1">
                        {totalUnread > 99 ? '99+' : totalUnread}
                      </span>
                    )}
                  </NavLink>
                  <NavLink to="/dashboard/specialist/requests" onClick={() => setSidebarOpen(false)} className={navClass}>
                    <ClipboardList className="w-5 h-5" />
                    <span>{t('sidebar.requests')}</span>
                  </NavLink>
                  {(role === UserRole.NUTRITIONIST || role === UserRole.COACH) && (
                    <NavLink to="/dashboard/specialist/sent-plans" onClick={() => setSidebarOpen(false)} className={navClass}>
                      <ClipboardList className="w-5 h-5" />
                      <span>{t('sidebar.sentPlans')}</span>
                    </NavLink>
                  )}
                </>
              )}
            </>
          ) : isNavLocked ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-brand-dark/30 cursor-not-allowed select-none">
                <Home className="w-5 h-5" />
                <span>{t('sidebar.home')}</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-brand-dark/30 cursor-not-allowed select-none">
                <Activity className="w-5 h-5" />
                <span>{t('sidebar.history')}</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-brand-dark/30 cursor-not-allowed select-none">
                <FileText className="w-5 h-5" />
                <span>{t('sidebar.compare')}</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-brand-dark/30 cursor-not-allowed select-none">
                <MessageSquare className="w-5 h-5" />
                <span>{t('sidebar.messages')}</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-brand-dark/30 cursor-not-allowed select-none">
                <Stethoscope className="w-5 h-5" />
                <span>{t('sidebar.mySpecialists')}</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-brand-dark/30 cursor-not-allowed select-none">
                <ClipboardList className="w-5 h-5" />
                <span>{t('sidebar.myPlans')}</span>
              </div>
            </>
          ) : (
            <>
              <NavLink end to="/dashboard/patient" onClick={() => setSidebarOpen(false)} className={navClass}>
                <Home className="w-5 h-5" />
                <span>{t('sidebar.home')}</span>
              </NavLink>
              <NavLink to="/dashboard/patient/history" onClick={() => setSidebarOpen(false)} className={navClass}>
                <Activity className="w-5 h-5" />
                <span>{t('sidebar.history')}</span>
              </NavLink>
              <NavLink to="/dashboard/patient/compare" onClick={() => setSidebarOpen(false)} className={navClass}>
                <FileText className="w-5 h-5" />
                <span>{t('sidebar.compare')}</span>
              </NavLink>
              <NavLink to="/dashboard/messages" onClick={() => setSidebarOpen(false)} className={navClass}>
                <MessageSquare className="w-5 h-5" />
                <span className="flex-1">{t('sidebar.messages')}</span>
                {totalUnread > 0 && (
                  <span className="min-w-5 h-5 flex items-center justify-center rounded-full bg-accent text-white text-xs px-1">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </NavLink>
              <NavLink to="/dashboard/patient/specialists" onClick={() => setSidebarOpen(false)} className={navClass}>
                <Stethoscope className="w-5 h-5" />
                <span>{t('sidebar.mySpecialists')}</span>
              </NavLink>
              <NavLink to="/dashboard/patient/my-plans" onClick={() => setSidebarOpen(false)} className={navClass}>
                <ClipboardList className="w-5 h-5" />
                <span>{t('sidebar.myPlans')}</span>
              </NavLink>
            </>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-brand-dark/10 flex items-center gap-2">
          <div className="flex-1">
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-4 py-3 w-full text-secondary hover:bg-secondary/10 hover:text-brand-dark rounded-xl font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>{t('sidebar.logout')}</span>
            </button>
          </div>
          <div className="shrink-0">
            <LanguageSwitcher className="px-4 py-3 rounded-xl bg-white/40 hover:bg-white text-brand-dark/70 hover:text-primary transition-colors text-sm!" />
          </div>
        </div>
      </aside>

      {latestToast && latestToast.variant === 'redFlag' ? (
        <Toast
          open
          variant="redFlag"
          title={t('chat.toast.redFlagTitle')}
          body={t('chat.toast.redFlagBody', { count: latestToast.conditions.length })}
          linkLabel={t('chat.toast.viewPatient')}
          linkTo={`/dashboard/specialist/patients/${latestToast.patientUserId}`}
          onClose={clearToast}
        />
      ) : latestToast ? (
        <Toast
          open
          variant={latestToast.variant === 'info' ? 'success' : latestToast.variant}
          title={t(latestToast.titleKey)}
          body={latestToast.bodyKey ? t(latestToast.bodyKey) : undefined}
          linkTo={latestToast.linkPath}
          linkLabel={latestToast.linkLabelKey ? t(latestToast.linkLabelKey) : undefined}
          onClose={clearToast}
        />
      ) : null}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="lg:hidden h-20 flex items-center justify-between px-6 border-b border-brand-dark/10 bg-white shrink-0">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-brand-dark/40 uppercase tracking-widest">
              {t(`adminDashboard.users.roles.${role}`, { defaultValue: role ?? 'USER' })}
            </span>
            <span className="font-heading text-xl text-brand-dark">{profile ? profile.first_name : 'Dashboard'}</span>
          </div>
          <button className="text-brand-dark/60 hover:text-brand-dark" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-8 h-8" />
          </button>
        </header>

        {/* Dashboard Content Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative">
            <div className="max-w-7xl mx-auto h-full space-y-8 animate-fade-in">
              <Outlet />
            </div>
        </div>
      </main>

    </div>
  );
};
