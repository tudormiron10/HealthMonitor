import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { UserRole } from '@/domain/enums/UserRole';
import type { MedicalSpecialization } from '@/domain/models/MedicalSpecialization';
import type { SpecialistProfileFull } from '@/domain/models/SpecialistProfileTypes';
import { specialistApi } from '@/infrastructure/api/specialistApi';
import { useAuth } from '@/application/hooks/useAuth';
import { DoctorFields } from './DoctorFields';
import { NutritionistFields } from './NutritionistFields';
import { CoachFields } from './CoachFields';

const TAG_MAX_COUNT = 10;

interface Props {
  profile: SpecialistProfileFull;
  onProfileUpdated: (updated: SpecialistProfileFull) => void;
}

function sortedJson(arr: string[]): string {
  return JSON.stringify([...arr].sort());
}

export const RoleSpecificCard: React.FC<Props> = ({ profile, onProfileUpdated }) => {
  const { t } = useTranslation();
  const { role } = useAuth();

  const [grad, setGrad] = useState<string>(profile.grad_profesional ?? '');
  const [specializariSecundare, setSpecializariSecundare] = useState<MedicalSpecialization[]>(
    profile.specializari_secundare ?? [],
  );
  const [competente, setCompetente] = useState<string[]>(profile.competente_atestate ?? []);
  const [tagInput, setTagInput] = useState('');

  const [specializareNutritie, setSpecializareNutritie] = useState<string[]>(
    profile.specializare_nutritie ?? [],
  );
  const [specializareSportiva, setSpecializareSportiva] = useState<string[]>(
    profile.specializare_sportiva ?? [],
  );
  const [filosofie, setFilosofie] = useState(profile.filosofie_profesionala ?? '');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFeedback({ type, msg });
    timerRef.current = setTimeout(() => setFeedback(null), 3000);
  };

  const isDirty = (() => {
    if (role === UserRole.DOCTOR) {
      return (
        grad !== (profile.grad_profesional ?? '') ||
        sortedJson(specializariSecundare) !== sortedJson(profile.specializari_secundare ?? []) ||
        sortedJson(competente) !== sortedJson(profile.competente_atestate ?? [])
      );
    }
    if (role === UserRole.NUTRITIONIST) {
      return (
        sortedJson(specializareNutritie) !== sortedJson(profile.specializare_nutritie ?? []) ||
        filosofie !== (profile.filosofie_profesionala ?? '')
      );
    }
    if (role === UserRole.COACH) {
      return (
        sortedJson(specializareSportiva) !== sortedJson(profile.specializare_sportiva ?? []) ||
        filosofie !== (profile.filosofie_profesionala ?? '')
      );
    }
    return false;
  })();

  const toggleSecundara = (spec: MedicalSpecialization) => {
    setSpecializariSecundare((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec],
    );
  };

  const addTag = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed || competente.includes(trimmed) || competente.length >= TAG_MAX_COUNT) return;
    setCompetente((prev) => [...prev, trimmed]);
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let payload = {};
      if (role === UserRole.DOCTOR) {
        payload = {
          grad_profesional: grad || null,
          specializari_secundare: specializariSecundare,
          competente_atestate: competente,
        };
      } else if (role === UserRole.NUTRITIONIST) {
        payload = {
          specializare_nutritie: specializareNutritie,
          filosofie_profesionala: filosofie.trim() || null,
        };
      } else if (role === UserRole.COACH) {
        payload = {
          specializare_sportiva: specializareSportiva,
          filosofie_profesionala: filosofie.trim() || null,
        };
      }
      const updated = await specialistApi.updateDetails(payload);
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
          {t('specialistProfile.sections.extendedDetails')}
        </h3>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">
        {role === UserRole.DOCTOR && (
          <DoctorFields
            primarySpec={profile.specialization ?? ''}
            grad={grad}
            onGradChange={setGrad}
            specializariSecundare={specializariSecundare}
            onToggleSecundara={toggleSecundara}
            competente={competente}
            onRemoveTag={(tag) => setCompetente((prev) => prev.filter((t) => t !== tag))}
            tagInput={tagInput}
            onTagInputChange={setTagInput}
            onTagKeyDown={handleTagKeyDown}
          />
        )}
        {role === UserRole.NUTRITIONIST && (
          <NutritionistFields
            specializareNutritie={specializareNutritie}
            onToggleNutritie={(code) =>
              setSpecializareNutritie((prev) =>
                prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
              )
            }
            filosofie={filosofie}
            onFilosofieChange={setFilosofie}
          />
        )}
        {role === UserRole.COACH && (
          <CoachFields
            specializareSportiva={specializareSportiva}
            onToggleSportiva={(code) =>
              setSpecializareSportiva((prev) =>
                prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
              )
            }
            filosofie={filosofie}
            onFilosofieChange={setFilosofie}
          />
        )}
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
          disabled={!isDirty || saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-widest transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? t('specialistProfile.saving') : t('specialistProfile.saveButton')}
        </button>
      </div>
    </div>
  );
};
