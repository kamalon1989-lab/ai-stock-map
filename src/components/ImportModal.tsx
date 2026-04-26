"use client";
import { useState } from "react";
import Modal, { btnPrimary, btnSecondary } from "./Modal";

type ParsedPreview = { ok: boolean; summary: React.ReactNode; data?: any };

export default function ImportModal({
  open, onClose, title, formatGuide, parse, onApply,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  formatGuide: string;
  parse: (raw: any) => ParsedPreview; // raw JSON → preview
  onApply: (data: any) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const reset = () => { setText(""); setPreview(null); setError(null); setApplying(false); setShowGuide(false); };
  const handleClose = () => { reset(); onClose(); };

  const tryParse = (raw: string) => {
    setError(null);
    setPreview(null);
    if (!raw.trim()) return;
    try {
      const json = JSON.parse(raw);
      const p = parse(json);
      setPreview(p);
    } catch (e: any) {
      setError(e.message || "JSON 파싱 실패");
    }
  };

  const onFile = async (f: File) => {
    const t = await f.text();
    setText(t);
    tryParse(t);
  };

  const apply = async () => {
    if (!preview?.data) return;
    setApplying(true);
    try {
      await onApply(preview.data);
      handleClose();
    } catch (e: any) {
      setError(e.message || "적용 실패");
      setApplying(false);
    }
  };

  const copyGuide = () => navigator.clipboard.writeText(formatGuide);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      size="lg"
      footer={
        <>
          <button onClick={handleClose} className={btnSecondary}>취소</button>
          <button
            onClick={apply}
            disabled={!preview?.ok || applying}
            className={btnPrimary}
          >
            {applying ? "적용 중…" : "가져오기 적용"}
          </button>
        </>
      }
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <label className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer transition-colors">
            JSON 파일 업로드
            <input
              type="file"
              accept="application/json,.json,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
          <button onClick={() => setShowGuide((v) => !v)}
            className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors">
            {showGuide ? "포맷 안내 닫기" : "AI 에 줄 포맷 안내"}
          </button>
        </div>
      </div>

      {showGuide && (
        <div className="mb-3 rounded-lg border border-slate-700 bg-slate-950 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">AI 프롬프트 — 그대로 복붙해서 사용</span>
            <button onClick={copyGuide}
              className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors">
              복사
            </button>
          </div>
          <pre className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-auto">
{formatGuide}
          </pre>
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); tryParse(e.target.value); }}
        placeholder="JSON 을 여기 붙여넣거나, 위에서 파일을 업로드하세요."
        className="w-full h-56 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-md p-3 text-xs font-mono outline-none transition-colors"
      />

      <div className="mt-3 min-h-[60px]">
        {error && (
          <div className="text-rose-400 text-sm bg-rose-950/40 border border-rose-900 rounded p-2">
            {error}
          </div>
        )}
        {preview && !error && (
          <div className={`text-sm rounded-md p-3 border ${
            preview.ok
              ? "bg-emerald-950/30 border-emerald-800 text-emerald-100"
              : "bg-amber-950/30 border-amber-800 text-amber-100"
          }`}>
            {preview.summary}
          </div>
        )}
      </div>
    </Modal>
  );
}
