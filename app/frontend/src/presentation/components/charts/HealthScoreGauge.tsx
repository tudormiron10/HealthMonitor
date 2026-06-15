import React from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface HealthScoreGaugeProps {
  healthScore: number;
}

export const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({ healthScore }) => {
  const { t } = useTranslation();

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#2e3d24';
    if (score >= 40) return '#f59e0b';
    return '#dc2626';
  };

  const gaugeData = [
    { name: 'Score', value: healthScore },
    { name: 'Remaining', value: 100 - healthScore },
  ];

  return (
    <div className="bg-white/80 border border-brand-light shadow-xl shadow-brand-dark/5 rounded-3xl p-8 backdrop-blur-sm h-full flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-primary via-accent to-brand-dark opacity-80"></div>

      <h3 className="text-xl font-heading text-brand-dark/70 uppercase tracking-widest mb-8">
        {t('predictions.healthScore.title')}
      </h3>

      <div className="relative w-full h-45 flex items-end justify-center mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={110}
              outerRadius={140}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              cornerRadius={10}
            >
              <Cell fill={getScoreColor(healthScore)} />
              <Cell fill="#f3f4f6" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute bottom-4 flex flex-col items-center">
          <span className="text-6xl font-iceland text-brand-dark" style={{ color: getScoreColor(healthScore) }}>
            {healthScore}
          </span>
          <span className="text-xs font-mono tracking-widest text-brand-dark/50 uppercase mt-1">
            / 100
          </span>
        </div>
      </div>

      <p className="text-center text-brand-dark/70 leading-relaxed mt-4">
        {t('predictions.healthScore.description')}
      </p>
    </div>
  );
};
