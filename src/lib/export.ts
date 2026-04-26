import type { Block, Company, Sector } from "./types";
import { listCompanyBlocks, listSectorBlocks } from "./data";

export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function buildMapExport(sectors: Sector[], companies: Company[]) {
  return {
    exportedAt: new Date().toISOString(),
    kind: "ai-stock-map",
    sectors: sectors
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        companies: companies
          .filter((c) => c.sectorId === s.id)
          .map((c) => ({
            ticker: c.ticker,
            name: c.name,
            oneLineSummary: c.oneLineSummary,
            tags: c.tags,
          })),
      })),
  };
}

// 전체 백업/이동용 — 섹터 + 회사 + 모든 노트 블록을 포함
export async function buildFullExport(uid: string, sectors: Sector[], companies: Company[]) {
  const [sectorBlocks, companyBlocks] = await Promise.all([
    Promise.all(sectors.map((s) => listSectorBlocks(uid, s.id))),
    Promise.all(companies.map((c) => listCompanyBlocks(uid, c.ticker))),
  ]);
  const stripBlock = (b: Block) => ({
    title: b.title, content: b.content, order: b.order, updatedAt: b.updatedAt,
  });
  return {
    kind: "ai-stock-full",
    version: 1,
    exportedAt: new Date().toISOString(),
    sectors: sectors.map((s, i) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      color: s.color,
      order: s.order,
      blocks: sectorBlocks[i].map(stripBlock),
    })),
    companies: companies.map((c, i) => ({
      ticker: c.ticker,
      name: c.name,
      sectorId: c.sectorId,
      oneLineSummary: c.oneLineSummary,
      tags: c.tags,
      blocks: companyBlocks[i].map(stripBlock),
    })),
  };
}

export function buildCompanyExport(company: Company, blocks: Block[]) {
  return {
    exportedAt: new Date().toISOString(),
    kind: "ai-stock-company",
    company,
    blocks: blocks
      .sort((a, b) => a.order - b.order)
      .map((b) => ({ title: b.title, content: b.content, updatedAt: b.updatedAt })),
  };
}

// TipTap JSON → plain markdown (가벼운 변환)
export function tiptapToMarkdown(node: any): string {
  if (!node) return "";
  if (node.type === "doc") return (node.content ?? []).map(tiptapToMarkdown).join("\n\n");
  if (node.type === "paragraph") return (node.content ?? []).map(tiptapToMarkdown).join("");
  if (node.type === "heading") {
    const lvl = node.attrs?.level ?? 1;
    return "#".repeat(lvl) + " " + (node.content ?? []).map(tiptapToMarkdown).join("");
  }
  if (node.type === "bulletList")
    return (node.content ?? []).map((li: any) => "- " + tiptapToMarkdown(li).trim()).join("\n");
  if (node.type === "orderedList")
    return (node.content ?? [])
      .map((li: any, i: number) => `${i + 1}. ` + tiptapToMarkdown(li).trim())
      .join("\n");
  if (node.type === "listItem") return (node.content ?? []).map(tiptapToMarkdown).join("");
  if (node.type === "blockquote")
    return "> " + (node.content ?? []).map(tiptapToMarkdown).join("\n> ");
  if (node.type === "codeBlock") return "```\n" + (node.content?.[0]?.text ?? "") + "\n```";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "text") {
    let t = node.text ?? "";
    for (const m of node.marks ?? []) {
      if (m.type === "bold") t = `**${t}**`;
      else if (m.type === "italic") t = `*${t}*`;
      else if (m.type === "code") t = `\`${t}\``;
    }
    return t;
  }
  return (node.content ?? []).map(tiptapToMarkdown).join("");
}

export function buildPromptPayload(company: Company, blocks: Block[]): string {
  const md = blocks
    .sort((a, b) => a.order - b.order)
    .map((b) => `## ${b.title}\n${tiptapToMarkdown(b.content)}`)
    .join("\n\n");
  return [
    `다음은 내가 정리한 ${company.name} (${company.ticker}) 관련 정보야.`,
    company.oneLineSummary ? `한줄요약: ${company.oneLineSummary}` : "",
    company.tags?.length ? `태그: ${company.tags.join(", ")}` : "",
    "",
    md,
    "",
    "---",
    "이 정보를 바탕으로 [질문을 여기에 작성]",
  ].filter(Boolean).join("\n");
}
