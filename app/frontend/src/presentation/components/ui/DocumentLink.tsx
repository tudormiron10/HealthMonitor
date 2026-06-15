import React, { useState } from 'react';
import apiClient from '@/infrastructure/api/apiClient';

interface DocumentLinkProps {
  path: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
}

// Fetches a backend-served /uploads document WITH the auth token (the document
// routes are authenticated), then opens it in a new tab — falling back to a
// download if the popup is blocked.
export const DocumentLink: React.FC<DocumentLinkProps> = ({ path, className, onClick, children }) => {
  const [loading, setLoading] = useState(false);

  const handleOpen = async (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (loading) return;
    setLoading(true);
    const win = window.open('', '_blank');
    try {
      const res = await apiClient.get(`/${path}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      if (win) {
        win.location.href = url;
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = path.split('/').pop() || 'document';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      if (win) win.close();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={handleOpen} disabled={loading} className={className}>
      {children}
    </button>
  );
};
