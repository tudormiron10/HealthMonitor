import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { MedicalRecordRead } from '@/domain/models/MedicalRecord';

interface MarkerTrendChartProps {
  records: MedicalRecordRead[];
}

export const MarkerTrendChart: React.FC<MarkerTrendChartProps> = ({ records }) => {
  const { t } = useTranslation();

  const availableMarkers = [
    { value: 'fasting_glucose', label: t('records.fastingGlucose') },
    { value: 'hba1c', label: t('records.hba1c') },
    { value: 'systolic_bp', label: t('records.systolic') },
    { value: 'diastolic_bp', label: t('records.diastolic') },
    { value: 'bmi', label: t('records.bmi') },
    { value: 'waist_circumference', label: t('records.waist') },
    { value: 'total_cholesterol', label: t('records.totalCholesterol') },
    { value: 'hdl', label: t('records.hdl') },
    { value: 'ldl', label: t('records.ldl') },
    { value: 'triglycerides', label: t('records.triglycerides') },
    { value: 'alt', label: t('records.alt') },
    { value: 'ast', label: t('records.ast') },
    { value: 'ggt', label: t('records.ggt') },
    { value: 'crp', label: t('records.crp') },
    { value: 'creatinine', label: t('records.creatinine') },
    { value: 'urea', label: t('records.urea') },
    { value: 'uacr', label: t('records.uacr') },
    { value: 'uric_acid', label: t('records.uricAcid') },
    { value: 'hemoglobin', label: t('records.hemoglobin') },
    { value: 'mcv', label: t('records.mcv') },
    { value: 'ferritin', label: t('records.ferritin') },
    { value: 'vitamin_d', label: t('records.vitaminD') },
    { value: 'folate', label: t('records.folate') }
  ].sort((a, b) => a.label.localeCompare(b.label));

  const [selectedMarker, setSelectedMarker] = useState<string>('fasting_glucose');

  const chartData = useMemo(() => {
    if (!records || !Array.isArray(records) || records.length === 0) return [];

    try {
      const sortedRecords = [...records]
        .filter(r => r && r.record_date)
        .sort((a, b) => {
          const timeA = new Date(a.record_date).getTime();
          const timeB = new Date(b.record_date).getTime();
          if (isNaN(timeA) || isNaN(timeB)) return 0;
          const byDate = timeA - timeB;
          if (byDate !== 0) return byDate;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

      return sortedRecords
        .map((record, index) => {
          const markers = (record.raw_markers || {}) as Record<string, number | undefined>;
          const baseDate = new Date(record.record_date).toLocaleDateString();
          return {
            date: `${baseDate} (Set ${index + 1})`,
            value: markers[selectedMarker] ?? 0
          };
        });
    } catch (err) {
      console.error("Error processing chart data:", err);
      return [];
    }
  }, [records, selectedMarker]);

  return (
    <div className="bg-white/80 border border-brand-light shadow-xl shadow-brand-dark/5 rounded-3xl p-6 backdrop-blur-sm w-full h-full flex flex-col">

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-2xl font-iceland text-brand-dark tracking-wide">
            {t('trendChart.title')}
          </h3>
          <p className="text-xs font-mono text-brand-dark/50 uppercase tracking-widest mt-1">
            {t('trendChart.subtitle')}
          </p>
        </div>

        <select
          value={selectedMarker}
          onChange={(e) => setSelectedMarker(e.target.value)}
          className="bg-white/40 border border-brand-light/80 text-brand-dark px-4 py-2 rounded-xl shadow-sm backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary cursor-pointer text-sm font-medium"
        >
          {availableMarkers.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Chart Area */}
      <div className="flex-1 w-full min-h-75">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={false}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold', color: '#0a0a0a' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={t('trendChart.value')}
                stroke="#a80c1e"
                strokeWidth={3}
                dot={{ fill: '#a80c1e', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#48a698' }}
                animationDuration={1500}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-dark/40 font-mono text-sm">
            {t('trendChart.noData')}
          </div>
        )}
      </div>

    </div>
  );
};
