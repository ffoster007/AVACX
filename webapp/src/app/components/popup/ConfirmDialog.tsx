"use client";
import React from "react";
import { Loader2, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

interface DeleteSnipRunDialogProps {
  open: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteSnipRunDialog: React.FC<DeleteSnipRunDialogProps> = ({ open, loading = false, onConfirm, onCancel }) => (
  <ConfirmDialog
    open={open}
    title="Delete this Result?"
    description="This action removes the stored report and terminal log permanently."
    confirmLabel="Delete"
    cancelLabel="Cancel"
    tone="danger"
    loading={loading}
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const confirmClasses =
    tone === "danger"
      ? "bg-[#2b1114] border border-[#472126] text-[#fca5a5] hover:text-white"
      : "bg-[#16181c] border border-[#2d2f33] text-gray-200 hover:text-white";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#2f2f33] bg-[#0f1012] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1f2024] px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Confirmation</p>
            <h3 className="text-base font-semibold text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-transparent p-1.5 text-gray-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c89ff] cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-4 py-5 text-sm text-gray-300">{description}</div>
        <div className="flex items-center justify-end gap-2 border-t border-[#1f2024] px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-[#2d2f33] bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-white cursor-pointer"
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer ${confirmClasses}`}
            disabled={loading}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
