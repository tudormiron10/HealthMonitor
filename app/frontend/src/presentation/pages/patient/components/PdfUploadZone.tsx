import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, X } from 'lucide-react';
import { Input } from '@/presentation/components/ui/Input';
import { recordsApi } from '@/infrastructure/api/recordsApi';
import { useChatContext } from '@/application/hooks/useChatContext';

interface PdfUploadZoneProps {
  onUploadSuccess: (markers: any, documentUrl: string, recordDate: string) => void;
  onError: (error: string) => void;
}

export const PdfUploadZone: React.FC<PdfUploadZoneProps> = ({ onUploadSuccess, onError }) => {
  const { t } = useTranslation();
  const { setIsPdfUploading } = useChatContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfRecordDate, setPdfRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onError(''); // clear error

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type !== 'application/pdf') {
        onError(t('records.errors.invalidType'));
        return;
      }
      if (droppedFile.size > 10 * 1024 * 1024) {
        onError(t('records.errors.fileTooLarge'));
        return;
      }
      setSelectedFile(droppedFile);
    }
  }, [onError, t]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    onError(''); // clear error
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        onError(t('records.errors.invalidType'));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        onError(t('records.errors.fileTooLarge'));
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsSubmitting(true);
    setIsPdfUploading(true);
    onError('');

    try {
      const response = await recordsApi.uploadPdf(selectedFile);
      setSelectedFile(null);
      onUploadSuccess(response.extracted_markers, response.document_url, pdfRecordDate);
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || err.response?.data?.message || '';
      onError(detail || t('records.errors.uploadFailed'));
    } finally {
      setIsSubmitting(false);
      setIsPdfUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date picker for PDF */}
      <section className="relative bg-white/80 p-6 rounded-2xl border border-brand-light shadow-lg backdrop-blur-sm group border-l-4 border-l-secondary-soft">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(193,124,116,0.05),transparent_50%)]"></div>
        <h3 className="text-2xl font-iceland text-brand-dark flex items-center justify-between border-b border-brand-dark/10 pb-3 mb-5 relative z-10">
          {t('records.generalInfo')}
          <span className="text-[10px] font-mono text-secondary-soft tracking-[0.2em] uppercase">SYSTEM SYNC</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
          <Input
            label={t('records.date')}
            type="date"
            value={pdfRecordDate}
            onChange={(e) => setPdfRecordDate(e.target.value)}
          />
        </div>
      </section>

      {/* Drop Zone */}
      <section className="relative bg-white/80 p-6 rounded-2xl border border-brand-light shadow-lg backdrop-blur-sm group border-l-4 border-l-primary">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(46,61,36,0.05),transparent_50%)]"></div>
        <h3 className="text-2xl font-iceland text-brand-dark flex items-center justify-between border-b border-brand-dark/10 pb-3 mb-5 relative z-10">
          {t('records.uploadTitle')}
          <span className="text-[10px] font-mono text-primary tracking-[0.2em] uppercase">DOCUMENT INGESTION</span>
        </h3>
        
        {!selectedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer group ${
              isDragOver
                ? 'border-accent bg-accent/5 scale-[1.01]'
                : 'border-brand-dark/20 hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="pdf-upload-input"
            />
            <div className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                isDragOver ? 'bg-accent/20 text-accent scale-110' : 'bg-primary/10 text-primary group-hover:scale-105'
              }`}>
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <p className="text-lg font-heading text-brand-dark mb-1">
                  {isDragOver ? t('records.dragDropHover') : t('records.dragDrop')}
                </p>
                <p className="text-sm text-brand-dark/50">
                  {t('records.fileLimits')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* File Selected Preview */
          <div className="border border-accent/30 bg-accent/5 rounded-2xl p-6 flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-brand-dark truncate">{selectedFile.name}</p>
              <p className="text-sm text-brand-dark/50">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="p-2 text-brand-dark/40 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
              title={t('records.deleteFile')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </section>

      {/* Upload Button */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || isSubmitting}
          className={`w-full md:w-auto px-10 py-3 font-iceland text-2xl rounded-xl transition-all duration-300 shadow-lg ${
            !selectedFile || isSubmitting 
              ? 'bg-brand-dark/50 text-white cursor-not-allowed' 
              : 'bg-primary-hover text-brand-light hover:bg-primary hover:-translate-y-0.5'
          }`}
        >
          {isSubmitting ? t('records.uploadLoading') : t('records.uploadButton')}
        </button>
      </div>
    </div>
  );
};
