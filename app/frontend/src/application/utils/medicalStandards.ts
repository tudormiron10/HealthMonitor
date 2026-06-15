export type TrendType = 'lower' | 'higher' | 'range' | 'neutral';

export interface MedicalStandard {
  label: string;
  trend: TrendType;
  idealValue?: number;
}

/**
 * Clinical reference ranges and improvement directions for all tracked markers.
 *
 * Trend classification:
 *   'lower'  — lower values indicate better health (e.g. LDL, fasting glucose)
 *   'higher' — higher values indicate better health (e.g. HDL, haemoglobin)
 *   'range'  — health improves as value approaches idealValue (e.g. BMI, MCV)
 *   'neutral'— no universal clinical direction (demographics: sex, age)
 *
 * Sources: ACC/AHA 2018 lipid guidelines, ADA 2024 glycaemic targets,
 * WHO anemia thresholds, KDIGO 2022 CKD criteria, JNC 8 BP targets.
 */
export const MEDICAL_STANDARDS: Record<string, MedicalStandard> = {
  // Glycaemic
  hba1c:           { label: '< 5.7 %',              trend: 'lower' },
  fasting_glucose: { label: '< 100 mg/dL',           trend: 'lower' },

  // Lipids
  ldl:             { label: '< 100 mg/dL',           trend: 'lower' },
  total_cholesterol: { label: '< 200 mg/dL',         trend: 'lower' },
  triglycerides:   { label: '< 150 mg/dL',           trend: 'lower' },
  hdl:             { label: '> 40 (M) / > 50 (F)',   trend: 'higher' },

  // Blood pressure
  systolic_bp:     { label: '< 130 mmHg',            trend: 'lower' },
  diastolic_bp:    { label: '< 85 mmHg',             trend: 'lower' },

  // Anthropometrics
  bmi:             { label: '18.5 – 24.9',           trend: 'range', idealValue: 21.7 },
  waist_circumference: { label: '< 102 (M) / < 88 (F) cm', trend: 'lower' },

  // Haematology
  hemoglobin:      { label: '> 13.0 (M) / > 12.0 (F) g/dL', trend: 'higher' },
  mcv:             { label: '80 – 100 fL',           trend: 'range', idealValue: 90 },
  ferritin:        { label: '30 – 300 (M) / 15 – 200 (F) ng/mL', trend: 'range', idealValue: 100 },

  // Liver enzymes — elevated values indicate hepatocellular damage or cholestasis
  alt:             { label: '< 40 U/L',              trend: 'lower' },
  ast:             { label: '< 40 U/L',              trend: 'lower' },
  ggt:             { label: '< 60 U/L',              trend: 'lower' },

  // Inflammation
  crp:             { label: '< 3.0 mg/L',            trend: 'lower' },

  // Renal
  creatinine:      { label: '< 1.3 (M) / < 1.0 (F) mg/dL', trend: 'lower' },
  urea:            { label: '< 50 mg/dL',            trend: 'lower' },
  uacr:            { label: '< 30 mg/g',             trend: 'lower' },
  uric_acid:       { label: '< 7.0 (M) / < 6.0 (F) mg/dL', trend: 'lower' },

  // Nutrition & vitamins
  vitamin_d:       { label: '> 30 ng/mL',            trend: 'higher' },
  folate:          { label: '> 4.0 ng/mL',           trend: 'higher' },

  // Lifestyle (binary / ordinal — lower ordinal score is better)
  smoker_status:   { label: '0 = non-smoker',        trend: 'lower' },

  // Demographics — no universal improvement direction
  sex:             { label: '1 = M, 2 = F',          trend: 'neutral' },
  age:             { label: 'years',                  trend: 'neutral' },
};

export const getTrendColor = (newerVal: number, olderVal: number, markerKey: string): { color: string, symbol: string } => {
  const diff = newerVal - olderVal;
  if (Math.abs(diff) < 0.01) return { color: 'text-yellow-500', symbol: '=' };

  const standard = MEDICAL_STANDARDS[markerKey];
  const directionSymbol = diff > 0 ? '↑' : '↓';

  if (!standard || standard.trend === 'neutral') {
    return { color: 'text-yellow-500', symbol: directionSymbol };
  }

  if (standard.trend === 'lower') {
    return {
      color: diff < 0 ? 'text-emerald-500' : 'text-rose-500',
      symbol: directionSymbol,
    };
  }

  if (standard.trend === 'higher') {
    return {
      color: diff > 0 ? 'text-emerald-500' : 'text-rose-500',
      symbol: directionSymbol,
    };
  }

  if (standard.trend === 'range' && standard.idealValue !== undefined) {
    const distNewer = Math.abs(newerVal - standard.idealValue);
    const distOlder = Math.abs(olderVal - standard.idealValue);
    if (Math.abs(distNewer - distOlder) < 0.01) return { color: 'text-yellow-500', symbol: directionSymbol };
    return {
      color: distNewer < distOlder ? 'text-emerald-500' : 'text-rose-500',
      symbol: directionSymbol,
    };
  }

  return { color: 'text-brand-dark/60', symbol: directionSymbol };
};
