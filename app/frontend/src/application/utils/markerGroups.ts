// Clinical UI grouping of the 26 markers. Must stay in sync with the backend
// MARKER_GROUPS in core/constants.py.
export const MARKER_GROUPS: Record<string, string[]> = {
  universal: ['sex', 'age', 'bmi'],
  cardiovascular: ['systolic_bp', 'diastolic_bp', 'total_cholesterol', 'ldl', 'hdl', 'triglycerides', 'smoker_status', 'crp'],
  metabolic: ['fasting_glucose', 'hba1c', 'waist_circumference', 'uacr', 'vitamin_d'],
  hepatic: ['alt', 'ast', 'ggt'],
  renal: ['creatinine', 'urea', 'uric_acid'],
  hematological: ['hemoglobin', 'mcv', 'ferritin', 'folate'],
};
