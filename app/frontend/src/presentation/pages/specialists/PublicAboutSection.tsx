import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Clock } from 'lucide-react';
import type { LanguageCode } from '@/domain/enums/SpecialistEnums';

interface Props {
  bio: string | null;
  website_url: string | null;
  program_lucru: string | null;
  limbi_vorbite: LanguageCode[];
}

export const PublicAboutSection: React.FC<Props> = ({
  bio,
  website_url,
  program_lucru,
  limbi_vorbite,
}) => {
  const { t } = useTranslation();

  return (
    <section className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm p-6 space-y-5">
      {bio && (
        <div>
          <h2 className="font-heading text-lg text-brand-dark mb-2">{t('publicProfile.about')}</h2>
          <p className="text-sm text-brand-dark/70 whitespace-pre-wrap">{bio}</p>
        </div>
      )}

      {website_url && (
        <div className="flex items-center gap-2 text-sm">
          <Globe className="w-4 h-4 text-brand-dark/40 shrink-0" />
          <a
            href={website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline break-all"
          >
            {website_url}
          </a>
        </div>
      )}

      {program_lucru && (
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-brand-dark/40 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-widest mb-0.5">
              {t('publicProfile.workingHoursTitle')}
            </p>
            <p className="text-sm text-brand-dark/70">{program_lucru}</p>
          </div>
        </div>
      )}

      {limbi_vorbite.length > 0 && (
        <div>
          <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-widest mb-2">
            {t('publicProfile.languagesTitle')}
          </p>
          <div className="flex flex-wrap gap-2">
            {limbi_vorbite.map((lang) => (
              <span
                key={lang}
                className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium"
              >
                {t(`languages.${lang}`)}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
