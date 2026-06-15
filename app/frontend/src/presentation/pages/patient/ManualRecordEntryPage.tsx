import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { recordsApi } from '@/infrastructure/api/recordsApi';
import type { MedicalRecordCreate } from "@/domain/models/MedicalRecord";
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

import { ManualEntryForm } from './components/ManualEntryForm';
import { PdfUploadZone } from './components/PdfUploadZone';

type ActiveTab = 'manual' | 'pdf';

export const ManualRecordEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch } = useForm();
  const watchedValues = watch();
  const filledCount = Object.entries(watchedValues)
    .filter(([key, val]) => key !== 'record_date' && val !== '' && val !== undefined && val !== null)
    .length;
  const canSubmit = !!watchedValues.sex && !!watchedValues.age;
  const [uploadedDocumentUrl, setUploadedDocumentUrl] = useState<string | null>(null);

  const onManualSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError(null);

    const markers: any = {};
    Object.keys(data).forEach((key) => {
      if (key !== 'record_date' && key !== 'document_url') {
        if (data[key] !== '' && data[key] !== null && data[key] !== undefined) {
          markers[key] = Number(data[key]);
        }
      }
    });

    const payload: MedicalRecordCreate = {
      record_date: data.record_date || new Date().toISOString().split('T')[0],
      markers,
      document_url: uploadedDocumentUrl || undefined,
    };

    try {
      const response = await recordsApi.createManualRecord(payload);
      navigate(`/dashboard/patient/predictions/${response.id}`);
    } catch (err: any) {
      console.error(err);
      setError(t('records.errors.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePdfUploadSuccess = (extractedMarkers: any, documentUrl: string, recordDate: string) => {
    setSuccessMessage(t('records.success.parsed'));
    setUploadedDocumentUrl(documentUrl);
    reset({
      record_date: recordDate,
      ...extractedMarkers
    });
    setActiveTab('manual');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-slide-up">
      {/* Header */}
      <div className="relative bg-brand-dark text-brand-light rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl mb-8">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(57,115,103,0.4),transparent_50%)]"></div>
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,rgba(193,124,116,0.3),transparent_50%)]"></div>
        
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-iceland tracking-wide mb-1 text-brand-light">{t('records.title')}</h2>
            <p className="text-brand-light/70 font-mono text-xs md:text-sm tracking-widest uppercase mt-2">
              {t('records.subtitle')}
            </p>
          </div>
          <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-full bg-brand-light/5 border border-brand-light/10">
            <FileText className="w-8 h-8 text-accent animate-pulse" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => { setActiveTab('manual'); setError(null); setSuccessMessage(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-iceland text-xl tracking-wider transition-all duration-500 ${
            activeTab === 'manual'
              ? 'bg-primary text-brand-light shadow-xl shadow-primary/30 scale-[1.01] border border-primary-hover'
              : 'bg-white/50 border border-brand-dark/10 text-brand-dark/60 hover:bg-white hover:text-primary hover:shadow-sm'
          }`}
        >
          <FileText className="w-5 h-5" />
          {t('records.tabManual')}
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('pdf'); setError(null); setSuccessMessage(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-iceland text-xl tracking-wider transition-all duration-500 ${
            activeTab === 'pdf'
              ? 'bg-primary text-brand-light shadow-xl shadow-primary/30 scale-[1.01] border border-primary-hover'
              : 'bg-white/50 border border-brand-dark/10 text-brand-dark/60 hover:bg-white hover:text-primary hover:shadow-sm'
          }`}
        >
          <Upload className="w-5 h-5" />
          {t('records.tabPdf')}
        </button>
      </div>

      {/* Error / Success Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-700 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-700 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Content Rendering */}
      {activeTab === 'manual' ? (
        <ManualEntryForm
          register={register}
          handleSubmit={handleSubmit}
          onSubmit={onManualSubmit}
          isSubmitting={isSubmitting}
          canSubmit={canSubmit}
          filledCount={filledCount}
        />
      ) : (
        <PdfUploadZone 
          onUploadSuccess={handlePdfUploadSuccess}
          onError={(msg) => setError(msg)}
        />
      )}
    </div>
  );
};

