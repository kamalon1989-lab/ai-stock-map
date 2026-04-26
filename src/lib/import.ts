import type { Block, Company, Sector } from "./types";

// ----- 일반 도우미 -----

export function textToTiptap(text: string): any {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paragraphs.length) return { type: "doc", content: [{ type: "paragraph" }] };
  return {
    type: "doc",
    content: paragraphs.map((p) => ({
      type: "paragraph",
      content: [{ type: "text", text: p }],
    })),
  };
}

function isTiptapDoc(v: any): boolean {
  return !!v && typeof v === "object" && v.type === "doc" && Array.isArray(v.content);
}

function normalizeBlockContent(raw: any): any {
  if (isTiptapDoc(raw?.content)) return raw.content;
  if (typeof raw?.text === "string") return textToTiptap(raw.text);
  if (typeof raw?.markdown === "string") return textToTiptap(raw.markdown);
  if (typeof raw === "string") return textToTiptap(raw);
  return { type: "doc", content: [{ type: "paragraph" }] };
}

// ----- 맵 가져오기 -----

export type SectorImport = {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  companies?: CompanyImport[];
};
export type CompanyImport = {
  ticker: string;
  name?: string;
  oneLineSummary?: string;
  tags?: string[];
  sectorId?: string;
  sectorName?: string;
};

export type MapImportPlan = {
  newSectors: Sector[];
  newCompanies: Company[];
  conflictCompanies: { incoming: Company; existing: Company }[];
  rawCounts: { sectors: number; companies: number };
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9가-힣\-]/g, "").slice(0, 40);

export function parseMapImport(
  raw: any,
  existing: { sectors: Sector[]; companies: Company[] }
): MapImportPlan {
  if (!raw || typeof raw !== "object") throw new Error("JSON 객체가 아닙니다");

  const sectorsRaw: SectorImport[] = Array.isArray(raw.sectors) ? raw.sectors : [];
  const companiesFlat: CompanyImport[] = Array.isArray(raw.companies) ? raw.companies : [];

  const existingSectorById = new Map(existing.sectors.map((s) => [s.id, s]));
  const existingSectorByName = new Map(
    existing.sectors.map((s) => [s.name.trim().toLowerCase(), s])
  );
  const existingCompanyByTicker = new Map(existing.companies.map((c) => [c.ticker, c]));

  const newSectors: Sector[] = [];
  const newCompanies: Company[] = [];
  const conflictCompanies: { incoming: Company; existing: Company }[] = [];

  // 새 섹터 생성 시 임시 매핑
  const resolvedSectorId: Record<string, string> = {}; // 입력측 id 또는 name → 실제 id

  let nextOrder = existing.sectors.length + newSectors.length;

  function resolveOrCreateSector(s: SectorImport): string | null {
    if (!s?.name) return null;
    const lookupName = s.name.trim().toLowerCase();
    const byId = s.id ? existingSectorById.get(s.id) : undefined;
    const byName = existingSectorByName.get(lookupName);
    if (byId) return byId.id;
    if (byName) return byName.id;
    // 새로 생성
    const id =
      (s.id && !existingSectorById.has(s.id) ? s.id : slugify(s.name)) +
      "-" + Date.now().toString(36).slice(-3) + Math.floor(Math.random() * 100);
    const created: Sector = {
      id,
      name: s.name.trim(),
      description: s.description,
      color: s.color ?? "#64748b",
      order: nextOrder++,
    };
    newSectors.push(created);
    existingSectorById.set(id, created);
    existingSectorByName.set(lookupName, created);
    return id;
  }

  // 1) 섹터 그룹 형태 처리
  for (const s of sectorsRaw) {
    const sid = resolveOrCreateSector(s);
    if (s.id) resolvedSectorId[s.id] = sid ?? "";
    if (s.name) resolvedSectorId[s.name.toLowerCase()] = sid ?? "";
    if (!sid) continue;
    for (const c of s.companies ?? []) ingestCompany(c, sid);
  }

  // 2) 평면 형태 처리 (sectorId 또는 sectorName 으로)
  for (const c of companiesFlat) {
    let sid: string | null = null;
    if (c.sectorId) {
      sid = existingSectorById.has(c.sectorId)
        ? c.sectorId
        : resolvedSectorId[c.sectorId] || null;
    }
    if (!sid && c.sectorName) {
      const matched = existingSectorByName.get(c.sectorName.trim().toLowerCase());
      sid = matched?.id ?? resolvedSectorId[c.sectorName.toLowerCase()] ?? null;
      if (!sid) sid = resolveOrCreateSector({ name: c.sectorName });
    }
    if (sid) ingestCompany(c, sid);
  }

  function ingestCompany(c: CompanyImport, sectorId: string) {
    if (!c?.ticker) return;
    const ticker = c.ticker.toUpperCase().trim();
    const incoming: Company = {
      ticker,
      name: c.name?.trim() || ticker,
      sectorId,
      oneLineSummary: c.oneLineSummary,
      tags: c.tags?.filter((t) => typeof t === "string") ?? [],
    };
    const existing = existingCompanyByTicker.get(ticker);
    if (existing) conflictCompanies.push({ incoming, existing });
    else {
      newCompanies.push(incoming);
      existingCompanyByTicker.set(ticker, incoming);
    }
  }

  return {
    newSectors,
    newCompanies,
    conflictCompanies,
    rawCounts: { sectors: sectorsRaw.length, companies: companiesFlat.length },
  };
}

