import { useTranslation } from 'react-i18next';
import { User, HeartPulse, Activity, Droplet, Filter, Hexagon } from 'lucide-react';

const GROUPS = [
  {
    key: 'groupUniversal',
    Icon: User,
    markers: ['sex', 'age', 'bmi'],
  },
  {
    key: 'groupCardiovascular',
    Icon: HeartPulse,
    markers: ['systolic_bp', 'diastolic_bp', 'total_cholesterol', 'ldl', 'hdl', 'triglycerides', 'crp', 'smoker_status'],
  },
  {
    key: 'groupMetabolic',
    Icon: Activity,
    markers: ['fasting_glucose', 'hba1c', 'waist_circumference', 'uacr', 'vitamin_d'],
  },
  {
    key: 'groupHepatic',
    Icon: Droplet,
    markers: ['alt', 'ast', 'ggt'],
  },
  {
    key: 'groupRenal',
    Icon: Filter,
    markers: ['creatinine', 'urea', 'uric_acid'],
  },
  {
    key: 'groupHematological',
    Icon: Hexagon,
    markers: ['hemoglobin', 'mcv', 'ferritin', 'folate'],
  },
] as const;

export const PlatformMarkers: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-16">
      {/* Section header */}
      <div className="max-w-4xl space-y-4">
        <p className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-accent">
          {t('platform.markers.sectionLabel')}
        </p>
        <h2 className="text-4xl md:text-6xl font-heading tracking-wide text-brand-dark">
          {t('platform.markers.title')}
        </h2>
        <p className="text-lg text-brand-dark/60 leading-relaxed max-w-2xl">
          {t('platform.markers.subtitle')}
        </p>
      </div>

      {/* Group grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {GROUPS.map(({ key, Icon, markers }) => (
          <div
            key={key}
            className="bg-bg-main rounded-3xl border border-brand-dark/15 p-8 space-y-5 hover:bg-bg-main/50 transition-colors"
          >
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="bg-primary/10 rounded-lg w-8 h-8 p-2 flex items-center justify-center">
                <Icon className="text-primary w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold tracking-[0.2em] uppercase text-accent">
                {t(`platform.markers.${key}.count`)}
              </span>
            </div>

            <h3 className="text-3xl font-heading text-brand-dark tracking-wide">
              {t(`platform.markers.${key}.title`)}
            </h3>

            <p className="text-sm text-brand-dark/70 leading-relaxed">
              {t(`platform.markers.${key}.description`)}
            </p>

            {/* Marker pills */}
            <div>
              {markers.map((mk) => (
                <span
                  key={mk}
                  className="inline-block text-[11px] font-mono uppercase tracking-wider px-2 py-1 rounded-full bg-white/80 border border-brand-dark/10 text-brand-dark/70 mr-1 mt-1"
                >
                  {t(`markers.${mk}`)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-brand-dark/50 italic text-center mt-12">
        {t('platform.markers.extractionNote')}
      </p>
    </div>
  );
};
