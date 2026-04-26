"use client";
import { createContext, useCallback, useContext, useState } from "react";

type ToastKind = "info" | "success" | "error";
type Toast = { id: number; kind: ToastKind; msg: string };
type Ctx = { push: (msg: string, kind?: ToastKind) => void };

const ToastCtx = createContext<Ctx>({ push: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((msg: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-lg border text-sm shadow-lg backdrop-blur-sm ${
              t.kind === "success"
                ? "bg-emerald-900/90 border-emerald-700 text-emerald-100"
                : t.kind === "error"
                ? "bg-rose-900/90 border-rose-700 text-rose-100"
                : "bg-slate-800/90 border-slate-700 text-slate-100"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
