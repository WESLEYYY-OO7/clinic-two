"use client";
import { ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md shadow-2xl">
        {title && (
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        )}
        <div className="mt-4">{children}</div>
        <div className="mt-6 flex justify-end">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}