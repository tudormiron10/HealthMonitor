import type { SpecialistProfileFull } from '@/domain/models/SpecialistProfileTypes';

export type ProfileCompletionAction =
  | 'workExperience'
  | 'education'
  | 'roleSpecific'
  | 'bio'
  | 'certifications'
  | 'photo'
  | 'languages'
  | 'workingHours';

export type ProfileCompletionTier = 'baza' | 'dezvoltare' | 'avansat' | 'complet';

export interface ProfileCompletionResult {
  percent: number;
  tier: ProfileCompletionTier;
  nextAction: ProfileCompletionAction | null;
}

function isRoleSpecificComplete(profile: SpecialistProfileFull): boolean {
  const spec = profile.specialization;
  if (spec === 'NUTRITIONIST') {
    return (
      (profile.specializare_nutritie?.length ?? 0) >= 1 &&
      (profile.filosofie_profesionala?.trim().length ?? 0) >= 1
    );
  }
  if (spec === 'COACH') {
    return (
      (profile.specializare_sportiva?.length ?? 0) >= 1 &&
      (profile.filosofie_profesionala?.trim().length ?? 0) >= 1
    );
  }
  // DOCTOR (all other specializations)
  return (
    !!profile.grad_profesional &&
    (profile.specializari_secundare?.length ?? 0) >= 1
  );
}

export function computeProfileCompletion(profile: SpecialistProfileFull): ProfileCompletionResult {
  const buckets: Array<{ action: ProfileCompletionAction; weight: number; filled: boolean }> = [
    {
      action: 'workExperience',
      weight: 25,
      filled: (profile.work_experience?.length ?? 0) >= 1,
    },
    {
      action: 'education',
      weight: 20,
      filled: (profile.education?.length ?? 0) >= 1,
    },
    {
      action: 'roleSpecific',
      weight: 15,
      filled: isRoleSpecificComplete(profile),
    },
    {
      action: 'bio',
      weight: 10,
      filled: (profile.bio?.trim().length ?? 0) >= 50,
    },
    {
      action: 'certifications',
      weight: 10,
      filled: (profile.certifications?.length ?? 0) >= 1,
    },
    {
      action: 'photo',
      weight: 10,
      filled: !!profile.photo_url,
    },
    {
      action: 'languages',
      weight: 5,
      filled: (profile.limbi_vorbite?.length ?? 0) >= 1,
    },
    {
      action: 'workingHours',
      weight: 5,
      filled: !!(profile.program_lucru?.trim()),
    },
  ];

  const percent = Math.round(
    buckets.reduce((sum, b) => sum + (b.filled ? b.weight : 0), 0),
  );

  let tier: ProfileCompletionTier;
  if (percent <= 40) {
    tier = 'baza';
  } else if (percent <= 70) {
    tier = 'dezvoltare';
  } else if (percent <= 90) {
    tier = 'avansat';
  } else {
    tier = 'complet';
  }

  const nextAction = buckets.find((b) => !b.filled)?.action ?? null;

  return { percent, tier, nextAction };
}
