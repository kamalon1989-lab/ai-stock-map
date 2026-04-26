"use client";
import { useMemo, useState } from "react";
import type { Block } from "@/lib/types";
import BlockEditor from "./BlockEditor";
import Modal, { Field, btnPrimary, btnSecondary, inputClass } from "./Modal";
import ImportModal from "./ImportModal";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";
import { SECTIONS_FORMAT_GUIDE, parseSectionsImport } from "@/lib/import";

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const emptyDoc = () => ({ type: "doc", content: [{ type: "paragraph" }] });

export type NotesStore = {
  upsert: (b: Block) => Promise<void>;
  remove: (id: string) => Promise<void>;
  bulkUpsert: (bs: Block[]) => Promise<void>;
};

export default function NotesSection({
  blocks, setBlocks, store, importTitle,
}: {
  blocks: Block[];
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  store: NotesStore;
  importTitle: string;
}) {
  const toast = useToast();
  const confirmDialog = useConfirm();

  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const isEditing = (id: string) => id in drafts;

  const [sectionModal, setSectionModal] = useState<
    { mode: "add" } | { mode: "rename"; block: Block } | null
  >(null);
  const [sectionTitle, setSectionTitle] = useState("");

  const [importOpen, setImportOpen] = useState(false);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order - b.order),
    [blocks]
  );

  const startEditBlock = (b: Block) =>
    setDrafts((d) => ({ ...d, [b.id]: b.content ?? emptyDoc() }));
  const cancelEditBlock = (id: string) =>
    setDrafts((d) => { const n = { ...d }; delete n[id]; return n; });

  const saveBlock = async (b: Block) => {
    const content = drafts[b.id] ?? b.content;
    const next = { ...b, content };
    await store.upsert(next);
    setBlocks((xs) => xs.map((x) => (x.id === b.id ? next : x)));
    cancelEditBlock(b.id);
    toast.push("저장됨", "success");
  };

  const openAdd = () => { setSectionTitle(""); setSectionModal({ mode: "add" }); };
  const openRename = (b: Block) => { setSectionTitle(b.title); setSectionModal({ mode: "rename", block: b }); };

  const submitSection = async () => {
    if (!sectionModal) return;
    const title = sectionTitle.trim();
    if (!title) return toast.push("제목을 입력하세요", "error");
    if (sectionModal.mode === "add") {
      const b: Block = { id: newId(), type: "doc", title, content: emptyDoc(), order: blocks.length };
      await store.upsert(b);
      setBlocks([...blocks, b]);
      startEditBlock(b);
    } else {
      const next = { ...sectionModal.block, title };
      await store.upsert(next);
      setBlocks(blocks.map((x) => (x.id === next.id ? next : x)));
    }
    setSectionModal(null);
  };

  const onDelete = async (b: Block) => {
    const ok = await confirmDialog({
      title: "섹션 삭제",
      message: `"${b.title}" 섹션을 삭제할까요?`,
      danger: true, confirmLabel: "삭제",
    });
    if (!ok) return;
    await store.remove(b.id);
    setBlocks(blocks.filter((x) => x.id !== b.id));
    cancelEditBlock(b.id);
    toast.push("섹션 삭제됨", "success");
  };

  const onMove = async (b: Block, dir: -1 | 1) => {
    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((x) => x.id === b.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    [sorted[i].order, sorted[j].order] = [sorted[j].order, sorted[i].order];
    await Promise.all([store.upsert(sorted[i]), store.upsert(sorted[j])]);
    setBlocks([...sorted]);
  };

  return (
    <>
      <div className="flex items-center mb-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">노트 섹션</h2>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setImportOpen(true)} className={btnSecondary}>가져오기</button>
          <button onClick={openAdd} className={btnSecondary}>+ 섹션 추가</button>
        </div>
      </div>

      <div className="space-y-4">
        {sortedBlocks.length === 0 && (
          <div className="text-slate-500 text-sm italic py-12 text-center border border-dashed border-slate-800 rounded-xl">
            섹션이 없습니다. [+ 섹션 추가] 또는 [가져오기] 로 시작하세요.
          </div>
        )}
        {sortedBlocks.map((b) => {
          const editing = isEditing(b.id);
          return (
            <section key={b.id}
              className={`rounded-xl border bg-slate-900/30 overflow-hidden transition-colors ${
                editing ? "border-indigo-700/50" : "border-slate-800 hover:border-slate-700"
              }`}>
              <div className="px-4 py-2.5 border-b border-slate-800 flex items-center gap-1">
                <h3 className="font-semibold text-slate-200 flex-1 truncate">{b.title}</h3>
                {editing ? (
                  <>
                    <button onClick={() => cancelEditBlock(b.id)} className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors">취소</button>
                    <button onClick={() => saveBlock(b)} className="text-xs px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 transition-colors">저장</button>
                  </>
                ) : (
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => onMove(b, -1)} title="위로" className="text-slate-500 hover:text-white px-1.5 py-1 rounded hover:bg-slate-800 transition-colors text-xs">↑</button>
                    <button onClick={() => onMove(b, 1)} title="아래로" className="text-slate-500 hover:text-white px-1.5 py-1 rounded hover:bg-slate-800 transition-colors text-xs">↓</button>
                    <button onClick={() => openRename(b)} title="이름 변경" className="text-slate-500 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors text-xs">이름</button>
                    <button onClick={() => startEditBlock(b)} className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-indigo-700 transition-colors ml-1">편집</button>
                    <button onClick={() => onDelete(b)} title="삭제" className="text-slate-500 hover:text-rose-400 px-2 py-1 rounded hover:bg-slate-800 transition-colors text-xs">×</button>
                  </div>
                )}
              </div>
              <div className="p-4">
                <BlockEditor
                  key={b.id + (editing ? ":edit" : ":view")}
                  editable={editing}
                  content={editing ? drafts[b.id] : b.content}
                  onChange={(json) => editing && setDrafts((d) => ({ ...d, [b.id]: json }))}
                />
              </div>
            </section>
          );
        })}
      </div>

      <Modal
        open={!!sectionModal}
        onClose={() => setSectionModal(null)}
        title={sectionModal?.mode === "rename" ? "섹션 이름 변경" : "새 섹션 추가"}
        footer={
          <>
            <button onClick={() => setSectionModal(null)} className={btnSecondary}>취소</button>
            <button onClick={submitSection} className={btnPrimary}>
              {sectionModal?.mode === "rename" ? "저장" : "추가"}
            </button>
          </>
        }
      >
        <Field label="섹션 제목" hint="예: 사업모델 / 재무 / 리스크 / 최근 이슈">
          <input autoFocus value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            className={inputClass}
            onKeyDown={(e) => e.key === "Enter" && submitSection()} />
        </Field>
      </Modal>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title={importTitle}
        formatGuide={SECTIONS_FORMAT_GUIDE}
        parse={(json) => {
          const plan = parseSectionsImport(json, blocks.length);
          return {
            ok: plan.blocks.length > 0,
            data: plan,
            summary: plan.blocks.length > 0 ? (
              <div>
                <span className="font-semibold">+ 새 섹션 {plan.blocks.length}</span>
                <span className="text-xs text-emerald-300/70 ml-2">
                  ({plan.blocks.map((b) => b.title).join(", ")})
                </span>
              </div>
            ) : (<span>추가할 섹션이 없습니다.</span>),
          };
        }}
        onApply={async (plan) => {
          await store.bulkUpsert(plan.blocks);
          setBlocks((bs) => [...bs, ...plan.blocks]);
          toast.push(`섹션 ${plan.blocks.length}개 추가됨`, "success");
        }}
      />
    </>
  );
}
