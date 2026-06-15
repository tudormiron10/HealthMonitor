import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, AlertCircle } from 'lucide-react';
import type { WorkExperienceEntry } from '@/domain/models/SpecialistProfileTypes';
import { specialistApi } from '@/infrastructure/api/specialistApi';
import { ConfirmModal } from '@/presentation/components/common/ConfirmModal';
import { WorkExperienceModal } from './WorkExperienceModal';

interface Prefill {
  employer: string;
  location?: string;
}

interface Props {
  entries: WorkExperienceEntry[];
  onEntriesChanged: (entries: WorkExperienceEntry[]) => void;
  prefillFromDeprecated?: Prefill | null;
}

function formatMonthYear(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  return `${month}/${year}`;
}

function sortEntries(entries: WorkExperienceEntry[]): WorkExperienceEntry[] {
  return [...entries].sort((a, b) => {
    if (!a.end_date && b.end_date) return -1;
    if (a.end_date && !b.end_date) return 1;
    if (!a.end_date && !b.end_date) return b.start_date.localeCompare(a.start_date);
    const endCmp = b.end_date!.localeCompare(a.end_date!);
    return endCmp !== 0 ? endCmp : b.start_date.localeCompare(a.start_date);
  });
}

export const WorkExperienceSection: React.FC<Props> = ({
  entries,
  onEntriesChanged,
  prefillFromDeprecated,
}) => {
  const { t } = useTranslation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkExperienceEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sorted = sortEntries(entries);

  const openAdd = () => {
    setEditingEntry(null);
    setModalOpen(true);
  };

  const openEdit = (entry: WorkExperienceEntry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  };

  const handleSaved = (saved: WorkExperienceEntry) => {
    const isNew = !entries.find((e) => e.id === saved.id);
    const updated = isNew
      ? [...entries, saved]
      : entries.map((e) => (e.id === saved.id ? saved : e));
    onEntriesChanged(updated);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleteError(null);
    try {
      await specialistApi.deleteWorkExperience(deleteId);
      onEntriesChanged(entries.filter((e) => e.id !== deleteId));
    } catch {
      setDeleteError(t('workExperience.deleteError'));
    } finally {
      setDeleteId(null);
    }
  };

  const prefillForModal = entries.length === 0 ? (prefillFromDeprecated ?? null) : null;

  return (
    <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-brand-dark/10">
        <h3 className="text-lg font-heading text-brand-dark">
          {t('workExperience.sectionTitle')}
        </h3>
      </div>

      {/* Body */}
      <div className="p-6">
        {sorted.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-brand-dark/50">{t('workExperience.empty')}</p>
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-widest transition-colors hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              {t('workExperience.addButton')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-4 py-3 border-b border-brand-dark/10 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  {/* Title — Employer (Location) */}
                  <p className="text-sm font-bold text-brand-dark">
                    {entry.title}
                    <span className="font-normal text-brand-dark/70"> — {entry.employer}</span>
                    {entry.location && (
                      <span className="font-normal text-brand-dark/40"> ({entry.location})</span>
                    )}
                  </p>
                  {/* Period */}
                  <p className="text-xs text-brand-dark/50 mt-0.5">
                    {formatMonthYear(entry.start_date)}
                    {' – '}
                    {entry.end_date ? formatMonthYear(entry.end_date) : t('workExperience.present')}
                  </p>
                  {/* Description */}
                  {entry.description && (
                    <p className="text-xs text-brand-dark/60 mt-1 leading-relaxed">
                      {entry.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(entry)}
                    className="text-xs font-bold text-accent hover:underline uppercase tracking-widest"
                  >
                    {t('workExperience.editButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteId(entry.id); setDeleteError(null); }}
                    className="text-xs font-bold text-secondary hover:underline uppercase tracking-widest"
                  >
                    {t('workExperience.deleteButton')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete error */}
        {deleteError && (
          <div className="flex items-center gap-1.5 mt-3 text-sm text-secondary">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {deleteError}
          </div>
        )}
      </div>

      {/* Footer with Add button (only shown when there are entries) */}
      {sorted.length > 0 && (
        <div className="px-6 py-4 border-t border-brand-dark/10">
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-widest transition-colors hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            {t('workExperience.addButton')}
          </button>
        </div>
      )}

      {/* Add / Edit modal */}
      <WorkExperienceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        entry={editingEntry}
        prefill={editingEntry ? null : prefillForModal}
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={!!deleteId}
        title={t('workExperience.deleteConfirmTitle')}
        message={t('workExperience.confirmDelete')}
        confirmLabel={t('workExperience.deleteButton')}
        cancelLabel={t('workExperience.cancelButton')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
        danger
      />
    </div>
  );
};
