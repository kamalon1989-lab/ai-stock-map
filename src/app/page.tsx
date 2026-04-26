"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  bulkAddSectorsAndCompanies, bulkUpsertCompanyBlocks, bulkUpsertSectorBlocks,
  deleteCompany, deleteSector, listCompanyBlocks, listSectorBlocks,
  upsertCompany, upsertSector, watchCompanies, watchSectors,
} from "@/lib/data";
import type { Company, Sector } from "@/lib/types";
import { buildFullExport, buildMapExport, downloadJSON } from "@/lib/export";
import {
  FULL_FORMAT_GUIDE, MAP_FORMAT_GUIDE, parseFullImport, parseMapImport,
} from "@/lib/import";
import Modal, { Field, btnPrimary, btnSecondary, inputClass } from "@/components/Modal";
import ImportModal from "@/components/ImportModal";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

const SECTOR_PRESET_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
  "#f59e0b", "#ef4444", "#06b6d4", "#64748b",
];

export default function MapPage() {
  const { user, loading, signIn, signOutUser } = useAuth();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filter, setFilter] = useState("");
  const [reorderMode, setReorderMode] = useState(false);

  const [sectorModal, setSectorModal] = useState(false);
  const [sectorForm, setSectorForm] = useState({ name: "", description: "", color: SECTOR_PRESET_COLORS[0] });

  const [companyModal, setCompanyModal] = useState<{ open: boolean; sectorId: string }>({
    open: false, sectorId: "",
  });
  const [companyForm, setCompanyForm] = useState({ ticker: "", name: "", oneLineSummary: "", tags: "" });

  const [importMode, setImportMode] = useState<"map" | "full" | null>(null);
  const [openMenu, setOpenMenu] = useState<"import" | "export" | null>(null);

  useEffect(() => {
    if (!user) return;
    const u1 = watchSectors(user.uid, setSectors);
    const u2 = watchCompanies(user.uid, setCompanies);
    return () => { u1(); u2(); };
  }, [user]);

  const grouped = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const match = (c: Company) =>
      !f || c.ticker.toLowerCase().includes(f) || c.name.toLowerCase().includes(f) ||
      (c.tags ?? []).some((t) => t.toLowerCase().includes(f));
    return sectors.map((s) => ({
      sector: s,
      companies: companies.filter((c) => c.sectorId === s.id && match(c)),
    }));
  }, [sectors, companies, filter]);

  if (loading) return <div className="p-6 text-slate-400">로딩 중…</div>;
  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button onClick={signIn} className={`${btnPrimary} px-5 py-3`}>
          Google 로그인
        </button>
      </div>
    );

  const openAddSector = () => {
    setSectorForm({ name: "", description: "", color: SECTOR_PRESET_COLORS[sectors.length % SECTOR_PRESET_COLORS.length] });
    setSectorModal(true);
  };
  const submitSector = async () => {
    const name = sectorForm.name.trim();
    if (!name) return toast.push("섹터 이름을 입력하세요", "error");
    const id = name.toLowerCase().replace(/\s+/g, "-").slice(0, 40) + "-" + Date.now().toString(36).slice(-3);
    await upsertSector(user.uid, {
      id, name, description: sectorForm.description.trim() || undefined,
      color: sectorForm.color, order: sectors.length,
    });
    setSectorModal(false);
    toast.push(`섹터 "${name}" 추가됨`, "success");
  };

  const openAddCompany = (sectorId: string) => {
    setCompanyForm({ ticker: "", name: "", oneLineSummary: "", tags: "" });
    setCompanyModal({ open: true, sectorId });
  };
  const submitCompany = async () => {
    const ticker = companyForm.ticker.toUpperCase().trim();
    if (!ticker) return toast.push("티커를 입력하세요", "error");
    if (companies.some((c) => c.ticker === ticker))
      return toast.push(`이미 ${ticker} 가 있습니다`, "error");
    const name = companyForm.name.trim() || ticker;
    const tags = companyForm.tags.split(",").map((t) => t.trim()).filter(Boolean);
    await upsertCompany(user.uid, {
      ticker, name, sectorId: companyModal.sectorId,
      oneLineSummary: companyForm.oneLineSummary.trim() || undefined,
      tags,
    });
    setCompanyModal({ open: false, sectorId: "" });
    toast.push(`${ticker} 추가됨`, "success");
  };

  const onDeleteSector = async (s: Sector) => {
    const sectorCompanies = companies.filter((c) => c.sectorId === s.id);
    const ok = await confirmDialog({
      title: "섹터 삭제",
      message:
        sectorCompanies.length > 0
          ? `"${s.name}" 섹터에는 ${sectorCompanies.length}개의 회사가 있습니다. 섹터만 삭제되고 회사들은 남지만, 분류가 깨집니다. 계속할까요?`
          : `"${s.name}" 섹터를 삭제할까요?`,
      danger: true, confirmLabel: "삭제",
    });
    if (!ok) return;
    await deleteSector(user.uid, s.id);
    toast.push("섹터 삭제됨", "success");
  };

  const onDeleteCompany = async (c: Company) => {
    const ok = await confirmDialog({
      title: "회사 삭제",
      message: `${c.ticker} (${c.name}) 와 작성한 모든 노트 블록을 삭제할까요?`,
      danger: true, confirmLabel: "삭제",
    });
    if (!ok) return;
    await deleteCompany(user.uid, c.ticker);
    toast.push(`${c.ticker} 삭제됨`, "success");
  };

  const onMoveSector = async (s: Sector, dir: -1 | 1) => {
    const sorted = [...sectors].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((x) => x.id === s.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    [sorted[i].order, sorted[j].order] = [sorted[j].order, sorted[i].order];
    await Promise.all([
      upsertSector(user.uid, sorted[i]),
      upsertSector(user.uid, sorted[j]),
    ]);
  };

  const onExportMap = () => {
    downloadJSON(`ai-stock-map-${new Date().toISOString().slice(0, 10)}.json`,
      buildMapExport(sectors, companies));
    toast.push("맵 JSON 내보내기 완료", "success");
  };
  const onExportFull = async () => {
    toast.push("전체 데이터 수집 중…");
    const data = await buildFullExport(user.uid, sectors, companies);
    downloadJSON(`ai-stock-full-${new Date().toISOString().slice(0, 10)}.json`, data);
    toast.push("전체 백업 내보내기 완료", "success");
  };

  const totalCompanies = companies.length;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
          <div className="flex items-baseline gap-2 shrink-0">
            <h1 className="text-base sm:text-xl font-bold tracking-tight whitespace-nowrap">AI 생태계 맵</h1>
            <span className="text-xs text-slate-500 whitespace-nowrap hidden md:inline">{sectors.length} 섹터 · {totalCompanies} 종목</span>
          </div>
          <input
            value={filter} onChange={(e) => setFilter(e.target.value)}
            placeholder="🔍 검색"
            className={`${inputClass} flex-1 min-w-0 max-w-xs`}
          />
          <div className="ml-auto flex gap-1.5 sm:gap-2 items-center shrink-0">
            {/* 데스크탑 전용: 정렬 편집 */}
            <button
              onClick={() => setReorderMode((v) => !v)}
              className={`hidden md:inline-block px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                reorderMode ? "bg-amber-700 hover:bg-amber-600" : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              {reorderMode ? "정렬 완료" : "정렬 편집"}
            </button>

            {/* + 섹터: 항상 표시. 모바일에선 + 만 */}
            <button onClick={openAddSector} className={btnSecondary} title="섹터 추가">
              <span className="hidden sm:inline">+ 섹터</span>
              <span className="sm:hidden">+</span>
            </button>

            {/* 데스크탑 전용: 가져오기 / 내보내기 */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setOpenMenu((m) => (m === "import" ? null : "import"))}
                className={btnSecondary}
              >
                가져오기 ▾
              </button>
              {openMenu === "import" && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                  <div className="absolute right-0 mt-1 w-44 rounded-md border border-slate-700 bg-slate-900 shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => { setImportMode("map"); setOpenMenu(null); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-800 transition-colors"
                    >
                      맵만 (섹터+회사)
                    </button>
                    <button
                      onClick={() => { setImportMode("full"); setOpenMenu(null); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-800 transition-colors border-t border-slate-800"
                    >
                      전체 (노트 포함)
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="relative hidden md:block">
              <button
                onClick={() => setOpenMenu((m) => (m === "export" ? null : "export"))}
                className="px-3 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 text-sm font-medium transition-colors whitespace-nowrap"
              >
                내보내기 ▾
              </button>
              {openMenu === "export" && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                  <div className="absolute right-0 mt-1 w-44 rounded-md border border-slate-700 bg-slate-900 shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => { onExportMap(); setOpenMenu(null); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-800 transition-colors"
                    >
                      맵만 (섹터+회사)
                    </button>
                    <button
                      onClick={() => { onExportFull(); setOpenMenu(null); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-800 transition-colors border-t border-slate-800"
                    >
                      전체 (노트 포함)
                    </button>
                  </div>
                </>
              )}
            </div>

            <ThemeToggle />

            <button onClick={signOutUser} className={`${btnSecondary} hidden sm:inline-block`}>로그아웃</button>
            {/* 모바일: 로그아웃 아이콘만 */}
            <button onClick={signOutUser} className={`${btnSecondary} sm:hidden`} title="로그아웃" aria-label="로그아웃">
              ⎋
            </button>
          </div>
        </div>
        {reorderMode && (
          <div className="max-w-7xl mx-auto px-6 pb-3 text-xs text-amber-300/80">
            정렬 편집 모드 — 섹터 카드의 ↑↓ 버튼으로 순서를 바꾸세요. 다 됐으면 [정렬 완료]를 누르세요.
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {grouped.length === 0 && (
          <div className="text-slate-400 py-12 text-center border border-dashed border-slate-800 rounded-xl">
            섹터가 없습니다. 우상단 <span className="text-slate-200 font-medium">[+ 섹터]</span> 로 시작하세요.
          </div>
        )}

        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {grouped.map(({ sector, companies }, idx) => (
            <section
              key={sector.id}
              className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden hover:border-slate-700 transition-colors"
            >
              <div
                className="px-4 py-3 border-b border-slate-800 flex items-center gap-2"
                style={{ background: `linear-gradient(90deg, ${sector.color}18, transparent)` }}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sector.color }} />
                <Link href={`/sector/${sector.id}`}
                  className="font-semibold truncate hover:text-emerald-400 transition-colors"
                  title="섹터 노트 페이지로 이동">
                  {sector.name}
                </Link>
                <span className="text-xs text-slate-500 shrink-0">{companies.length}</span>
                <div className="ml-auto flex gap-1 shrink-0">
                  {reorderMode ? (
                    <>
                      <button
                        onClick={() => onMoveSector(sector, -1)}
                        disabled={idx === 0}
                        className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-colors"
                        title="위로"
                      >↑</button>
                      <button
                        onClick={() => onMoveSector(sector, 1)}
                        disabled={idx === grouped.length - 1}
                        className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-colors"
                        title="아래로"
                      >↓</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => openAddCompany(sector.id)}
                        className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-indigo-700 transition-colors"
                      >+ 회사</button>
                      <button
                        onClick={() => onDeleteSector(sector)}
                        className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-rose-700 text-slate-400 hover:text-white transition-colors"
                        title="섹터 삭제"
                      >×</button>
                    </>
                  )}
                </div>
              </div>
              {sector.description && (
                <p className="text-xs text-slate-500 px-4 py-2 border-b border-slate-800/60">{sector.description}</p>
              )}
              <ul className="p-2 space-y-0.5">
                {companies.map((c) => (
                  <li key={c.ticker} className="group">
                    <div className="flex items-start gap-1 rounded-md hover:bg-slate-800/70 transition-colors">
                      <Link href={`/company/${c.ticker}`} className="flex-1 min-w-0 p-2">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-emerald-400 text-sm font-semibold">{c.ticker}</span>
                          <span className="text-sm truncate">{c.name}</span>
                        </div>
                        {c.oneLineSummary && (
                          <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{c.oneLineSummary}</div>
                        )}
                        {(c.tags ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(c.tags ?? []).slice(0, 4).map((t) => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>
                      {!reorderMode && (
                        <button
                          onClick={() => onDeleteCompany(c)}
                          className="opacity-0 group-hover:opacity-100 text-xs text-slate-500 hover:text-rose-400 px-2 py-2 transition-opacity"
                          title="회사 삭제"
                        >×</button>
                      )}
                    </div>
                  </li>
                ))}
                {companies.length === 0 && (
                  <li className="text-xs text-slate-600 italic p-3 text-center">
                    회사 없음 — [+ 회사] 로 추가
                  </li>
                )}
              </ul>
            </section>
          ))}
        </div>
      </main>

      {/* 섹터 추가 모달 */}
      <Modal
        open={sectorModal}
        onClose={() => setSectorModal(false)}
        title="새 섹터 추가"
        footer={
          <>
            <button onClick={() => setSectorModal(false)} className={btnSecondary}>취소</button>
            <button onClick={submitSector} className={btnPrimary}>추가</button>
          </>
        }
      >
        <Field label="섹터 이름">
          <input
            autoFocus
            value={sectorForm.name}
            onChange={(e) => setSectorForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="예: AI 반도체"
            className={inputClass}
            onKeyDown={(e) => e.key === "Enter" && submitSector()}
          />
        </Field>
        <Field label="설명 (선택)">
          <input
            value={sectorForm.description}
            onChange={(e) => setSectorForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="섹터 설명을 한 줄로"
            className={inputClass}
          />
        </Field>
        <Field label="색상">
          <div className="flex gap-2 flex-wrap">
            {SECTOR_PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setSectorForm((f) => ({ ...f, color: c }))}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  sectorForm.color === c ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>
      </Modal>

      {/* 회사 추가 모달 */}
      <Modal
        open={companyModal.open}
        onClose={() => setCompanyModal({ open: false, sectorId: "" })}
        title="새 회사 추가"
        footer={
          <>
            <button onClick={() => setCompanyModal({ open: false, sectorId: "" })} className={btnSecondary}>취소</button>
            <button onClick={submitCompany} className={btnPrimary}>추가</button>
          </>
        }
      >
        <div className="text-xs text-slate-500 mb-3">
          섹터: <span className="text-slate-300">{sectors.find((s) => s.id === companyModal.sectorId)?.name}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <Field label="티커">
              <input
                autoFocus
                value={companyForm.ticker}
                onChange={(e) => setCompanyForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                placeholder="NVDA"
                className={`${inputClass} font-mono`}
              />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="회사명">
              <input
                value={companyForm.name}
                onChange={(e) => setCompanyForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="NVIDIA"
                className={inputClass}
              />
            </Field>
          </div>
        </div>
        <Field label="한 줄 요약">
          <input
            value={companyForm.oneLineSummary}
            onChange={(e) => setCompanyForm((f) => ({ ...f, oneLineSummary: e.target.value }))}
            placeholder="이 회사의 핵심을 한 줄로"
            className={inputClass}
          />
        </Field>
        <Field label="태그" hint="콤마로 구분 — 예: #AI인프라, #GPU">
          <input
            value={companyForm.tags}
            onChange={(e) => setCompanyForm((f) => ({ ...f, tags: e.target.value }))}
            placeholder="#AI인프라, #GPU"
            className={inputClass}
            onKeyDown={(e) => e.key === "Enter" && submitCompany()}
          />
        </Field>
      </Modal>

      {/* 맵만 가져오기 */}
      <ImportModal
        open={importMode === "map"}
        onClose={() => setImportMode(null)}
        title="맵 가져오기 (섹터 + 회사)"
        formatGuide={MAP_FORMAT_GUIDE}
        parse={(json) => {
          const plan = parseMapImport(json, { sectors, companies });
          const total = plan.newSectors.length + plan.newCompanies.length;
          return {
            ok: total > 0,
            data: plan,
            summary: total > 0 ? (
              <div className="space-y-1.5">
                <div>+ 새 섹터 <b>{plan.newSectors.length}</b> · + 새 회사 <b>{plan.newCompanies.length}</b></div>
                {plan.newSectors.length > 0 && (
                  <div className="text-xs opacity-70">섹터: {plan.newSectors.map((s) => s.name).join(", ")}</div>
                )}
                {plan.newCompanies.length > 0 && (
                  <div className="text-xs opacity-70">
                    회사: {plan.newCompanies.slice(0, 10).map((c) => c.ticker).join(", ")}
                    {plan.newCompanies.length > 10 ? "…" : ""}
                  </div>
                )}
                {plan.conflictCompanies.length > 0 && (
                  <div className="text-amber-300 text-xs">
                    ⚠ 이미 있는 티커 {plan.conflictCompanies.length}개는 건너뜁니다
                  </div>
                )}
              </div>
            ) : <span>추가할 항목이 없습니다.</span>,
          };
        }}
        onApply={async (plan) => {
          await bulkAddSectorsAndCompanies(user.uid, plan.newSectors, plan.newCompanies);
          toast.push(`섹터 ${plan.newSectors.length} · 회사 ${plan.newCompanies.length} 추가됨`, "success");
        }}
      />

      {/* 전체 가져오기 */}
      <ImportModal
        open={importMode === "full"}
        onClose={() => setImportMode(null)}
        title="전체 가져오기 (섹터+회사+노트)"
        formatGuide={FULL_FORMAT_GUIDE}
        parse={(json) => {
          // 기존 블록 카운트는 0으로 가정 (정확한 카운트는 비싸므로 나중 보완)
          const plan = parseFullImport(
            json,
            { sectors, companies },
            { sector: {}, company: {} }
          );
          const sectorBlockTotal = Object.values(plan.sectorBlocks).reduce((n, bs) => n + bs.length, 0);
          const companyBlockTotal = Object.values(plan.companyBlocks).reduce((n, bs) => n + bs.length, 0);
          const total = plan.newSectors.length + plan.newCompanies.length + sectorBlockTotal + companyBlockTotal;
          return {
            ok: total > 0,
            data: plan,
            summary: total > 0 ? (
              <div className="space-y-1.5">
                <div>+ 섹터 <b>{plan.newSectors.length}</b> · 회사 <b>{plan.newCompanies.length}</b></div>
                <div>+ 섹터 노트 <b>{sectorBlockTotal}</b> · 회사 노트 <b>{companyBlockTotal}</b></div>
                {plan.conflictCompanies.length > 0 && (
                  <div className="text-amber-300 text-xs">
                    ⚠ 이미 있는 티커 {plan.conflictCompanies.length}개는 회사·노트 모두 건너뜁니다
                  </div>
                )}
                <div className="text-xs opacity-70">노트는 항상 기존 뒤에 append (덮어쓰지 않음).</div>
              </div>
            ) : <span>추가할 항목이 없습니다.</span>,
          };
        }}
        onApply={async (plan) => {
          // 1) 섹터/회사 먼저
          await bulkAddSectorsAndCompanies(user.uid, plan.newSectors, plan.newCompanies);
          // 2) 섹터 노트 — 정확한 base order 를 위해 기존 블록 수 조회 후 재계산
          const sectorIds = Object.keys(plan.sectorBlocks);
          await Promise.all(
            sectorIds.map(async (sid) => {
              const existing = await listSectorBlocks(user.uid, sid);
              const baseOrder = existing.length;
              const reordered = plan.sectorBlocks[sid].map((b: any, i: number) => ({
                ...b, order: baseOrder + i,
              }));
              await bulkUpsertSectorBlocks(user.uid, sid, reordered);
            })
          );
          // 3) 회사 노트 — 충돌(이미 있는 티커)은 그대로 append
          const tickers = Object.keys(plan.companyBlocks);
          await Promise.all(
            tickers.map(async (t) => {
              const existing = await listCompanyBlocks(user.uid, t);
              const baseOrder = existing.length;
              const reordered = plan.companyBlocks[t].map((b: any, i: number) => ({
                ...b, order: baseOrder + i,
              }));
              await bulkUpsertCompanyBlocks(user.uid, t, reordered);
            })
          );
          toast.push("전체 가져오기 완료", "success");
        }}
      />
    </div>
  );
}
