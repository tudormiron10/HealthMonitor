import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, MessageSquare, User, CheckCircle2 } from 'lucide-react';
import type { PublicSpecialistProfile } from '@/domain/models/SpecialistProfileTypes';
import { UserRole } from '@/domain/enums/UserRole';
import { useAuth } from '@/application/hooks/useAuth';
import apiClient from '@/infrastructure/api/apiClient';

interface Props {
  profile: PublicSpecialistProfile;
  isOwnProfile: boolean;
  connectStatus: 'none' | 'pending' | 'approved';
  sending: boolean;
  sendError: boolean;
  onConnect: () => void;
  onChat?: () => void;
  chatting?: boolean;
}

export const PublicProfileHeader: React.FC<Props> = ({
  profile,
  isOwnProfile,
  connectStatus,
  sending,
  sendError,
  onConnect,
  onChat,
  chatting = false,
}) => {
  const { t } = useTranslation();
  const { role } = useAuth();

  const photoSrc = profile.photo_url
    ? `${apiClient.defaults.baseURL}/${profile.photo_url}`
    : null;

  return (
    <div className="bg-primary rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Photo */}
        <div className="w-28 h-28 rounded-full shrink-0 overflow-hidden bg-white/20 flex items-center justify-center">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={`${profile.first_name} ${profile.last_name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-12 h-12 text-white/60" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left text-white space-y-2">
          <h1 className="font-heading text-2xl leading-tight">
            {profile.first_name} {profile.last_name}
          </h1>
          {profile.headline && (
            <p className="text-sm text-white/70">{profile.headline}</p>
          )}
          <div className="flex items-center justify-center sm:justify-start gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
            <span className="text-xs font-bold text-accent uppercase tracking-widest">
              {t('publicProfile.verifiedBadge')}
            </span>
          </div>

          {/* Own profile notice OR patient connect CTA */}
          <div className="pt-1">
            {isOwnProfile ? (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-xs text-white/60 italic">
                  {t('publicProfile.ownProfile')}
                </span>
                <Link
                  to="/dashboard/specialist/profile"
                  className="text-xs font-medium text-accent hover:text-accent/80 underline transition-colors"
                >
                  {t('publicProfile.editProfile')}
                </Link>
              </div>
            ) : role === UserRole.PATIENT ? (
              <div className="flex flex-col items-center sm:items-start gap-1.5">
                {connectStatus === 'approved' ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/20 text-accent text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      {t('publicProfile.requestApproved')}
                    </span>
                    {onChat && (
                      <button
                        onClick={onChat}
                        disabled={chatting}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 text-white hover:bg-white/30 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {chatting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                        {t('publicProfile.chat')}
                      </button>
                    )}
                  </div>
                ) : connectStatus === 'pending' ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-white/70 text-sm font-medium">
                    {t('publicProfile.requestPending')}
                  </span>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={sending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-60"
                  >
                    {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {sending ? t('publicProfile.sendingRequest') : t('publicProfile.sendRequest')}
                  </button>
                )}
                {sendError && (
                  <p className="text-xs text-secondary">{t('relations.requestError')}</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