// ----- 회사 섹션 가져오기 -----

export type SectionsImportPlan = {
  blocks: Block[]; // 현재 마지막 order 이후로 추가
};

export function parseSectionsImport(raw: any, existingBlocksLen: number): SectionsImportPlan {
  if (!raw) throw new Error("빈 입력");
  let blocksRaw: any[] = [];
  if (Array.isArray(raw)) blocksRaw = raw;
  else if (Array.isArray(raw.blocks)) blocksRaw = raw.blocks;
  else if (Array.isArray(raw.sections)) blocksRaw = raw.sections;
  else throw new Error("blocks 또는 sections 배열이 필요합니다");

  const blocks: Block[] = [];
  blocksRaw.forEach((b, i) => {
    const title = (b?.title ?? "").trim();
    if (!title) return;
    blocks.push({
      id:
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 7) +
        i.toString(36),
      type: "doc",
      title,
      content: normalizeBlockContent(b),
      order: existingBlocksLen + i,
    });
  });
  return { blocks };
}

// ----- 전체(섹터+회사+노트) 가져오기 -----

export type FullImportPlan = {
  newSectors: Sector[];
  newCompanies: Company[];
  conflictCompanies: { incoming: Company; existing: Company }[];
  // 섹터/회사 → 추가될 블록 (append)
  sectorBlocks: Record<string, Block[]>;  // key = sector id (resolved)
  companyBlocks: Record<string, Block[]>; // key = ticker (incoming)
};

