"use client";
import { useEffect } from "react";

export default function Modal({
  open, onClose, title, children, footer, size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full ${widths[size]} bg-slate-900 border border-slate-700 rounded-xl shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-slate-800 flex justify-end gap-2 bg-slate-900/50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// 공통 input/label 스타일 도우미
export function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <div className="text-xs text-slate-400 mb-1.5 font-medium">{label}</div>
      {children}
      {hint && <div className="text-[11px] text-slate-500 mt-1">{hint}</div>}
    </label>
  );
}

export const inputClass =
  "w-full bg-slate-800 border border-slate-700 focus:border-indigo-500 rounded-md px-3 py-2 text-sm outline-none transition-colors placeholder:text-slate-600";

export const btnPrimary =
  "px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors";
export const btnSecondary =
  "px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors";
export const btnDanger =
  "px-4 py-2 rounded-md bg-rose-700 hover:bg-rose-600 text-sm font-medium transition-colors";
