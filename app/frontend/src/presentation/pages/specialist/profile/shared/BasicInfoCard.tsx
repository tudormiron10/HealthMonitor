import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { LanguageCode } from '@/domain/enums/SpecialistEnums';
import type { SpecialistProfileFull } from '@/domain/models/SpecialistProfileTypes';
import { specialistApi } from '@/infrastructure/api/specialistApi';

const BIO_MAX = 500;
const PROGRAM_MAX = 300;
const LANGUAGE_OPTIONS = Object.values(LanguageCode);

interface Props {
  profile: SpecialistProfileFull;
  onProfileUpdated: (updated: SpecialistProfileFull) => void;
}

function sortedJson(arr: string[]): string {
  return JSON.stringify([...arr].sort());
}

export const BasicInfoCard: React.FC<Props> = ({ profile, onProfileUpdated }) => {
  const { t } = useTranslation();

  const [bio, setBio] = useState(profile.bio ?? '');
  const [limbiVorbite, setLimbiVorbite] = useState<string[]>(profile.limbi_vorbite ?? []);
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url ?? '');
  const [programLucru, setProgramLucru] = useState(profile.program_lucru ?? '');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDirty =
    bio !== (profile.bio ?? '') ||
    websiteUrl !== (profile.website_url ?? '') ||
    programLucru !== (profile.program_lucru ?? '') ||
    sortedJson(limbiVorbite) !== sortedJson(profile.limbi_vorbite ?? []);

  const isValidUrl = !websiteUrl || /^https?:\/\/.+/.test(websiteUrl);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFeedback({ type, msg });
    timerRef.current = setTimeout(() => setFeedback(null), 3000);
  };

  const toggleLanguage = (code: string) => {
    setLimbiVorbite((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );
  };

  const handleSave = async () => {
    if (!isValidUrl) return;
    setSaving(true);
    try {
      const updated = await specialistApi.updateDetails({
        bio: bio.trim() || null,
        limbi_vorbite: limbiVorbite as typeof LANGUAGE_OPTIONS[number][],
        website_url: websiteUrl.trim() || null,
        program_lucru: programLucru.trim() || null,
      });
      onProfileUpdated(updated);
      showFeedback('success', t('specialistProfile.saveSuccess'));
    } catch {
      showFeedback('error', t('specialistProfile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-brand-dark/10">
        <h3 className="text-lg font-heading text-brand-dark">
          {t('specialistProfile.sections.basicInfo')}
        </h3>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">

        {/* Bio */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50">
              {t('specialistProfile.basicInfo.bioLabel')}
            </label>
            <span className="text-xs text-brand-dark/30">
              {t('specialistProfile.basicInfo.charsRemaining', { count: BIO_MAX - bio.length })}
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            rows={4}
            placeholder={t('specialistProfile.basicInfo.bioPlaceholder')}
            className="w-full rounded-xl border border-brand-dark/20 bg-white/80 px-4 py-2.5 text-sm text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
          />
        </div>

        {/* Languages */}
        <div>
          <label className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50 block mb-2">
            {t('specialistProfile.basicInfo.limbiVorbiteLabel')}
          </label>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {LANGUAGE_OPTIONS.map((code) => (
              <label key={code} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={limbiVorbite.includes(code)}
                  onChange={() => toggleLanguage(code)}
                  className="w-4 h-4 rounded accent-accent"
                />
                <span className="text-sm text-brand-dark">{t(`languages.${code}`)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Website */}
        <div>
          <label className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50 block mb-1">
            {t('specialistProfile.basicInfo.websiteLabel')}
          </label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder={t('specialistProfile.basicInfo.websitePlaceholder')}
            className={`w-full rounded-xl border bg-white/80 px-4 py-2.5 text-sm text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-accent/30 ${
              !isValidUrl ? 'border-secondary/60' : 'border-brand-dark/20'
            }`}
          />
        </div>

        {/* Program lucru */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50">
              {t('specialistProfile.basicInfo.programLucruLabel')}
            </label>
            <span className="text-xs text-brand-dark/30">
              {t('specialistProfile.basicInfo.charsRemaining', { count: PROGRAM_MAX - programLucru.length })}
            </span>
          </div>
          <textarea
            value={programLucru}
            onChange={(e) => setProgramLucru(e.target.value.slice(0, PROGRAM_MAX))}
            rows={2}
            placeholder={t('specialistProfile.basicInfo.programLucruPlaceholder')}
            className="w-full rounded-xl border border-brand-dark/20 bg-white/80 px-4 py-2.5 text-sm text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-brand-dark/10 flex items-center justify-between gap-4">
        <div className="min-h-5">
          {feedback && (
            <div className={`flex items-center gap-1.5 text-sm ${
              feedback.type === 'success' ? 'text-accent' : 'text-secondary'
            }`}>
              {feedback.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              {feedback.msg}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || !isValidUrl || saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-widest transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? t('specialistProfile.saving') : t('specialistProfile.saveButton')}
        </button>
      </div>
    </div>
  );
};