export function parseFullImport(
  raw: any,
  existing: { sectors: Sector[]; companies: Company[] },
  existingBlockCounts: { sector: Record<string, number>; company: Record<string, number> }
): FullImportPlan {
  if (!raw || typeof raw !== "object") throw new Error("JSON 객체가 아닙니다");
  // 일반 맵 가져오기 로직 재사용 (sectors/companies 추출)
  const base = parseMapImport(raw, existing);

  const sectorBlocks: Record<string, Block[]> = {};
  const companyBlocks: Record<string, Block[]> = {};

  // sector id 매핑: 입력측 id 또는 name → 실제 id
  const sectorIdMap: Record<string, string> = {};
  for (const s of existing.sectors) {
    sectorIdMap[s.id] = s.id;
    sectorIdMap[s.name.trim().toLowerCase()] = s.id;
  }
  for (const s of base.newSectors) {
    sectorIdMap[s.id] = s.id;
    sectorIdMap[s.name.trim().toLowerCase()] = s.id;
  }

  const sectorsRaw: any[] = Array.isArray(raw.sectors) ? raw.sectors : [];
  for (const s of sectorsRaw) {
    if (!s?.name && !s?.id) continue;
    const sid =
      sectorIdMap[s.id] ??
      sectorIdMap[(s.name ?? "").trim().toLowerCase()];
    if (!sid) continue;
    if (!Array.isArray(s.blocks)) continue;
    const baseOrder = existingBlockCounts.sector[sid] ?? 0;
    sectorBlocks[sid] = (sectorBlocks[sid] ?? []).concat(
      s.blocks
        .filter((b: any) => b?.title)
        .map((b: any, i: number) => ({
          id:
            Date.now().toString(36) +
            Math.random().toString(36).slice(2, 7) +
            i.toString(36),
          type: "doc",
          title: String(b.title).trim(),
          content: normalizeBlockContent(b),
          order: baseOrder + i,
        }))
    );
  }

  const companiesRaw: any[] = [
    ...sectorsRaw.flatMap((s: any) => Array.isArray(s.companies) ? s.companies : []),
    ...(Array.isArray(raw.companies) ? raw.companies : []),
  ];
  for (const c of companiesRaw) {
    if (!c?.ticker || !Array.isArray(c.blocks)) continue;
    const ticker = String(c.ticker).toUpperCase().trim();
    const baseOrder = existingBlockCounts.company[ticker] ?? 0;
    companyBlocks[ticker] = (companyBlocks[ticker] ?? []).concat(
      c.blocks
        .filter((b: any) => b?.title)
        .map((b: any, i: number) => ({
          id:
            Date.now().toString(36) +
            Math.random().toString(36).slice(2, 7) +
            i.toString(36),
          type: "doc",
          title: String(b.title).trim(),
          content: normalizeBlockContent(b),
          order: baseOrder + i,
        }))
    );
  }

  return {
    newSectors: base.newSectors,
    newCompanies: base.newCompanies,
    conflictCompanies: base.conflictCompanies,
    sectorBlocks,
    companyBlocks,
  };
}

export const FULL_FORMAT_GUIDE = `다음 JSON 포맷으로 전체(섹터+회사+노트) 데이터를 줘:

{
  "kind": "ai-stock-full",
  "sectors": [
    {
      "name": "섹터 이름",
      "description": "...",
      "color": "#3b82f6",
      "blocks": [
        { "title": "섹터 노트 제목", "text": "본문..." }
      ],
      "companies": [
        {
          "ticker": "TICKER",
          "name": "회사명",
          "oneLineSummary": "한 줄 요약",
          "tags": ["#태그"],
          "blocks": [
            { "title": "사업모델", "text": "..." },
            { "title": "리스크", "text": "..." }
          ]
        }
      ]
    }
  ]
}

규칙:
- 기존 섹터에 추가하려면 같은 섹터 이름을 그대로 써.
- 이미 있는 티커는 자동 건너뜀 (덮어쓰지 않음).
- 노트 블록은 항상 추가됨 (기존 노트 뒤에 붙음, 덮어쓰지 않음).
- text 는 빈 줄(\\n\\n)로 단락 구분.`;

// ----- AI 에 줄 포맷 안내 (모달에서 보여줌) -----

export const MAP_FORMAT_GUIDE = `다음 JSON 포맷으로 새 섹터/회사를 추가해서 돌려줘:

{
  "kind": "ai-stock-map",
  "sectors": [
    {
      "name": "섹터 이름",
      "description": "섹터 설명 (선택)",
      "color": "#3b82f6",
      "companies": [
        {
          "ticker": "TICKER",
          "name": "회사명",
          "oneLineSummary": "한 줄 요약",
          "tags": ["#태그1", "#태그2"]
        }
      ]
    }
  ]
}

규칙:
- 이미 있는 섹터에 회사를 추가하려면 같은 섹터 이름을 그대로 써.
- 이미 있는 티커는 덮어쓰지 않고 충돌로 표시되니, 신규 종목 위주로.
- color 는 hex (#rrggbb) 만.`;

export const SECTIONS_FORMAT_GUIDE = `다음 JSON 포맷으로 노트 섹션을 만들어줘:

{
  "blocks": [
    { "title": "사업모델", "text": "여러 줄 자유 텍스트.\\n\\n빈 줄로 단락 구분." },
    { "title": "리스크", "text": "..." }
  ]
}

각 블록은 title + text 만 있으면 충분 (text 대신 markdown 도 가능).
text 는 빈 줄(\\n\\n)로 단락이 나뉘고, 각 단락이 본문 문단이 됨.`;
