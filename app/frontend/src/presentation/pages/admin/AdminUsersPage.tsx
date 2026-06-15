import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { adminApi } from '@/infrastructure/api/adminApi';
import { ConfirmModal } from '@/presentation/components/common/ConfirmModal';
import type { UserAdmin } from '@/domain/models/AdminTypes';
import { UserFilterBar, type Tab } from './components/UserFilterBar';
import { UserTableRow } from './components/UserTableRow';

const PAGE_SIZE = 25;

function getInitialTab(roleParam: string | null): Tab {
  if (roleParam === 'PATIENT') return 'PATIENT';
  if (roleParam === 'DOCTOR') return 'DOCTOR';
  if (roleParam === 'NUTRITIONIST' || roleParam === 'COACH') return 'NA';
  return 'all';
}

export const AdminUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [allUsers, setAllUsers] = useState<UserAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(() => getInitialTab(searchParams.get('role')));
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [toggleTarget, setToggleTarget] = useState<UserAdmin | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.listUsers({ limit: 100 })
      .then(setAllUsers)
      .catch(() => setError(t('adminDashboard.errorLoad')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filtered = useMemo(() => {
    let list = allUsers;
    if (activeTab === 'PATIENT') list = list.filter(u => u.role === 'PATIENT');
    else if (activeTab === 'DOCTOR') list = list.filter(u => u.role === 'DOCTOR');
    else if (activeTab === 'NA') list = list.filter(u => u.role === 'NUTRITIONIST' || u.role === 'COACH');

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(u =>
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allUsers, activeTab, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleTabChange = (tab: Tab) => { setActiveTab(tab); setPage(0); };

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    const target = toggleTarget;
    setToggleTarget(null);
    setToggleError(null);
    try {
      const updated = await adminApi.toggleUserActive(target.id);
      setAllUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    } catch (err: any) {
      setToggleError(err.response?.data?.detail || t('adminDashboard.users.toggle.error'));
    }
  };

  const toggleName = toggleTarget
    ? `${toggleTarget.first_name} ${toggleTarget.last_name}`.trim() || toggleTarget.email
    : '';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading text-brand-dark">{t('adminDashboard.users.title')}</h1>
          {!loading && (
            <p className="text-sm text-brand-dark/50 mt-1">
              {filtered.length} {t('adminDashboard.users.resultCount')}
            </p>
          )}
        </div>
        <Link
          to="/dashboard/admin"
          className="flex items-center gap-2 text-sm text-brand-dark/60 hover:text-brand-dark transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('adminDashboard.users.backToDashboard')}
        </Link>
      </div>

      {toggleError && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-600 rounded-lg text-sm font-medium">
          {toggleError}
        </div>
      )}

      <UserFilterBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
      />

      <div className="bg-white/70 border border-brand-dark/10 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-brand-dark/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-medium">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-dark/10 bg-brand-light/40">
                {['name', 'email', 'role', 'status', 'createdAt'].map(col => (
                  <th
                    key={col}
                    className={`text-left px-4 py-3 font-bold tracking-widest uppercase text-brand-dark/50 text-xs ${
                      col === 'email'     ? 'hidden md:table-cell' :
                      col === 'status'    ? 'hidden sm:table-cell' :
                      col === 'createdAt' ? 'hidden lg:table-cell' : ''
                    }`}
                  >
                    {t(`adminDashboard.users.columns.${col}`)}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pageUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-brand-dark/40 font-medium">
                    {t('adminDashboard.users.empty')}
                  </td>
                </tr>
              ) : (
                pageUsers.map(user => (
                  <UserTableRow
                    key={user.id}
                    user={user}
                    onToggleRequest={setToggleTarget}
                  />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 rounded-xl border border-brand-dark/10 font-medium text-brand-dark/70 hover:bg-brand-light/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('adminDashboard.users.pagination.prev')}
          </button>
          <span className="text-brand-dark/50 font-medium">
            {t('adminDashboard.users.pagination.page', { current: page + 1, total: totalPages })}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 rounded-xl border border-brand-dark/10 font-medium text-brand-dark/70 hover:bg-brand-light/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('adminDashboard.users.pagination.next')}
          </button>
        </div>
      )}

      <ConfirmModal
        open={!!toggleTarget}
        title={toggleTarget?.is_active
          ? t('adminDashboard.users.toggle.deactivateTitle')
          : t('adminDashboard.users.toggle.activateTitle')}
        message={toggleTarget?.is_active
          ? t('adminDashboard.users.toggle.deactivateMessage', { name: toggleName })
          : t('adminDashboard.users.toggle.activateMessage',  { name: toggleName })}
        onConfirm={handleToggleConfirm}
        onCancel={() => setToggleTarget(null)}
        danger={toggleTarget?.is_active ?? false}
      />
    </div>
  );
};
