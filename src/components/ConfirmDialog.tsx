"use client";
import { createContext, useCallback, useContext, useState } from "react";
import Modal, { btnDanger, btnSecondary } from "./Modal";

type ConfirmOpts = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

const ConfirmCtx = createContext<(opts: ConfirmOpts) => Promise<boolean>>(
  async () => false
);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOpts) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => setResolver(() => resolve));
  }, []);

  const handle = (v: boolean) => {
    resolver?.(v);
    setOpts(null);
    setResolver(null);
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!opts}
        onClose={() => handle(false)}
        title={opts?.title ?? "확인"}
        footer={
          <>
            <button onClick={() => handle(false)} className={btnSecondary}>
              {opts?.cancelLabel ?? "취소"}
            </button>
            <button
              onClick={() => handle(true)}
              className={opts?.danger ? btnDanger : "px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"}
            >
              {opts?.confirmLabel ?? "확인"}
            </button>
          </>
        }
      >
        <p className="text-slate-300 text-sm leading-relaxed">{opts?.message}</p>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmCtx);
