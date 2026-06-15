import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, AlertCircle } from 'lucide-react';
import type { EducationEntry } from '@/domain/models/SpecialistProfileTypes';
import { specialistApi } from '@/infrastructure/api/specialistApi';
import { ConfirmModal } from '@/presentation/components/common/ConfirmModal';
import { EducationModal } from './EducationModal';

interface Props {
  entries: EducationEntry[];
  onEntriesChanged: (entries: EducationEntry[]) => void;
}

function sortEntries(entries: EducationEntry[]): EducationEntry[] {
  return [...entries].sort((a, b) => b.year_completed - a.year_completed);
}

export const EducationSection: React.FC<Props> = ({ entries, onEntriesChanged }) => {
  const { t } = useTranslation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EducationEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sorted = sortEntries(entries);

  const openAdd = () => { setEditingEntry(null); setModalOpen(true); };
  const openEdit = (entry: EducationEntry) => { setEditingEntry(entry); setModalOpen(true); };

  const handleSaved = (saved: EducationEntry) => {
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
      await specialistApi.deleteEducation(deleteId);
      onEntriesChanged(entries.filter((e) => e.id !== deleteId));
    } catch {
      setDeleteError(t('education.deleteError'));
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-brand-dark/10">
        <h3 className="text-lg font-heading text-brand-dark">
          {t('education.sectionTitle')}
        </h3>
      </div>

      {/* Body */}
      <div className="p-6">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-brand-dark/50">{t('education.empty')}</p>
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-widest transition-colors hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              {t('education.addButton')}
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
                  {/* Degree — Institution */}
                  <p className="text-sm font-bold text-brand-dark">
                    {entry.degree}
                    <span className="font-normal text-brand-dark/70"> — {entry.institution}</span>
                  </p>
                  {/* Field of study + year */}
                  <p className="text-xs text-brand-dark/50 mt-0.5">
                    {entry.field_of_study ? `${entry.field_of_study} · ` : ''}
                    {entry.year_completed}
                  </p>
                  {/* Honors */}
                  {entry.honors && (
                    <p className="text-xs text-accent mt-0.5">{entry.honors}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(entry)}
                    className="text-xs font-bold text-accent hover:underline uppercase tracking-widest"
                  >
                    {t('education.editButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteId(entry.id); setDeleteError(null); }}
                    className="text-xs font-bold text-secondary hover:underline uppercase tracking-widest"
                  >
                    {t('education.deleteButton')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {deleteError && (
          <div className="flex items-center gap-1.5 mt-3 text-sm text-secondary">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {deleteError}
          </div>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="px-6 py-4 border-t border-brand-dark/10">
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-widest transition-colors hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            {t('education.addButton')}
          </button>
        </div>
      )}

      <EducationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        entry={editingEntry}
      />

      <ConfirmModal
        open={!!deleteId}
        title={t('education.deleteConfirmTitle')}
        message={t('education.confirmDelete')}
        confirmLabel={t('education.deleteButton')}
        cancelLabel={t('education.cancelButton')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
        danger
      />
    </div>
  );
};
