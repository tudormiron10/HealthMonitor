import { useTranslation } from 'react-i18next';
import {
  HeartPulse,
  Activity,
  Layers,
  Droplet,
  Filter,
  Hexagon,
  Gauge,
  TrendingUp,
} from 'lucide-react';

const CONDITIONS = [
  { key: 'cardiovascular', Icon: HeartPulse },
  { key: 'diabetes', Icon: Activity },
  { key: 'metabolicSyndrome', Icon: Layers },
  { key: 'hepaticSteatosis', Icon: Droplet },
  { key: 'ckd', Icon: Filter },
  { key: 'anemia', Icon: Hexagon },
  { key: 'hypertension', Icon: Gauge },
  { key: 'dyslipidemia', Icon: TrendingUp },
] as const;

export const PlatformConditions: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-16">
      {/* Section header */}
      <div className="max-w-4xl space-y-4">
        <p className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-accent">
          {t('platform.conditions.sectionLabel')}
        </p>
        <h2 className="text-4xl md:text-6xl font-heading tracking-wide text-brand-dark">
          {t('platform.conditions.title')}
        </h2>
        <p className="text-lg text-brand-dark/60 leading-relaxed max-w-2xl">
          {t('platform.conditions.subtitle')}
        </p>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CONDITIONS.map(({ key, Icon }) => (
          <div
            key={key}
            className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all p-6 space-y-4 flex flex-col"
          >
            <div className="bg-accent/10 rounded-xl w-10 h-10 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-accent" />
            </div>

            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-brand-dark/40">
              {t(`platform.conditions.${key}.tag`)}
            </span>

            <h3 className="text-2xl font-heading text-primary tracking-wide">
              {t(`platform.conditions.${key}.name`)}
            </h3>

            <p className="text-sm text-brand-dark/70 leading-relaxed flex-1">
              {t(`platform.conditions.${key}.description`)}
            </p>

            <p className="mt-auto pt-4 border-t border-brand-dark/10 text-xs italic text-secondary leading-snug">
              {t(`platform.conditions.${key}.stat`)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
