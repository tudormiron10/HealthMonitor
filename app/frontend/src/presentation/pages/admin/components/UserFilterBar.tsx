import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

export type Tab = 'all' | 'PATIENT' | 'DOCTOR' | 'NA';

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
}

export const UserFilterBar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  searchInput,
  onSearchChange,
}) => {
  const { t } = useTranslation();

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all',     label: t('adminDashboard.users.tabs.all')     },
    { key: 'PATIENT', label: t('adminDashboard.users.tabs.patients') },
    { key: 'DOCTOR',  label: t('adminDashboard.users.tabs.doctors')  },
    { key: 'NA',      label: t('adminDashboard.users.tabs.na')       },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      <div className="flex gap-1 bg-white/60 border border-brand-dark/10 rounded-xl p-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === key
                ? 'bg-primary text-brand-light shadow-sm'
                : 'text-brand-dark/60 hover:text-brand-dark'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40" />
        <input
          type="text"
          value={searchInput}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={t('adminDashboard.users.searchPlaceholder')}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-brand-dark/10 bg-white/70 text-sm text-brand-dark placeholder:text-brand-dark/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        />
      </div>
    </div>
  );
};
