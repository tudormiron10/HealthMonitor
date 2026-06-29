import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, Eye, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/application/hooks/useAuth';
import { computeProfileCompletion } from '@/application/utils/profileCompletion';
import { specialistApi } from '@/infrastructure/api/specialistApi';
import type { SpecialistProfileFull, WorkExperienceEntry, EducationEntry, CertificationEntry } from '@/domain/models/SpecialistProfileTypes';
import { ProfilePhotoUploader } from './profile/shared/ProfilePhotoUploader';
import { ProfileCompletionBar } from './profile/shared/ProfileCompletionBar';
import { BasicInfoCard } from './profile/shared/BasicInfoCard';
import { RoleSpecificCard } from './profile/credentials/RoleSpecificCard';
import { CredentialsCard } from './profile/credentials/CredentialsCard';
import { WorkExperienceSection } from './profile/work-experience/WorkExperienceSection';
import { EducationSection } from './profile/education/EducationSection';
import { CertificationsSection } from './profile/certifications/CertificationsSection';

export const SpecialistProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { userId, refreshProfile } = useAuth();

  const [profile, setProfile] = useState<SpecialistProfileFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    specialistApi.getMyFullProfile()
      .then(setProfile)
      .catch(() => setError(t('specialistProfile.saveError')))
      .finally(() => setLoading(false));
  }, [t]);

  const handleProfileUpdated = (updated: SpecialistProfileFull) => {
    const photoChanged = updated.photo_url !== profile?.photo_url;
    const headlineChanged = updated.headline !== profile?.headline;
    setProfile((prev) => ({
      ...updated,
      work_experience: prev?.work_experience ?? [],
      education: prev?.education ?? [],
      certifications: prev?.certifications ?? [],
    }));
    if (photoChanged || headlineChanged) refreshProfile();
  };

  const handlePhotoChanged = (url: string | null) => {
    setProfile((prev) => (prev ? { ...prev, photo_url: url } : null));
    refreshProfile();
  };

  const handleWorkExpChanged = (entries: WorkExperienceEntry[]) => {
    setProfile((prev) => (prev ? { ...prev, work_experience: entries } : null));
  };

  const handleEducationChanged = (entries: EducationEntry[]) => {
    setProfile((prev) => (prev ? { ...prev, education: entries } : null));
  };

  const handleCertificationsChanged = (entries: CertificationEntry[]) => {
    setProfile((prev) => (prev ? { ...prev, certifications: entries } : null));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center gap-2 text-secondary">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span className="text-sm">{error ?? t('specialistProfile.saveError')}</span>
      </div>
    );
  }

  const completion = computeProfileCompletion(profile);
  const publicProfileUrl = `/specialists/${userId}`;
  const deprecatedPrefill = profile.unitate_sanitara
    ? { employer: profile.unitate_sanitara, location: profile.clinic_affiliation ?? undefined }
    : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Header strip */}
      <div className="bg-primary rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Photo */}
          <ProfilePhotoUploader photoUrl={profile.photo_url} onPhotoChanged={handlePhotoChanged} />

          {/* Name, headline, badge, public link */}
          <div className="flex-1 flex flex-col gap-1.5 text-white text-center sm:text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl leading-tight">
                  {profile.first_name} {profile.last_name}
                </h1>
                {profile.headline && (
                  <p className="text-sm text-white/60 mt-0.5">{profile.headline}</p>
                )}
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1.5">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-xs font-bold text-accent uppercase tracking-widest">
                    {t('publicProfile.verifiedBadge')}
                  </span>
                </div>
              </div>
              <a
                href={publicProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={t('specialistProfile.previewButton')}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
              >
                <Eye className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Completion bar */}
        <div className="border-t border-white/10 pt-4">
          <ProfileCompletionBar completion={completion} />
        </div>
      </div>

      {/* Cards */}
      <BasicInfoCard profile={profile} onProfileUpdated={handleProfileUpdated} />
      <RoleSpecificCard profile={profile} onProfileUpdated={handleProfileUpdated} />
      <CredentialsCard profile={profile} />
      <WorkExperienceSection
        entries={profile.work_experience}
        onEntriesChanged={handleWorkExpChanged}
        prefillFromDeprecated={deprecatedPrefill}
      />
      <EducationSection
        entries={profile.education}
        onEntriesChanged={handleEducationChanged}
      />
      <CertificationsSection
        entries={profile.certifications}
        onEntriesChanged={handleCertificationsChanged}
      />
    </div>
  );
};
