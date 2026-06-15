import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import HealthLogo from '@/presentation/components/ui/HealthLogo';
import { Button } from '@/presentation/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/application/hooks/useAuth';
import apiClient from '@/infrastructure/api/apiClient';
import { getDashboardHome } from '@/application/utils/dashboardRoutes';
import { PlatformSectionNav, SECTION_IDS, SIDEBAR_KEYS } from './PlatformSectionNav';

export const MainNavbar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, profile, role, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const onPlatform = location.pathname.startsWith('/platform');
  const compact = onPlatform;
  const photoUrl = profile && 'photo_url' in profile ? profile.photo_url : null;

  return (
    <nav className={`sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-brand-light/60 py-3 shadow-md transition-all ${compact ? 'px-4 xl:px-6' : 'px-6 xl:px-12'}`}>
      <div className={`max-w-400 mx-auto flex justify-between items-center ${compact ? 'gap-4' : 'gap-8'}`}>
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 md:gap-3 group shrink-0">
          <HealthLogo className="w-10 h-10 md:w-16 md:h-16 transition-transform duration-500 group-hover:scale-110" />
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl text-primary tracking-tighter drop-shadow-sm select-none whitespace-nowrap">
            Health<span className="text-accent">Monitor</span>
          </h1>
        </Link>

        {/* Platform section links (Desktop) — only on the platform page */}
        {onPlatform && (
          <div className="hidden lg:flex flex-1 justify-center min-w-0">
            <PlatformSectionNav />
          </div>
        )}

        {/* Auth / CTA (Desktop) */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          {!isAuthenticated ? (
            <>
              <Button variant="ghost" size={compact ? 'sm' : 'md'} onClick={() => navigate('/login')}>
                {t('navbar.login')}
              </Button>
              <Button variant="primary" size={compact ? 'sm' : 'md'} onClick={() => navigate('/register')}>
                {t('navbar.register')}
              </Button>
            </>
          ) : (
            <div className={`flex items-center ${compact ? 'gap-2' : 'gap-4'}`}>
              <div className={`flex items-center border border-brand-light/30 rounded-full bg-brand-light/10 ${compact ? 'gap-2 px-3 py-1.5' : 'gap-3 px-4 py-2'}`}>
                <div className={`rounded-full bg-accent/20 flex items-center justify-center text-accent overflow-hidden ${compact ? 'w-7 h-7' : 'w-8 h-8'}`}>
                  {photoUrl ? (
                    <img
                      src={`${apiClient.defaults.baseURL}/${photoUrl}`}
                      alt={profile ? `${profile.first_name} ${profile.last_name}` : ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
                  )}
                </div>
                <span className={`font-heading text-brand-dark/80 tracking-wider ${compact ? 'text-sm' : 'text-xl'}`}>
                  {profile ? `${profile.first_name} ${profile.last_name}` : 'Membru'}
                </span>
              </div>
              <Button
                variant="primary"
                size={compact ? 'sm' : 'md'}
                className="flex items-center gap-2"
                onClick={() => navigate(getDashboardHome(role))}
                title="Dashboard"
              >
                <LayoutDashboard className={compact ? 'w-5 h-5' : 'w-4 h-4'} />
                {!compact && 'DASHBOARD'}
              </Button>
              <button
                onClick={() => logout()}
                className="p-2 text-secondary-hover hover:text-brand-dark transition-colors"
                title="Logout"
              >
                <LogOut className={compact ? 'w-5 h-5' : 'w-6 h-6'} />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Toggle Button */}
        <button 
          className="lg:hidden text-primary p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle Menu"
        >
          {isMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-3xl border-b border-brand-light/60 p-6 flex flex-col gap-6 shadow-2xl animate-fade-in origin-top">
          {onPlatform && (
            <div className="flex flex-col gap-4 font-heading text-2xl tracking-widest text-brand-dark/70 text-center">
              {SECTION_IDS.map((id) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="hover:text-primary transition-colors py-2 border-b border-brand-light/20 last:border-0"
                >
                  {t(SIDEBAR_KEYS[id])}
                </a>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-4 pt-4 mt-2 border-t border-brand-light/30">
            {!isAuthenticated ? (
              <>
                <Button variant="ghost" className="w-full text-xl py-3" onClick={() => { setIsMenuOpen(false); navigate('/login'); }}>
                  {t('navbar.login')}
                </Button>
                <Button variant="primary" className="w-full text-xl py-3 shadow-md" onClick={() => { setIsMenuOpen(false); navigate('/register'); }}>
                  {t('navbar.register')}
                </Button>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 justify-center text-brand-dark">
                   <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0 overflow-hidden">
                     {photoUrl ? (
                       <img
                         src={`${apiClient.defaults.baseURL}/${photoUrl}`}
                         alt={profile ? `${profile.first_name} ${profile.last_name}` : ''}
                         className="w-full h-full object-cover"
                       />
                     ) : (
                       <User className="w-5 h-5" />
                     )}
                   </div>
                   <span className="font-heading text-2xl tracking-widest">{profile ? `${profile.first_name} ${profile.last_name}` : 'Membru'}</span>
                </div>
                <Button variant="primary" className="w-full text-xl py-3 shadow-md flex justify-center gap-2" onClick={() => { setIsMenuOpen(false); navigate(getDashboardHome(role)); }}>
                  <LayoutDashboard className="w-5 h-5" />
                  DASHBOARD
                </Button>
                <Button variant="ghost" className="w-full text-xl py-3 text-secondary-hover" onClick={() => { setIsMenuOpen(false); logout(); }}>
                  LOGOUT
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
