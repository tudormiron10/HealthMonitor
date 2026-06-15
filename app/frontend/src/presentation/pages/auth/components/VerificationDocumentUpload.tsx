import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { uploadVerificationDocument } from '@/infrastructure/api/authApi';

interface Props {
  onUploadSuccess?: () => void;
  onSkip?: () => void;
  onFileSelected?: (file: File | null) => void;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const VerificationDocumentUpload: React.FC<Props> = ({ onUploadSuccess, onSkip, onFileSelected }) => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const embeddedMode = !!onFileSelected;

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) return t('register.docUpload.errors.invalidType');
    if (file.size > MAX_SIZE) return t('register.docUpload.errors.fileTooLarge');
    return null;
  };

  const pickFile = (file: File) => {
    setError(null);
    setSelectedFile(file);
    onFileSelected?.(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    onFileSelected?.(null);
  };

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
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setError(err); return; }
    pickFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setError(err); return; }
    pickFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    try {
      await uploadVerificationDocument(selectedFile);
      setUploadedFilename(selectedFile.name);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('register.docUpload.errors.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  if (!embeddedMode && uploadedFilename) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="flex flex-col items-center justify-center gap-4 py-6">
          <div className="w-16 h-16 bg-accent/20 text-accent rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <p className="font-heading text-brand-dark text-center">
            {t('register.docUpload.uploadSuccess')}
          </p>
          <p className="text-sm text-brand-dark/50">{uploadedFilename}</p>
        </div>
        <Button onClick={onUploadSuccess} className="w-full">
          {t('register.docUpload.continueButton')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {!embeddedMode && (
        <p className="text-sm text-brand-dark/60">
          {t('register.docUpload.description')}
        </p>
      )}

      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-600 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer ${
            isDragOver
              ? 'border-accent bg-accent/5 scale-[1.01]'
              : 'border-brand-dark/20 hover:border-primary/50 hover:bg-primary/5'
          }`}
        >
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              isDragOver ? 'bg-accent/20 text-accent scale-110' : 'bg-primary/10 text-primary'
            }`}>
              <Upload className="w-7 h-7" />
            </div>
            <p className="font-heading text-brand-dark">
              {isDragOver ? t('records.dragDropHover') : t('register.docUpload.dragDrop')}
            </p>
            <p className="text-xs text-brand-dark/50">{t('register.docUpload.fileLimits')}</p>
          </div>
        </div>
      ) : (
        <div className="border border-accent/30 bg-accent/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-brand-dark truncate">{selectedFile.name}</p>
            <p className="text-sm text-brand-dark/50">{formatFileSize(selectedFile.size)}</p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="p-2 text-brand-dark/40 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!embeddedMode && (
        <>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full"
          >
            {isUploading ? t('register.docUpload.uploadLoading') : t('register.docUpload.uploadButton')}
          </Button>

          <button
            type="button"
            onClick={onSkip}
            className="w-full text-sm text-brand-dark/50 hover:text-brand-dark/80 transition-colors py-1"
          >
            {t('register.docUpload.skipButton')}
          </button>
        </>
      )}
    </div>
  );
};
