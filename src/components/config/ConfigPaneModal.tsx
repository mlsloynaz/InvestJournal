"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidthClass?: string;
};

export function ConfigPaneModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = "max-w-2xl",
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="config-pane-modal-title"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${maxWidthClass} max-h-[85vh] overflow-y-auto border border-investep-navy/20`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b sticky top-0 bg-white z-10">
          <div>
            <h3 id="config-pane-modal-title" className="font-semibold text-investep-navy">
              {title}
            </h3>
            {subtitle ? <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="text-gray-500 hover:text-investep-navy text-lg leading-none px-1"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="p-4">{children}</div>

        <div className="px-4 py-3 border-t sticky bottom-0 bg-white">
          <button
            type="button"
            className="text-sm bg-investep-navy text-white px-3 py-1.5 rounded"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
