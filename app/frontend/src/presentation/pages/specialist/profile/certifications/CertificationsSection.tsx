import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, AlertCircle } from 'lucide-react';
import type { CertificationEntry } from '@/domain/models/SpecialistProfileTypes';
import { specialistApi } from '@/infrastructure/api/specialistApi';
import { ConfirmModal } from '@/presentation/components/common/ConfirmModal';
import { CertificationModal } from './CertificationModal';

interface Props {
  entries: CertificationEntry[];
  onEntriesChanged: (entries: CertificationEntry[]) => void;
}

type ExpiryStatus = 'expired' | 'soon' | 'ok';

function getExpiryStatus(expiryDateStr: string): ExpiryStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  if (expiry < today) return 'expired';
  const in60Days = new Date(today);
  in60Days.setDate(today.getDate() + 60);
  if (expiry <= in60Days) return 'soon';
  return 'ok';
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

function sortEntries(entries: CertificationEntry[]): CertificationEntry[] {
  return [...entries].sort((a, b) => b.issue_date.localeCompare(a.issue_date));
}

export const CertificationsSection: React.FC<Props> = ({ entries, onEntriesChanged }) => {
  const { t } = useTranslation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CertificationEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sorted = sortEntries(entries);

  const openAdd = () => { setEditingEntry(null); setModalOpen(true); };
  const openEdit = (entry: CertificationEntry) => { setEditingEntry(entry); setModalOpen(true); };

  const handleSaved = (saved: CertificationEntry) => {
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
      await specialistApi.deleteCertification(deleteId);
      onEntriesChanged(entries.filter((e) => e.id !== deleteId));
    } catch {
      setDeleteError(t('certifications.deleteError'));
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-brand-dark/10">
        <h3 className="text-lg font-heading text-brand-dark">
          {t('certifications.sectionTitle')}
        </h3>
      </div>

      {/* Body */}
      <div className="p-6">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-brand-dark/50">{t('certifications.empty')}</p>
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-widest transition-colors hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              {t('certifications.addButton')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((entry) => {
              const expiryStatus = entry.expiry_date ? getExpiryStatus(entry.expiry_date) : null;

              return (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-4 py-3 border-b border-brand-dark/10 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    {/* Name — Issuing body */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-brand-dark">
                        {entry.name}
                        <span className="font-normal text-brand-dark/70"> — {entry.issuing_body}</span>
                      </p>
                      {expiryStatus === 'expired' && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-widest">
                          {t('certifications.expired')}
                        </span>
                      )}
                      {expiryStatus === 'soon' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-widest">
                          {t('certifications.expiringSoon')}
                        </span>
                      )}
                    </div>
                    {/* Dates + cert number */}
                    <p className="text-xs text-brand-dark/50 mt-0.5">
                      {formatDate(entry.issue_date)}
                      {entry.expiry_date && ` – ${formatDate(entry.expiry_date)}`}
                      {entry.certification_number && (
                        <span className="ml-2 text-brand-dark/40">#{entry.certification_number}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(entry)}
                      className="text-xs font-bold text-accent hover:underline uppercase tracking-widest"
                    >
                      {t('certifications.editButton')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDeleteId(entry.id); setDeleteError(null); }}
                      className="text-xs font-bold text-secondary hover:underline uppercase tracking-widest"
                    >
                      {t('certifications.deleteButton')}
                    </button>
                  </div>
                </div>
              );
            })}
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
            {t('certifications.addButton')}
          </button>
        </div>
      )}

      <CertificationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        entry={editingEntry}
      />

      <ConfirmModal
        open={!!deleteId}
        title={t('certifications.deleteConfirmTitle')}
        message={t('certifications.confirmDelete')}
        confirmLabel={t('certifications.deleteButton')}
        cancelLabel={t('certifications.cancelButton')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
        danger
      />
    </div>
  );
};
