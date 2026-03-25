'use client';

import { createPortal } from 'react-dom';
import { useLanguage } from '@/lib/i18n/context';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'default',
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLanguage();

  if (!open) return null;

  const confirmBtnClass =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : 'bg-teal-600 hover:bg-teal-700 text-white';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 mx-4 max-w-sm w-full">
        <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
        {children && <div className="mb-3">{children}</div>}
        <p className="text-sm text-gray-500">{description}</p>
        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {cancelText || t.common.cancel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${confirmBtnClass}`}
          >
            {confirmText || t.common.delete}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
