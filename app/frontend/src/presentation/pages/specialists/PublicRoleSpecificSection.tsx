import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PublicSpecialistProfile } from '@/domain/models/SpecialistProfileTypes';

interface Props {
  inferredRole: 'DOCTOR' | 'NUTRITIONIST' | 'COACH';
  profile: PublicSpecialistProfile;
}

export const PublicRoleSpecificSection: React.FC<Props> = ({ inferredRole, profile }) => {
  const { t } = useTranslation();

  return (
    <section className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm p-6 space-y-4">
      <h2 className="font-heading text-lg text-brand-dark">{t('publicProfile.roleSpecificTitle')}</h2>

      {inferredRole === 'DOCTOR' && (
        <>
          {profile.grad_profesional && (
            <div>
              <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-widest mb-0.5">
                {t('specialistProfile.roleSpecific.gradLabel')}
              </p>
              <p className="text-sm text-brand-dark/80">{t(`specialistGrade.${profile.grad_profesional}`)}</p>
            </div>
          )}
          {profile.specializari_secundare.length > 0 && (
            <div>
              <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-widest mb-1.5">
                {t('specialistProfile.roleSpecific.specializariSecundareLabel')}
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.specializari_secundare.map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {t(`specialistDashboard.specialization.${s}`)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {profile.competente_atestate.length > 0 && (
            <div>
              <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-widest mb-1.5">
                {t('specialistProfile.roleSpecific.competenteAtestateLabel')}
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.competente_atestate.map((c) => (
                  <span key={c} className="px-3 py-1 rounded-full bg-brand-dark/5 text-brand-dark/70 text-xs font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {inferredRole === 'NUTRITIONIST' && (
        <>
          {profile.specializare_nutritie.length > 0 && (
            <div>
              <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-widest mb-1.5">
                {t('specialistProfile.roleSpecific.specializareNutritieLabel')}
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.specializare_nutritie.map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {t(`nutritionSpecialization.${s}`)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {profile.filosofie_profesionala && (
            <div>
              <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-widest mb-0.5">
                {t('specialistProfile.roleSpecific.filosofieProfesionalaLabel')}
              </p>
              <p className="text-sm text-brand-dark/70 whitespace-pre-wrap">{profile.filosofie_profesionala}</p>
            </div>
          )}
        </>
      )}

      {inferredRole === 'COACH' && (
        <>
          {profile.specializare_sportiva.length > 0 && (
            <div>
              <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-widest mb-1.5">
                {t('specialistProfile.roleSpecific.specializareSportivaLabel')}
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.specializare_sportiva.map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {t(`sportSpecialization.${s}`)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {profile.filosofie_profesionala && (
            <div>
              <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-widest mb-0.5">
                {t('specialistProfile.roleSpecific.filosofieProfesionalaLabel')}
              </p>
              <p className="text-sm text-brand-dark/70 whitespace-pre-wrap">{profile.filosofie_profesionala}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
};
