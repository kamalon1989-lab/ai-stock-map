"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  bulkUpsertSectorBlocks, deleteSectorBlock, getSector, listCompanies,
  listSectorBlocks, upsertSector, upsertSectorBlock,
} from "@/lib/data";
import type { Block, Company, Sector } from "@/lib/types";
import NotesSection from "@/components/NotesSection";
import { Field, btnPrimary, btnSecondary, inputClass } from "@/components/Modal";
import { useToast } from "@/components/Toast";

const PRESETS = ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#ef4444", "#06b6d4", "#64748b"];

export default function SectorPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const toast = useToast();
  const [sector, setSector] = useState<Sector | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [editingHeader, setEditingHeader] = useState(false);
  const [draft, setDraft] = useState<Partial<Sector>>({});

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const [s, allComps, bs] = await Promise.all([
        getSector(user.uid, id),
        listCompanies(user.uid),
        listSectorBlocks(user.uid, id),
      ]);
      setSector(s);
      setCompanies(allComps.filter((c) => c.sectorId === id));
      setBlocks(bs);
    })();
  }, [user, id]);

  const startEditHeader = () => {
    if (!sector) return;
    setDraft({ name: sector.name, description: sector.description ?? "", color: sector.color });
    setEditingHeader(true);
  };
  const saveHeader = async () => {
    if (!user || !sector) return;
    const next = { ...sector, ...draft } as Sector;
    await upsertSector(user.uid, next);
    setSector(next);
    setEditingHeader(false);
    toast.push("저장됨", "success");
  };

  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => a.ticker.localeCompare(b.ticker)),
    [companies]
  );

  if (loading) return <div className="p-6 text-slate-400">로딩 중…</div>;
  if (!user) return <div className="p-6">로그인 필요. <Link href="/" className="underline">홈</Link></div>;
  if (!sector)
    return (
      <div className="p-6">
        <Link href="/" className="text-slate-400 hover:text-white">← 맵으로</Link>
        <p className="mt-4">섹터를 찾을 수 없음: {id}</p>
      </div>
    );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-white text-sm flex items-center gap-1">
            <span>←</span> 맵
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: sector.color }} />
            섹터
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <section className="mb-8">
          {editingHeader ? (
            <div className="space-y-3 p-4 rounded-xl border border-indigo-700/50 bg-indigo-950/20">
              <Field label="섹터 이름">
                <input autoFocus value={draft.name ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className={inputClass} />
              </Field>
              <Field label="설명">
                <input value={draft.description ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  className={inputClass} />
              </Field>
              <Field label="색상">
                <div className="flex gap-2 flex-wrap">
                  {PRESETS.map((c) => (
                    <button key={c} onClick={() => setDraft((d) => ({ ...d, color: c }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        (draft.color ?? sector.color) === c ? "border-white scale-110" : "border-transparent"
                      }`}
                      style={{ background: c }} />
                  ))}
                </div>
              </Field>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingHeader(false)} className={btnSecondary}>취소</button>
                <button onClick={saveHeader} className={btnPrimary}>저장</button>
              </div>
            </div>
          ) : (
            <div className="group">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: sector.color }} />
                <h1 className="text-2xl font-bold flex-1 truncate">{sector.name}</h1>
                <span className="text-xs text-slate-500">{companies.length} 종목</span>
                <button onClick={startEditHeader}
                  className="opacity-0 group-hover:opacity-100 text-xs text-slate-400 hover:text-white transition-opacity">
                  편집
                </button>
              </div>
              {sector.description && (
                <p className="text-slate-300 leading-relaxed">{sector.description}</p>
              )}
            </div>
          )}
        </section>

        {sortedCompanies.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">소속 종목</h2>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {sortedCompanies.map((c) => (
                <Link key={c.ticker} href={`/company/${c.ticker}`}
                  className="block p-3 rounded-lg border border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/60 transition-colors">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-emerald-400 text-sm font-semibold">{c.ticker}</span>
                    <span className="text-sm truncate">{c.name}</span>
                  </div>
                  {c.oneLineSummary && (
                    <div className="text-xs text-slate-400 mt-1 line-clamp-2">{c.oneLineSummary}</div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        <NotesSection
          blocks={blocks}
          setBlocks={setBlocks}
          importTitle={`${sector.name} 섹션 가져오기`}
          store={{
            upsert: (b) => upsertSectorBlock(user.uid, sector.id, b),
            remove: (bid) => deleteSectorBlock(user.uid, sector.id, bid),
            bulkUpsert: (bs) => bulkUpsertSectorBlocks(user.uid, sector.id, bs).then(() => undefined),
          }}
        />
      </div>
    </div>
  );
}
