import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { CertificationEntry } from '@/domain/models/SpecialistProfileTypes';
import { specialistApi } from '@/infrastructure/api/specialistApi';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (entry: CertificationEntry) => void;
  entry?: CertificationEntry | null;
}

export const CertificationModal: React.FC<Props> = ({ open, onClose, onSaved, entry }) => {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [certificationNumber, setCertificationNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [noExpiry, setNoExpiry] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!entry;

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setName(entry.name);
      setIssuingBody(entry.issuing_body);
      setCertificationNumber(entry.certification_number ?? '');
      setIssueDate(entry.issue_date);
      setExpiryDate(entry.expiry_date ?? '');
      setNoExpiry(!entry.expiry_date);
    } else {
      setName('');
      setIssuingBody('');
      setCertificationNumber('');
      setIssueDate('');
      setExpiryDate('');
      setNoExpiry(false);
    }
    setErrors({});
  }, [open, entry]);

  if (!open) return null;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'required';
    if (!issuingBody.trim()) next.issuingBody = 'required';
    if (!issueDate) next.issueDate = 'required';
    if (!noExpiry && expiryDate && expiryDate < issueDate) next.expiryDate = 'invalid';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        issuing_body: issuingBody.trim(),
        certification_number: certificationNumber.trim() || null,
        issue_date: issueDate,
        expiry_date: noExpiry ? null : (expiryDate || null),
      };
      const saved = isEdit && entry
        ? await specialistApi.updateCertification(entry.id, payload)
        : await specialistApi.addCertification(payload);
      onSaved(saved);
      onClose();
    } catch {
      setErrors({ submit: t('certifications.saveError') });
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = (field: string) =>
    `w-full rounded-xl border bg-white/80 px-4 py-2.5 text-sm text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-accent/30 ${
      errors[field] ? 'border-secondary/60' : 'border-brand-dark/20'
    }`;

  const labelClass = 'text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50 block mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border border-brand-dark/10 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-dark/10">
          <h2 className="text-lg font-heading text-brand-dark">
            {isEdit ? t('certifications.modalTitleEdit') : t('certifications.modalTitleAdd')}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className={labelClass}>{t('certifications.fields.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 200))}
              className={fieldClass('name')}
            />
          </div>

          {/* Issuing body */}
          <div>
            <label className={labelClass}>{t('certifications.fields.issuingBody')}</label>
            <input
              type="text"
              value={issuingBody}
              onChange={(e) => setIssuingBody(e.target.value.slice(0, 200))}
              className={fieldClass('issuingBody')}
            />
          </div>

          {/* Certification number */}
          <div>
            <label className={labelClass}>{t('certifications.fields.certificationNumber')}</label>
            <input
              type="text"
              value={certificationNumber}
              onChange={(e) => setCertificationNumber(e.target.value.slice(0, 100))}
              className={fieldClass('certificationNumber')}
            />
          </div>

          {/* Issue date */}
          <div>
            <label className={`${labelClass} ${errors.issueDate ? 'text-secondary' : ''}`}>
              {t('certifications.fields.issueDate')}
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className={fieldClass('issueDate')}
            />
          </div>

          {/* No-expiry checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noExpiry}
              onChange={(e) => {
                setNoExpiry(e.target.checked);
                if (e.target.checked) setExpiryDate('');
              }}
              className="w-4 h-4 rounded accent-accent"
            />
            <span className="text-sm text-brand-dark">{t('certifications.noExpiry')}</span>
          </label>

          {/* Expiry date */}
          {!noExpiry && (
            <div>
              <label className={`${labelClass} ${errors.expiryDate ? 'text-secondary' : ''}`}>
                {t('certifications.fields.expiryDate')}
              </label>
              <input
                type="date"
                value={expiryDate}
                min={issueDate || undefined}
                onChange={(e) => setExpiryDate(e.target.value)}
                className={fieldClass('expiryDate')}
              />
            </div>
          )}

          {errors.submit && (
            <p className="text-sm text-secondary">{errors.submit}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brand-dark/10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-brand-dark/5 hover:bg-brand-dark/10 text-brand-dark text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-40"
          >
            {t('certifications.cancelButton')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-widest transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('certifications.saveButton')}
          </button>
        </div>
      </div>
    </div>
  );
};
