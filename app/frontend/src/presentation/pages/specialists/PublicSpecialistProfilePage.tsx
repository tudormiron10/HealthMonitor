import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '@/application/hooks/useAuth';
import { publicSpecialistApi } from '@/infrastructure/api/publicSpecialistApi';
import { relationsApi } from '@/infrastructure/api/relationsApi';
import { chatApi } from '@/infrastructure/api/chatApi';
import type { PublicSpecialistProfile } from '@/domain/models/SpecialistProfileTypes';
import { UserRole } from '@/domain/enums/UserRole';
import HealthLogo from '@/presentation/components/ui/HealthLogo';
import { PublicProfileHeader } from './PublicProfileHeader';
import { PublicAboutSection } from './PublicAboutSection';
import { PublicRoleSpecificSection } from './PublicRoleSpecificSection';
import { PublicWorkExperienceSection } from './PublicWorkExperienceSection';
import { PublicEducationSection } from './PublicEducationSection';
import { PublicCertificationsSection } from './PublicCertificationsSection';
import { PublicCredentialsSection } from './PublicCredentialsSection';

type ConnectStatus = 'none' | 'pending' | 'approved';
type InferredRole = 'DOCTOR' | 'NUTRITIONIST' | 'COACH';

function inferRole(p: PublicSpecialistProfile): InferredRole {
  if (p.cod_parafa !== null) return 'DOCTOR';
  if (p.numar_ondr !== null) return 'NUTRITIONIST';
  return 'COACH';
}

export const PublicSpecialistProfilePage: React.FC = () => {
  const { userId: targetUserId } = useParams<{ userId: string }>();
  const { userId: myUserId, role } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [profile, setProfile] = useState<PublicSpecialistProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>('none');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [chatting, setChatting] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;
    publicSpecialistApi.getPublicProfile(targetUserId)
      .then(setProfile)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [targetUserId]);

  useEffect(() => {
    if (role !== UserRole.PATIENT || !profile) return;
    Promise.all([relationsApi.getApproved(), relationsApi.getSent()])
      .then(([approved, sent]) => {
        if (approved.some(r => r.counterparty?.user_id === profile.user_id)) {
          setConnectStatus('approved');
        } else if (sent.some(r => r.counterparty?.user_id === profile.user_id)) {
          setConnectStatus('pending');
        }
      })
      .catch(() => {});
  }, [profile, role]);

  const handleChat = async () => {
    if (!profile) return;
    setChatting(true);
    try {
      const conv = await chatApi.openOrCreateConversation(profile.user_id);
      navigate(`/dashboard/messages/${conv.id}`);
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setChatting(false);
    }
  };

  const handleConnect = async () => {
    if (!profile) return;
    setSending(true);
    setSendError(false);
    try {
      await relationsApi.request(profile.user_id);
      setConnectStatus('pending');
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center gap-4 text-center px-6">
        <Shield className="w-16 h-16 text-brand-dark/20" />
        <h1 className="font-heading text-3xl text-brand-dark">{t('publicProfile.unavailable')}</h1>
        <p className="text-sm text-brand-dark/60 max-w-md">{t('publicProfile.notFound')}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('publicProfile.back')}
        </button>
      </div>
    );
  }

  if (!profile) return null;

  const inferredRole = inferRole(profile);
  const isOwnProfile = myUserId === profile.user_id;

  const hasAboutContent =
    !!profile.bio ||
    profile.limbi_vorbite.length > 0 ||
    !!profile.program_lucru ||
    !!profile.website_url;

  const hasRoleSpecific =
    inferredRole === 'DOCTOR'
      ? !!(profile.grad_profesional || profile.specializari_secundare.length > 0 || profile.competente_atestate.length > 0)
      : inferredRole === 'NUTRITIONIST'
      ? !!(profile.specializare_nutritie.length > 0 || profile.filosofie_profesionala)
      : !!(profile.specializare_sportiva.length > 0 || profile.filosofie_profesionala);

  const hasPublicCredential =
    (inferredRole === 'DOCTOR' && !!profile.cod_parafa) ||
    (inferredRole === 'NUTRITIONIST' && !!profile.numar_ondr) ||
    (inferredRole === 'COACH' && !!profile.numar_certificare);

  return (
    <div className="min-h-screen bg-bg-main font-sans">
      {/* Top nav */}
      <nav className="bg-white border-b border-brand-dark/10 px-6 h-16 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-dark/60 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('publicProfile.back')}
        </button>
        <Link to="/" className="ml-auto flex items-center gap-2 group">
          <HealthLogo className="w-7 h-7 transition-transform duration-500 group-hover:scale-110" />
          <span className="font-heading text-lg text-brand-dark tracking-wide">
            Health<span className="text-accent">Monitor</span>
          </span>
        </Link>
      </nav>

      {/* Page content */}
      <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-6 animate-fade-in">
        <PublicProfileHeader
          profile={profile}
          isOwnProfile={isOwnProfile}
          connectStatus={connectStatus}
          sending={sending}
          sendError={sendError}
          onConnect={handleConnect}
          onChat={handleChat}
          chatting={chatting}
        />

        {hasAboutContent && (
          <PublicAboutSection
            bio={profile.bio}
            website_url={profile.website_url}
            program_lucru={profile.program_lucru}
            limbi_vorbite={profile.limbi_vorbite}
          />
        )}

        {hasRoleSpecific && (
          <PublicRoleSpecificSection inferredRole={inferredRole} profile={profile} />
        )}

        {profile.work_experience.length > 0 && (
          <PublicWorkExperienceSection entries={profile.work_experience} />
        )}

        {profile.education.length > 0 && (
          <PublicEducationSection entries={profile.education} />
        )}

        {profile.certifications.length > 0 && (
          <PublicCertificationsSection entries={profile.certifications} />
        )}

        {hasPublicCredential && (
          <PublicCredentialsSection
            inferredRole={inferredRole}
            cod_parafa={profile.cod_parafa}
            numar_ondr={profile.numar_ondr}
            numar_certificare={profile.numar_certificare}
          />
        )}
      </div>
    </div>
  );
};
