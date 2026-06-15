import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, User } from 'lucide-react';
import { ConfirmModal } from '@/presentation/components/common/ConfirmModal';
import { specialistApi } from '@/infrastructure/api/specialistApi';

const BACKEND_URL = 'http://localhost:8000';
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIM = 800;

interface Props {
  photoUrl: string | null | undefined;
  onPhotoChanged: (newUrl: string | null) => void;
}

async function resizeToJpeg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = img;
      if (width <= MAX_DIM && height <= MAX_DIM) {
        resolve(file);
        return;
      }
      const scale = MAX_DIM / Math.max(width, height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('load')); };
    img.src = objectUrl;
  });
}

export const ProfilePhotoUploader: React.FC<Props> = ({ photoUrl, onPhotoChanged }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarSrc = photoUrl ? `${BACKEND_URL}/${photoUrl}` : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setError(t('specialistProfile.photoUpload.uploadError'));
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const ready = await resizeToJpeg(file);
      const result = await specialistApi.uploadPhoto(ready);
      onPhotoChanged(result.photo_url);
    } catch {
      setError(t('specialistProfile.photoUpload.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    setError(null);
    try {
      await specialistApi.deletePhoto();
      onPhotoChanged(null);
    } catch {
      setError(t('specialistProfile.photoUpload.removeError'));
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Circular avatar with loading overlay */}
      <div className="relative">
        <div className="w-30 h-30 rounded-full overflow-hidden border-2 border-white/20 bg-white/10 flex items-center justify-center shrink-0">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-white/40" />
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
        >
          {t('specialistProfile.photoUpload.changePhoto')}
        </button>

        {photoUrl && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={uploading}
            className="text-xs text-white/40 hover:text-secondary transition-colors disabled:opacity-50"
          >
            {t('specialistProfile.photoUpload.removePhoto')}
          </button>
        )}

        <p className="text-xs text-white/30 mt-0.5">
          {t('specialistProfile.photoUpload.sizeHint')}
        </p>
      </div>

      {error && (
        <p className="text-xs text-secondary text-center max-w-40">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <ConfirmModal
        open={confirmOpen}
        title={t('specialistProfile.photoUpload.removePhoto')}
        message={t('specialistProfile.photoUpload.removePhoto')}
        confirmLabel={t('specialistProfile.photoUpload.removePhoto')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
        danger
      />
    </div>
  );
};
