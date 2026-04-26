"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  bulkUpsertCompanyBlocks, deleteCompanyBlock, getCompany, listCompanyBlocks,
  listSectors, renameCompany, upsertCompany, upsertCompanyBlock,
} from "@/lib/data";
import type { Block, Company, Sector } from "@/lib/types";
import {
  buildCompanyExport, buildPromptPayload, downloadJSON,
} from "@/lib/export";
import NotesSection from "@/components/NotesSection";
import { Field, btnPrimary, btnSecondary, inputClass } from "@/components/Modal";
import { useToast } from "@/components/Toast";

export default function CompanyPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const toast = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);

  const [editingHeader, setEditingHeader] = useState(false);
  const [draft, setDraft] = useState<{
    ticker: string; name: string; sectorId: string; oneLineSummary: string; tags: string[];
  }>({ ticker: "", name: "", sectorId: "", oneLineSummary: "", tags: [] });

  useEffect(() => {
    if (!user || !ticker) return;
    (async () => {
      const [c, s, b] = await Promise.all([
        getCompany(user.uid, ticker),
        listSectors(user.uid),
        listCompanyBlocks(user.uid, ticker),
      ]);
      setCompany(c); setSectors(s); setBlocks(b);
    })();
  }, [user, ticker]);

  const startEditHeader = () => {
    if (!company) return;
    setDraft({
      ticker: company.ticker,
      name: company.name,
      sectorId: company.sectorId,
      oneLineSummary: company.oneLineSummary ?? "",
      tags: company.tags ?? [],
    });
    setEditingHeader(true);
  };

  const saveHeader = async () => {
    if (!user || !company) return;
    const newTicker = draft.ticker.toUpperCase().trim();
    if (!newTicker) return toast.push("티커는 비울 수 없습니다", "error");

    try {
      // 티커가 바뀌면: 회사 + 모든 블록 복사 후 옛 문서 삭제 → 새 URL 로 이동
      if (newTicker !== company.ticker) {
        await renameCompany(user.uid, company.ticker, newTicker);
        // 그 다음 헤더 다른 필드도 업데이트
        const next: Company = {
          ticker: newTicker,
          name: draft.name.trim() || newTicker,
          sectorId: draft.sectorId,
          oneLineSummary: draft.oneLineSummary.trim() || undefined,
          tags: draft.tags,
        };
        await upsertCompany(user.uid, next);
        toast.push(`티커 변경됨 → ${newTicker}`, "success");
        router.replace(`/company/${newTicker}`);
        return;
      }

      const next: Company = {
        ...company,
        name: draft.name.trim() || company.ticker,
        sectorId: draft.sectorId,
        oneLineSummary: draft.oneLineSummary.trim() || undefined,
        tags: draft.tags,
      };
      await upsertCompany(user.uid, next);
      setCompany(next);
      setEditingHeader(false);
      toast.push("저장됨", "success");
    } catch (e: any) {
      toast.push(e.message || "저장 실패", "error");
    }
  };

  const onExport = () => {
    if (!company) return;
    downloadJSON(`${company.ticker}-${new Date().toISOString().slice(0, 10)}.json`,
      buildCompanyExport(company, blocks));
    toast.push("JSON 내보내기 완료", "success");
  };
  const onCopyPrompt = async () => {
    if (!company) return;
    await navigator.clipboard.writeText(buildPromptPayload(company, blocks));
    toast.push("AI 프롬프트로 복사됨", "success");
  };

  const sectorObj = useMemo(
    () => sectors.find((s) => s.id === company?.sectorId),
    [sectors, company]
  );

  if (loading) return <div className="p-6 text-slate-400">로딩 중…</div>;
  if (!user) return <div className="p-6">로그인 필요. <Link href="/" className="underline">홈</Link></div>;
  if (!company)
    return (
      <div className="p-6">
        <Link href="/" className="text-slate-400 hover:text-white">← 맵으로</Link>
        <p className="mt-4">회사를 찾을 수 없음: {ticker}</p>
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
          {sectorObj && (
            <Link href={`/sector/${sectorObj.id}`}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors">
              <span className="w-2 h-2 rounded-full" style={{ background: sectorObj.color }} />
              {sectorObj.name}
            </Link>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onExport} className="px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-sm font-medium transition-colors">
              내보내기
            </button>
            <button onClick={onCopyPrompt} className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors">
              AI 프롬프트 복사
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <section className="mb-8">
          {editingHeader ? (
            <div className="space-y-3 p-4 rounded-xl border border-indigo-700/50 bg-indigo-950/20">
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-1">
                  <Field label="티커" hint="변경 시 노트도 자동 이전">
                    <input value={draft.ticker}
                      onChange={(e) => setDraft((d) => ({ ...d, ticker: e.target.value.toUpperCase() }))}
                      className={`${inputClass} font-mono`} />
                  </Field>
                </div>
                <div className="col-span-3">
                  <Field label="회사명">
                    <input value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      className={inputClass} />
                  </Field>
                </div>
                <div className="col-span-1">
                  <Field label="섹터">
                    <select value={draft.sectorId}
                      onChange={(e) => setDraft((d) => ({ ...d, sectorId: e.target.value }))}
                      className={inputClass}>
                      {sectors.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
              <Field label="한 줄 요약">
                <input value={draft.oneLineSummary}
                  onChange={(e) => setDraft((d) => ({ ...d, oneLineSummary: e.target.value }))}
                  className={inputClass} />
              </Field>
              <Field label="태그" hint="콤마로 구분">
                <input value={draft.tags.join(", ")}
                  onChange={(e) => setDraft((d) => ({
                    ...d,
                    tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                  }))}
                  className={inputClass} />
              </Field>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingHeader(false)} className={btnSecondary}>취소</button>
                <button onClick={saveHeader} className={btnPrimary}>저장</button>
              </div>
            </div>
          ) : (
            <div className="group">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-mono text-emerald-400 text-2xl font-bold tracking-tight">
                  {company.ticker}
                </span>
                <h1 className="text-2xl font-bold flex-1 truncate">{company.name}</h1>
                <button onClick={startEditHeader}
                  className="opacity-0 group-hover:opacity-100 text-xs text-slate-400 hover:text-white transition-opacity">
                  헤더 편집
                </button>
              </div>
              {company.oneLineSummary && (
                <p className="text-slate-300 leading-relaxed mb-2">{company.oneLineSummary}</p>
              )}
              {(company.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(company.tags ?? []).map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <NotesSection
          blocks={blocks}
          setBlocks={setBlocks}
          importTitle={`${company.ticker} 섹션 가져오기`}
          store={{
            upsert: (b) => upsertCompanyBlock(user.uid, company.ticker, b),
            remove: (bid) => deleteCompanyBlock(user.uid, company.ticker, bid),
            bulkUpsert: (bs) => bulkUpsertCompanyBlocks(user.uid, company.ticker, bs).then(() => undefined),
          }}
        />
      </div>
    </div>
  );
}
