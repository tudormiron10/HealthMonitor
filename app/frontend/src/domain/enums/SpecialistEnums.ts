export const MedicGrade = {
  REZIDENT: 'REZIDENT',
  SPECIALIST: 'SPECIALIST',
  PRIMAR: 'PRIMAR',
} as const;
export type MedicGrade = (typeof MedicGrade)[keyof typeof MedicGrade];

export const LanguageCode = {
  RO: 'RO',
  EN: 'EN',
  FR: 'FR',
  DE: 'DE',
  ES: 'ES',
  IT: 'IT',
  OTHER: 'OTHER',
} as const;
export type LanguageCode = (typeof LanguageCode)[keyof typeof LanguageCode];

export const NutritionSpecialization = {
  CLINICA: 'CLINICA',
  SPORTIVA: 'SPORTIVA',
  PEDIATRICA: 'PEDIATRICA',
  ONCOLOGICA: 'ONCOLOGICA',
  SARCINA: 'SARCINA',
  ALTELE: 'ALTELE',
} as const;
export type NutritionSpecialization = (typeof NutritionSpecialization)[keyof typeof NutritionSpecialization];

export const SportSpecialization = {
  FITNESS_GENERAL: 'FITNESS_GENERAL',
  CULTURISM: 'CULTURISM',
  RECUPERARE: 'RECUPERARE',
  NUTRITIE_SPORTIVA: 'NUTRITIE_SPORTIVA',
  YOGA: 'YOGA',
  PILATES: 'PILATES',
  ATLETISM: 'ATLETISM',
  ALTELE: 'ALTELE',
} as const;
export type SportSpecialization = (typeof SportSpecialization)[keyof typeof SportSpecialization];
