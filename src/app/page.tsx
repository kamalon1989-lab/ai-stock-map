"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

type Scores = {
  stock?: number | null;
  entry?: number | null;
  attack?: number | null;
};

type Risk = {
  name: string;
  level?: string;
  response?: string;
};

type Valuation = {
  currentPrice?: number | null;
  eps?: number | null;
  forwardEps?: number | null;
  per?: number | null;
  forwardPer?: number | null;
  fairPer?: number | null;
  bearTarget?: number | null;
  baseTarget?: number | null;
  bullTarget?: number | null;
  targetPrice?: number | null;
  upside?: string;
  view?: string;
};

type ValueChainPosition = {
  layer: string;
  aiRevenueShare: number | null;
  aiRevenueTrend: "expanding" | "stable" | "shrinking";
  exposureType: "direct" | "indirect" | "infrastructure";
  replaceability: string;
  competitors: string[];
};

type QuarterlyDatum = {
  id: string;
  quarter: string;
  reportDate: string;
  dataCenterRevenue: number | null;
  revenueYoY: number | null;
  revenueQoQ: number | null;
  nextQuarterGuidance: string;
  keyCustomers: string;
  notes: string;
};

type Catalyst = {
  id: string;
  date: string;
  event: string;
  category: "earnings" | "product" | "conference" | "policy" | "customer_earnings" | "other";
  impact: "high" | "medium" | "low";
  notes: string;
};

type StockProfile = {
  ticker: string;
  companyName: string;
  sector: string;
  aiValueChain: string[];
  oneLineThesis?: string;
  businessModel?: string;
  status?: string;
  heatmapSectorId?: string;
  heatmapWeight?: number | null;
  updatedAt: string;
};

type MarketData = {
  marketSnapshot?: {
    marketCap?: number | null;
    regularMarketPrice?: number | null;
    dayChangePercent?: number | null;
    return3m?: number | null;
    return1y?: number | null;
    distanceFromHigh52w?: number | null;
  };
};

type ThesisSnapshot = {
  id: string;
  type: "thesis";
  ticker: string;
  companyName?: string;
  reportDate: string;
  sector?: string;
  aiValueChain?: string[];
  oneLineThesis?: string;
  action?: string;
  currentPrice?: number | null;
  buyPrice1?: number | null;
  buyPrice2?: number | null;
  stopLoss?: number | null;
  targetPrice1?: number | null;
  targetPrice2?: number | null;
  longTermTarget?: number | null;
  scores?: Scores;
  businessModel?: string;
  investmentPoints?: string[];
  recentNews?: string[];
  earningsAndGuidance?: string;
  outlook?: string;
  valuation?: Valuation;
  valueChainPosition?: ValueChainPosition;
  quarterlyData?: QuarterlyDatum[];
  catalysts?: Catalyst[];
  tradingStrategy?: string;
  risks?: Risk[];
  finalView?: string;
  rawText?: string;
};

type DailyCheck = {
  id: string;
  type: "daily_check";
  ticker: string;
  checkDate: string;
  currentPrice?: number | null;
  chartTrend?: string;
  supportLevels?: number[];
  resistanceLevels?: number[];
  action?: string;
  entryPlan?: string;
  stopRule?: string;
  memo?: string;
  rawText?: string;
};

type AiNote = {
  id: string;
  ticker: string;
  noteDate: string;
  title: string;
  body: string;
};

type AppState = {
  profiles: Record<string, StockProfile>;
  theses: ThesisSnapshot[];
  dailyChecks: DailyCheck[];
  aiNotes: AiNote[];
  heatmapSectors?: Array<{
    id: string;
    name: string;
    color: string;
    order: number;
  }>;
  companyDetails?: Record<string, {
    valueChainPosition?: ValueChainPosition;
    valuation?: Valuation;
    quarterlyData?: QuarterlyDatum[];
    catalysts?: Catalyst[];
    risks?: Risk[];
    marketData?: MarketData;
  }>;
};

const STORAGE_KEY = "ai-map-thesis-os-v1";

const VALUE_CHAIN = [
  { id: "GPU/ASIC", label: "GPU/ASIC", accent: "bg-emerald-400", aliases: ["gpu", "asic", "반도체", "가속기"] },
  { id: "HBM/메모리", label: "HBM/메모리", accent: "bg-sky-400", aliases: ["hbm", "메모리", "dram", "nand"] },
  { id: "광통신", label: "광통신", accent: "bg-indigo-400", aliases: ["광통신", "네트워크", "optical", "transceiver"] },
  { id: "전력/냉각", label: "전력/냉각", accent: "bg-amber-400", aliases: ["전력", "냉각", "전력 인프라", "냉각 인프라", "전기"] },
  { id: "클라우드", label: "클라우드", accent: "bg-cyan-400", aliases: ["클라우드", "데이터센터", "hyperscaler", "서버"] },
  { id: "로봇/피지컬 AI", label: "로봇/피지컬 AI", accent: "bg-rose-400", aliases: ["로봇", "피지컬", "physical", "자동화"] },
  { id: "보안/소프트웨어", label: "보안/소프트웨어", accent: "bg-violet-400", aliases: ["보안", "소프트웨어", "security", "saas"] },
  { id: "미분류", label: "미분류", accent: "bg-slate-400", aliases: [] },
];

const emptyState: AppState = {
  profiles: {},
  theses: [],
  dailyChecks: [],
  aiNotes: [],
  heatmapSectors: [],
  companyDetails: {},
};

const thesisPrompt = `아래 종목을 AI 관련주 Thesis Workspace에 처음 등록할 수 있게 가볍게 분석해줘.

조건:
1. 최초 분석은 종목을 만드는 용도라서 너무 자세하게 쓰지 말고, 회사 정체성과 투자 가설 중심으로 작성해줘.
2. 이 회사가 무엇을 하는 회사인지, AI 밸류체인에서 대략 어디에 가까운지, 왜 관심을 가질 만한지만 정리해줘.
3. 밸류에이션, 목표주가, 실적 세부표, Catalyst, 리스크 시나리오는 묻지 말고 비워둬. 이후 종목 상세 페이지에서 따로 채울 거야.
4. 어려운 금융용어는 쉽게 풀어서 써줘.
5. 모르는 값은 추정하지 말고 빈 문자열, null, 빈 배열로 넣어줘.
6. 답변 마지막에는 반드시 REPORT_JSON 블록을 넣어줘.
7. JSON 키 이름은 항상 동일하게 유지해줘.

REPORT_JSON 형식:
\`\`\`json
{
  "type": "thesis",
  "ticker": "",
  "companyName": "",
  "reportDate": "YYYY-MM-DD",
  "sector": "",
  "aiValueChain": [],
  "oneLineThesis": "",
  "action": "관심종목 등록",
  "currentPrice": null,
  "businessModel": "",
  "investmentPoints": [],
  "earningsAndGuidance": "",
  "outlook": "",
  "finalView": ""
}
\`\`\``;

const dailyPrompt = `아래 차트와 현재 상황을 Daily Check 형식으로 분석해줘.

조건:
1. 오늘 행동 판단 중심으로 짧고 명확하게 써줘.
2. 답변 마지막에는 반드시 REPORT_JSON 블록을 넣어줘.
3. type은 "daily_check"로 넣어줘.
4. 지지선과 저항선은 숫자 배열로 넣어줘.

REPORT_JSON 형식:
\`\`\`json
{
  "type": "daily_check",
  "ticker": "",
  "checkDate": "YYYY-MM-DD",
  "currentPrice": null,
  "chartTrend": "",
  "supportLevels": [],
  "resistanceLevels": [],
  "action": "",
  "entryPlan": "",
  "stopRule": "",
  "memo": ""
}
\`\`\``;

const heatmapPrompt = `내가 AI 인프라 관련주로 나만의 스탁 히트맵을 만들려고 해.

조건:
1. 내가 직접 큐레이션할 수 있게 섹터와 관심종목만 정리해줘.
2. 섹터는 너무 많이 만들지 말고 5~8개 정도로 묶어줘.
3. 각 종목은 ticker, companyName, weight, oneLineThesis를 넣어줘.
4. weight는 히트맵 타일 크기에 쓸 관심도 가중치야. 핵심 종목은 4~6, 보조 관심종목은 1~3으로 줘.
5. 확실하지 않은 종목은 넣지 말고, 모르면 비워둬.
6. 설명은 짧게 하고 마지막에 HEATMAP_JSON 블록만 정확히 넣어줘.

HEATMAP_JSON 형식:
\`\`\`json
{
  "sectors": [
    {
      "name": "GPU/ASIC",
      "stocks": [
        {
          "ticker": "NVDA",
          "companyName": "NVIDIA",
          "weight": 6,
          "oneLineThesis": "AI 가속기 생태계의 핵심 플랫폼 기업"
        }
      ]
    },
    {
      "name": "전력/냉각",
      "stocks": [
        {
          "ticker": "VRT",
          "companyName": "Vertiv",
          "weight": 4,
          "oneLineThesis": "AI 데이터센터 전력·냉각 인프라 수혜주"
        }
      ]
    }
  ]
}
\`\`\``;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function asTicker(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
}

function normalizeRisks(value: unknown): Risk[] {
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(/\n|;|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({ name: item, response: "" }));
  }
  if (!Array.isArray(value)) {
    if (typeof value === "object") {
      return Object.entries(value as Record<string, unknown>).map(([name, detail]) => ({
        name,
        response: typeof detail === "string" ? detail : JSON.stringify(detail),
      }));
    }
    return [];
  }
  return value
    .map((item) => {
      if (typeof item === "string") return { name: item, response: "" };
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      return {
        name: String(record.name ?? record.risk ?? record.title ?? record.factor ?? "리스크"),
        level: record.level ? String(record.level) : record.severity ? String(record.severity) : undefined,
        response: record.response
          ? String(record.response)
          : record.mitigation
            ? String(record.mitigation)
            : record.detail
              ? String(record.detail)
              : record.description
                ? String(record.description)
                : "",
      };
    })
    .filter(Boolean) as Risk[];
}

function normalizeValuation(value: unknown): Valuation | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const num = (key: string) => {
    const raw = record[key];
    const parsed = Number(raw);
    return raw === null || raw === undefined || Number.isNaN(parsed) ? null : parsed;
  };
  return {
    currentPrice: num("currentPrice"),
    eps: num("eps"),
    forwardEps: num("forwardEps"),
    per: num("per"),
    forwardPer: num("forwardPer"),
    fairPer: num("fairPer"),
    bearTarget: num("bearTarget"),
    baseTarget: num("baseTarget"),
    bullTarget: num("bullTarget"),
    targetPrice: num("targetPrice"),
    upside: record.upside ? String(record.upside) : "",
    view: record.view ? String(record.view) : "",
  };
}

function normalizePosition(value: unknown): ValueChainPosition | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const trend = String(record.aiRevenueTrend ?? "expanding");
  const exposure = String(record.exposureType ?? "direct");
  return {
    layer: String(record.layer ?? record.valueChainLayer ?? "미분류"),
    aiRevenueShare: record.aiRevenueShare === null || record.aiRevenueShare === undefined ? null : Number(record.aiRevenueShare),
    aiRevenueTrend: trend === "stable" || trend === "shrinking" ? trend : "expanding",
    exposureType: exposure === "indirect" || exposure === "infrastructure" ? exposure : "direct",
    replaceability: String(record.replaceability ?? ""),
    competitors: Array.isArray(record.competitors) ? record.competitors.map((item) => String(item).trim().toUpperCase()).filter(Boolean) : [],
  };
}

function normalizeQuarterly(value: unknown): QuarterlyDatum[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const record = item as Record<string, unknown>;
      return {
        id: uid("q"),
        quarter: String(record.quarter ?? ""),
        reportDate: String(record.reportDate ?? ""),
        dataCenterRevenue: record.dataCenterRevenue === null || record.dataCenterRevenue === undefined ? null : Number(record.dataCenterRevenue),
        revenueYoY: record.revenueYoY === null || record.revenueYoY === undefined ? null : Number(record.revenueYoY),
        revenueQoQ: record.revenueQoQ === null || record.revenueQoQ === undefined ? null : Number(record.revenueQoQ),
        nextQuarterGuidance: String(record.nextQuarterGuidance ?? ""),
        keyCustomers: String(record.keyCustomers ?? ""),
        notes: String(record.notes ?? ""),
      };
    });
}

function normalizeCatalysts(value: unknown): Catalyst[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const record = item as Record<string, unknown>;
      const category = String(record.category ?? "other");
      const impact = String(record.impact ?? "medium");
      return {
        id: uid("cat"),
        date: String(record.date ?? ""),
        event: String(record.event ?? ""),
        category: ["earnings", "product", "conference", "policy", "customer_earnings", "other"].includes(category) ? category as Catalyst["category"] : "other",
        impact: ["high", "medium", "low"].includes(impact) ? impact as Catalyst["impact"] : "medium",
        notes: String(record.notes ?? ""),
      };
    });
}

function extractJsonBlock(text: string) {
  const reportMatch = text.match(/REPORT_JSON\s*:\s*```(?:json)?\s*([\s\S]*?)```/i);
  if (reportMatch?.[1]) return reportMatch[1].trim();

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) return text.slice(firstBrace, lastBrace + 1);

  throw new Error("REPORT_JSON 블록을 찾지 못했어요.");
}

function extractAnyJson(text: string) {
  const namedMatch = text.match(/(?:REPORT_JSON|HEATMAP_JSON)\s*:\s*```(?:json)?\s*([\s\S]*?)```/i);
  if (namedMatch?.[1]) return namedMatch[1].trim();

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  const firstObject = text.indexOf("{");
  const lastObject = text.lastIndexOf("}");
  const firstArray = text.indexOf("[");
  const lastArray = text.lastIndexOf("]");

  if (firstObject >= 0 && lastObject > firstObject && (firstArray < 0 || firstObject < firstArray)) {
    return text.slice(firstObject, lastObject + 1);
  }
  if (firstArray >= 0 && lastArray > firstArray) {
    return text.slice(firstArray, lastArray + 1);
  }

  throw new Error("JSON 블록을 찾지 못했어요.");
}

function parseReport(text: string): ThesisSnapshot | DailyCheck {
  const json = JSON.parse(extractJsonBlock(text));
  const type = json.type === "daily_check" ? "daily_check" : "thesis";
  const ticker = asTicker(json.ticker);

  if (!ticker) {
    throw new Error("ticker 값이 비어 있어요.");
  }

  if (type === "daily_check") {
    return {
      id: uid("daily"),
      type,
      ticker,
      checkDate: String(json.checkDate || today()),
      currentPrice: json.currentPrice ?? null,
      chartTrend: json.chartTrend || "",
      supportLevels: toNumberArray(json.supportLevels),
      resistanceLevels: toNumberArray(json.resistanceLevels),
      action: json.action || "",
      entryPlan: json.entryPlan || "",
      stopRule: json.stopRule || "",
      memo: json.memo || "",
      rawText: text,
    };
  }

  return {
    id: uid("thesis"),
    type,
    ticker,
    companyName: json.companyName || ticker,
    reportDate: String(json.reportDate || today()),
    sector: json.sector || "",
    aiValueChain: Array.isArray(json.aiValueChain) ? json.aiValueChain.map(String) : [],
    oneLineThesis: json.oneLineThesis || "",
    action: json.action || "",
    currentPrice: json.currentPrice ?? null,
    buyPrice1: json.buyPrice1 ?? null,
    buyPrice2: json.buyPrice2 ?? null,
    stopLoss: json.stopLoss ?? null,
    targetPrice1: json.targetPrice1 ?? null,
    targetPrice2: json.targetPrice2 ?? null,
    longTermTarget: json.longTermTarget ?? null,
    scores: json.scores ?? {},
    businessModel: json.businessModel || "",
    investmentPoints: Array.isArray(json.investmentPoints) ? json.investmentPoints.map(String) : [],
    recentNews: Array.isArray(json.recentNews) ? json.recentNews.map(String) : [],
    earningsAndGuidance: json.earningsAndGuidance || "",
    outlook: json.outlook || "",
    valuation: normalizeValuation(json.valuation),
    valueChainPosition: normalizePosition(json.valueChainPosition),
    quarterlyData: normalizeQuarterly(json.quarterlyData),
    catalysts: normalizeCatalysts(json.catalysts),
    tradingStrategy: json.tradingStrategy || "",
    risks: normalizeRisks(json.risks),
    finalView: json.finalView || "",
    rawText: text,
  };
}

function latestByDate<T extends { reportDate?: string; checkDate?: string }>(items: T[]) {
  return [...items].sort((a, b) =>
    String(b.reportDate || b.checkDate || "").localeCompare(String(a.reportDate || a.checkDate || ""))
  )[0];
}

function price(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function matchesChain(profile: StockProfile, chain: (typeof VALUE_CHAIN)[number]): boolean {
  const values = profile.aiValueChain.map((value) => value.toLowerCase());

  if (chain.id === "미분류") {
    return !VALUE_CHAIN.filter((item) => item.id !== "미분류").some((item) => matchesChain(profile, item));
  }

  return values.some((value) =>
    [chain.id, chain.label, ...chain.aliases].some((alias) => {
      const normalized = alias.toLowerCase();
      return value.includes(normalized) || normalized.includes(value);
    })
  );
}

function getPrimaryChain(profile: StockProfile) {
  const normalChains = VALUE_CHAIN.filter((item) => item.id !== "미분류");
  const values = [profile.sector, ...(profile.aiValueChain ?? [])].map((value) => value.toLowerCase());

  const matched = normalChains.find((chain) =>
    values.some((value) =>
      [chain.id, chain.label, ...chain.aliases].some((alias) => {
        const normalized = alias.toLowerCase();
        return value.includes(normalized) || normalized.includes(value);
      })
    )
  );

  return matched ?? VALUE_CHAIN[VALUE_CHAIN.length - 1];
}

function persistState(next: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function repairHeatmapSectors(state: AppState): AppState {
  const existing = state.heatmapSectors ?? [];
  if (existing.length > 0) return state;

  const profiles = Object.values(state.profiles ?? {}).filter((profile) => profile.heatmapSectorId);
  if (profiles.length === 0) return { ...state, heatmapSectors: [] };

  const byId = new Map<string, string>();
  for (const profile of profiles) {
    if (!profile.heatmapSectorId) continue;
    byId.set(profile.heatmapSectorId, profile.sector || profile.aiValueChain?.[0] || "미분류");
  }

  return {
    ...state,
    heatmapSectors: [...byId.entries()].map(([id, name], index) => ({
      id,
      name,
      color: SECTOR_COLORS[index % SECTOR_COLORS.length],
      order: index,
    })),
  };
}

function score(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(1);
}

function compactMoney(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  const abs = Math.abs(Number(value));
  if (abs >= 1_000_000_000_000) return `$${(Number(value) / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `$${(Number(value) / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(Number(value) / 1_000_000).toFixed(2)}M`;
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function percent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`;
}

function tileTone(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "bg-slate-800 border-slate-700";
  if (value >= 20) return "bg-emerald-700/90 border-emerald-500";
  if (value >= 5) return "bg-emerald-900/90 border-emerald-700";
  if (value > -5) return "bg-slate-700/90 border-slate-600";
  if (value > -20) return "bg-rose-900/90 border-rose-700";
  return "bg-rose-700/90 border-rose-500";
}

const SECTOR_COLORS = ["#10b981", "#38bdf8", "#818cf8", "#f59e0b", "#22d3ee", "#fb7185", "#a78bfa", "#94a3b8"];

type TreemapRect<T> = {
  item: T;
  x: number;
  y: number;
  w: number;
  h: number;
};

function treemapLayout<T>(
  items: T[],
  valueOf: (item: T) => number,
  x = 0,
  y = 0,
  w = 100,
  h = 100
): TreemapRect<T>[] {
  const filtered = items
    .map((item) => ({ item, value: Math.max(0.01, valueOf(item)) }))
    .filter((row) => Number.isFinite(row.value) && row.value > 0)
    .sort((a, b) => b.value - a.value);

  if (filtered.length === 0) return [];
  if (filtered.length === 1) return [{ item: filtered[0].item, x, y, w, h }];

  const total = filtered.reduce((sum, row) => sum + row.value, 0);
  let running = 0;
  let splitIndex = 1;
  for (let index = 0; index < filtered.length - 1; index += 1) {
    const next = running + filtered[index].value;
    if (Math.abs(total / 2 - next) <= Math.abs(total / 2 - running)) {
      running = next;
      splitIndex = index + 1;
    } else {
      break;
    }
  }

  const first = filtered.slice(0, splitIndex);
  const second = filtered.slice(splitIndex);
  const firstTotal = first.reduce((sum, row) => sum + row.value, 0);
  const ratio = firstTotal / total;

  if (w >= h) {
    const firstW = w * ratio;
    return [
      ...treemapLayout(first.map((row) => row.item), valueOf, x, y, firstW, h),
      ...treemapLayout(second.map((row) => row.item), valueOf, x + firstW, y, w - firstW, h),
    ];
  }

  const firstH = h * ratio;
  return [
    ...treemapLayout(first.map((row) => row.item), valueOf, x, y, w, firstH),
    ...treemapLayout(second.map((row) => row.item), valueOf, x, y + firstH, w, h - firstH),
  ];
}

function heatColor(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "#3f3f46";
  const v = Math.max(-8, Math.min(8, Number(value)));
  if (v >= 5) return "#00a35b";
  if (v >= 2) return "#007a3d";
  if (v > 0.2) return "#173d2a";
  if (v >= -0.2) return "#3f3f46";
  if (v >= -2) return "#7f1d1d";
  if (v >= -5) return "#991b1b";
  return "#ef3340";
}

function Button({
  children,
  onClick,
  tone = "slate",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "slate" | "emerald" | "rose" | "amber";
  type?: "button" | "submit";
}) {
  const tones = {
    slate: "bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700",
    emerald: "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500",
    rose: "bg-rose-700 hover:bg-rose-600 text-white border-rose-600",
    amber: "bg-amber-600 hover:bg-amber-500 text-white border-amber-500",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

export default function MapPage() {
  const [state, setState] = useState<AppState>(emptyState);
  const [selectedTicker, setSelectedTicker] = useState("");
  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState("");
  const [promptMode, setPromptMode] = useState<"thesis" | "daily">("thesis");
  const [hydrated, setHydrated] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");
  const [newStockTicker, setNewStockTicker] = useState("");
  const [newStockName, setNewStockName] = useState("");
  const [newStockSectorId, setNewStockSectorId] = useState("");
  const [newStockWeight, setNewStockWeight] = useState("1");
  const [sizeMode, setSizeMode] = useState<"marketCap" | "interest">("marketCap");
  const [colorMode, setColorMode] = useState<"dayChangePercent" | "return3m" | "return1y" | "distanceFromHigh52w">("dayChangePercent");
  const [heatmapJson, setHeatmapJson] = useState("");
  const [heatmapPromptCopied, setHeatmapPromptCopied] = useState(false);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AppState;
        setState(repairHeatmapSectors({
          profiles: parsed.profiles ?? {},
          theses: parsed.theses ?? [],
          dailyChecks: parsed.dailyChecks ?? [],
          aiNotes: parsed.aiNotes ?? [],
          heatmapSectors: parsed.heatmapSectors ?? [],
          companyDetails: parsed.companyDetails ?? {},
        }));
      }
    } catch {
      setState(emptyState);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const profiles = useMemo(
    () => Object.values(state.profiles).sort((a, b) => a.ticker.localeCompare(b.ticker)),
    [state.profiles]
  );
  const heatmapSectors = useMemo(
    () => [...(state.heatmapSectors ?? [])].sort((a, b) => a.order - b.order),
    [state.heatmapSectors]
  );
  const heatmapProfiles = profiles.filter((profile) => profile.heatmapSectorId);

  const selected = selectedTicker ? state.profiles[selectedTicker] : profiles[0];
  const activeTicker = selected?.ticker ?? "";
  const thesisHistory = state.theses
    .filter((item) => item.ticker === activeTicker)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  const dailyHistory = state.dailyChecks
    .filter((item) => item.ticker === activeTicker)
    .sort((a, b) => b.checkDate.localeCompare(a.checkDate));
  const noteHistory = state.aiNotes
    .filter((item) => item.ticker === activeTicker)
    .sort((a, b) => b.noteDate.localeCompare(a.noteDate));
  const latestThesis = latestByDate(thesisHistory);
  const latestDaily = latestByDate(dailyHistory);

  useEffect(() => {
    if (!selectedTicker && profiles[0]) setSelectedTicker(profiles[0].ticker);
  }, [profiles, selectedTicker]);

  const addHeatmapSector = () => {
    const name = newSectorName.trim();
    if (!name) {
      setMessage("추가할 섹터 이름을 입력해 주세요.");
      return;
    }

    if (heatmapSectors.some((sector) => sector.name.toLowerCase() === name.toLowerCase())) {
      setMessage("이미 같은 이름의 섹터가 있어요.");
      return;
    }

    const newSector = {
      id: uid("sector"),
      name,
      color: SECTOR_COLORS[heatmapSectors.length % SECTOR_COLORS.length],
      order: heatmapSectors.length,
    };
    setState((current) => {
      const sectors = current.heatmapSectors ?? [];
      const next = {
        ...current,
        heatmapSectors: [...sectors, newSector],
      };
      persistState(next);
      return next;
    });
    setNewSectorName("");
    setNewStockSectorId(newSector.id);
    setMessage(`${name} 섹터를 히트맵에 추가했어요.`);
  };

  const removeHeatmapSector = (sectorId: string) => {
    const sector = heatmapSectors.find((item) => item.id === sectorId);
    if (!sector) return;
    if (!window.confirm(`${sector.name} 섹터를 히트맵에서 숨길까요? 종목 상세 데이터는 삭제되지 않습니다.`)) return;

    setState((current) => {
      const profilesNext = Object.fromEntries(
        Object.entries(current.profiles).map(([ticker, profile]) => [
          ticker,
          profile.heatmapSectorId === sectorId ? { ...profile, heatmapSectorId: undefined } : profile,
        ])
      );
      const next = {
        ...current,
        profiles: profilesNext,
        heatmapSectors: (current.heatmapSectors ?? []).filter((item) => item.id !== sectorId),
      };
      persistState(next);
      return next;
    });
    setMessage(`${sector.name} 섹터를 히트맵에서 숨겼어요.`);
  };

  const addHeatmapStock = () => {
    const ticker = asTicker(newStockTicker);
    const sector = heatmapSectors.find((item) => item.id === newStockSectorId);
    if (!ticker || !sector) {
      setMessage("티커와 섹터를 모두 입력해 주세요.");
      return;
    }

    const weight = Number(newStockWeight);
    setState((current) => {
      const previous = current.profiles[ticker];
      const next = {
        ...current,
        profiles: {
          ...current.profiles,
          [ticker]: {
            ticker,
            companyName: newStockName.trim() || previous?.companyName || ticker,
            sector: sector.name,
            aiValueChain: previous?.aiValueChain?.length ? previous.aiValueChain : [sector.name],
            oneLineThesis: previous?.oneLineThesis,
            businessModel: previous?.businessModel,
            status: previous?.status || "관심종목",
            heatmapSectorId: sector.id,
            heatmapWeight: Number.isFinite(weight) && weight > 0 ? weight : previous?.heatmapWeight ?? 1,
            updatedAt: today(),
          },
        },
        companyDetails: {
          ...(current.companyDetails ?? {}),
          [ticker]: current.companyDetails?.[ticker] ?? {},
        },
      };
      persistState(next);
      return next;
    });
    setSelectedTicker(ticker);
    setNewStockTicker("");
    setNewStockName("");
    setNewStockWeight("1");
    setMessage(`${ticker}를 ${sector.name} 섹터에 추가했어요.`);
  };

  const importHeatmapJson = () => {
    try {
      const parsed = JSON.parse(extractAnyJson(heatmapJson)) as unknown;
      const root = Array.isArray(parsed) ? { sectors: parsed } : parsed;

      if (!root || typeof root !== "object") {
        throw new Error("JSON 최상위 값은 객체이거나 섹터 배열이어야 해요.");
      }

      const record = root as Record<string, unknown>;
      const rawSectors = Array.isArray(record.sectors)
        ? record.sectors
        : Array.isArray(record.heatmapSectors)
          ? record.heatmapSectors
          : [];
      const rawFlatStocks = Array.isArray(record.stocks) ? record.stocks : [];

      if (rawSectors.length === 0 && rawFlatStocks.length === 0) {
        throw new Error("sectors 또는 stocks 배열이 필요해요.");
      }

      let importedSectorCount = 0;
      let importedStockCount = 0;

      setState((current) => {
        const sectorsNext = [...(current.heatmapSectors ?? [])];
        const profilesNext = { ...current.profiles };
        const detailsNext = { ...(current.companyDetails ?? {}) };

        const ensureSector = (nameValue: unknown) => {
          const name = String(nameValue ?? "미분류").trim() || "미분류";
          const existing = sectorsNext.find((sector) => sector.name.toLowerCase() === name.toLowerCase());
          if (existing) return existing;

          const sector = {
            id: uid("sector"),
            name,
            color: SECTOR_COLORS[sectorsNext.length % SECTOR_COLORS.length],
            order: sectorsNext.length,
          };
          sectorsNext.push(sector);
          importedSectorCount += 1;
          return sector;
        };

        const upsertStock = (stockValue: unknown, fallbackSectorName?: string) => {
          if (!stockValue || typeof stockValue !== "object") return;
          const stock = stockValue as Record<string, unknown>;
          const ticker = asTicker(stock.ticker ?? stock.symbol);
          if (!ticker) return;

          const sector = ensureSector(stock.sector ?? stock.sectorName ?? stock.layer ?? fallbackSectorName);
          const previous = profilesNext[ticker];
          const weight = Number(stock.weight ?? stock.heatmapWeight ?? stock.interestWeight);

          profilesNext[ticker] = {
            ...previous,
            ticker,
            companyName: String(stock.companyName ?? stock.company ?? stock.name ?? previous?.companyName ?? ticker),
            sector: sector.name,
            aiValueChain: previous?.aiValueChain?.length ? previous.aiValueChain : [sector.name],
            oneLineThesis: String(stock.oneLineThesis ?? stock.thesis ?? previous?.oneLineThesis ?? ""),
            businessModel: previous?.businessModel,
            status: String(stock.status ?? previous?.status ?? "관심종목"),
            heatmapSectorId: sector.id,
            heatmapWeight: Number.isFinite(weight) && weight > 0 ? weight : previous?.heatmapWeight ?? 1,
            updatedAt: today(),
          };
          detailsNext[ticker] = detailsNext[ticker] ?? {};
          importedStockCount += 1;
        };

        rawSectors.forEach((sectorValue) => {
          if (!sectorValue || typeof sectorValue !== "object") {
            ensureSector(sectorValue);
            return;
          }
          const sectorRecord = sectorValue as Record<string, unknown>;
          const sector = ensureSector(sectorRecord.name ?? sectorRecord.sector ?? sectorRecord.label);
          const stocks = Array.isArray(sectorRecord.stocks)
            ? sectorRecord.stocks
            : Array.isArray(sectorRecord.tickers)
              ? sectorRecord.tickers.map((ticker) => ({ ticker }))
              : [];
          stocks.forEach((stock) => upsertStock(stock, sector.name));
        });

        rawFlatStocks.forEach((stock) => upsertStock(stock));

        const next = {
          ...current,
          heatmapSectors: sectorsNext,
          profiles: profilesNext,
          companyDetails: detailsNext,
        };
        persistState(next);
        return next;
      });

      setHeatmapJson("");
      setMessage(`JSON으로 섹터 ${importedSectorCount}개, 종목 ${importedStockCount}개를 히트맵에 반영했어요.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "히트맵 JSON을 읽지 못했어요.");
    }
  };

  const removeHeatmapStock = (ticker: string) => {
    if (!window.confirm(`${ticker}를 완전히 삭제할까요? 종목 상세 리서치와 시장 데이터도 함께 삭제됩니다.`)) return;
    setState((current) => {
      const profilesNext = { ...current.profiles };
      const detailsNext = { ...(current.companyDetails ?? {}) };
      delete profilesNext[ticker];
      delete detailsNext[ticker];
      const next = {
        ...current,
        profiles: profilesNext,
        theses: current.theses.filter((item) => item.ticker !== ticker),
        dailyChecks: current.dailyChecks.filter((item) => item.ticker !== ticker),
        aiNotes: current.aiNotes.filter((item) => item.ticker !== ticker),
        companyDetails: detailsNext,
      };
      persistState(next);
      return next;
    });
    setMessage(`${ticker}를 삭제했어요.`);
  };

  const changeHeatmapSector = (ticker: string, sectorId: string) => {
    const sector = heatmapSectors.find((item) => item.id === sectorId);
    if (!sector) return;
    setState((current) => {
      const previous = current.profiles[ticker];
      if (!previous) return current;
      const next = {
        ...current,
        profiles: {
          ...current.profiles,
          [ticker]: {
            ...previous,
            sector: sector.name,
            heatmapSectorId: sector.id,
            updatedAt: today(),
          },
        },
      };
      persistState(next);
      return next;
    });
  };

  const updateHeatmapWeight = (ticker: string, weight: number) => {
    setState((current) => {
      const previous = current.profiles[ticker];
      if (!previous) return current;
      const next = {
        ...current,
        profiles: {
          ...current.profiles,
          [ticker]: {
            ...previous,
            heatmapWeight: Number.isFinite(weight) && weight > 0 ? weight : 1,
            updatedAt: today(),
          },
        },
      };
      persistState(next);
      return next;
    });
  };

  const metricFor = (profile: StockProfile) => {
    const snapshot = state.companyDetails?.[profile.ticker]?.marketData?.marketSnapshot;
    if (colorMode === "dayChangePercent") return snapshot?.dayChangePercent ?? null;
    if (colorMode === "return1y") return snapshot?.return1y ?? null;
    if (colorMode === "distanceFromHigh52w") return snapshot?.distanceFromHigh52w ?? null;
    return snapshot?.return3m ?? null;
  };

  const marketCapFor = (profile: StockProfile) => {
    return state.companyDetails?.[profile.ticker]?.marketData?.marketSnapshot?.marketCap ?? null;
  };

  const treemapSizeFor = (profile: StockProfile) => {
    const marketCap = marketCapFor(profile);
    if (sizeMode === "marketCap" && marketCap && marketCap > 0) return marketCap;
    return Math.max(1, profile.heatmapWeight ?? 1) * 1_000_000_000;
  };

  const basisFor = (profile: StockProfile) => {
    const snapshot = state.companyDetails?.[profile.ticker]?.marketData?.marketSnapshot;
    if (sizeMode === "marketCap") {
      const cap = snapshot?.marketCap;
      if (!cap || cap <= 0) return 150;
      return Math.max(130, Math.min(340, Math.log10(cap) * 24));
    }
    return Math.max(130, Math.min(280, (profile.heatmapWeight ?? 1) * 46));
  };

  const syncHeatmapMarketData = async () => {
    const tickers = [...new Set(heatmapProfiles.map((profile) => profile.ticker))];
    if (tickers.length === 0) {
      setMessage("시장 데이터를 동기화할 히트맵 종목이 없습니다.");
      return;
    }

    setHeatmapLoading(true);
    setMessage(`시장 데이터 동기화 중... (${tickers.length}개)`);

    try {
      const settled = await Promise.allSettled(
        tickers.map(async (ticker) => {
          const response = await fetch(`/api/market/${ticker}`);
          if (!response.ok) throw new Error(`${ticker} 시장 데이터 요청 실패`);
          return response.json();
        })
      );
      const results = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      const failures = settled
        .map((result, index) => result.status === "rejected" ? tickers[index] : "")
        .filter(Boolean);

      if (results.length === 0) {
        throw new Error("동기화에 성공한 종목이 없습니다.");
      }

      setState((current) => {
        const detailsNext = { ...(current.companyDetails ?? {}) };
        const profilesNext = { ...current.profiles };

        for (const data of results) {
          const ticker = asTicker(data.ticker);
          if (!ticker) continue;
          detailsNext[ticker] = {
            ...(detailsNext[ticker] ?? {}),
            valuation: {
              ...(detailsNext[ticker]?.valuation ?? {}),
              ...(data.valuation ?? {}),
            },
            marketData: data,
          };
          if (profilesNext[ticker]) {
            profilesNext[ticker] = {
              ...profilesNext[ticker],
              companyName: data.companyName || profilesNext[ticker].companyName,
              updatedAt: today(),
            };
          }
        }

        const next = {
          ...current,
          profiles: profilesNext,
          companyDetails: detailsNext,
        };
        persistState(next);
        return next;
      });

      setMessage(
        failures.length
          ? `오늘 변동률과 시가총액을 ${results.length}개 종목에 반영했어요. 실패: ${failures.join(", ")}`
          : `오늘 변동률과 시가총액을 ${results.length}개 종목에 반영했어요.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "시장 데이터 동기화에 실패했어요.");
    } finally {
      setHeatmapLoading(false);
    }
  };

  const saveParsedReport = () => {
    try {
      const report = parseReport(paste);

      if (report.type !== "thesis") {
        setMessage("메인에서는 최초 분석용 thesis REPORT_JSON만 저장합니다. 이후 분석은 종목 페이지에서 추가해 주세요.");
        return;
      }

      setState((current) => {
        const previous = current.profiles[report.ticker];
        const matchingSector = (current.heatmapSectors ?? []).find((sector) => {
          const values = [report.sector, ...(report.aiValueChain ?? [])]
            .map((item) => String(item).trim().toLowerCase())
            .filter(Boolean);
          return values.some((value) => value.includes(sector.name.toLowerCase()) || sector.name.toLowerCase().includes(value));
        });
        const next = {
          ...current,
          profiles: {
            ...current.profiles,
            [report.ticker]: {
              ...previous,
              ticker: report.ticker,
              companyName: report.companyName || report.ticker,
              sector: report.sector || previous?.sector || "미분류",
              aiValueChain: report.aiValueChain?.length ? report.aiValueChain : previous?.aiValueChain ?? [],
              oneLineThesis: report.oneLineThesis || previous?.oneLineThesis,
              businessModel: report.businessModel || previous?.businessModel,
              status: report.action || previous?.status || "검토",
              heatmapSectorId: previous?.heatmapSectorId ?? matchingSector?.id,
              heatmapWeight: previous?.heatmapWeight ?? 1,
              updatedAt: report.reportDate,
            },
          },
          theses: [report, ...current.theses],
          companyDetails: {
            ...(current.companyDetails ?? {}),
            [report.ticker]: {
              ...(current.companyDetails?.[report.ticker] ?? {}),
            },
          },
        };
        persistState(next);
        return next;
      });

      setSelectedTicker(report.ticker);
      setPaste("");
      setMessage(`${report.ticker} 최초 Thesis를 저장하고 맵에 종목을 생성했어요.`);
    } catch (error) {
      setMessage(
        `${error instanceof Error ? error.message : "JSON을 읽지 못했어요."} 메인에서는 최초 분석용 REPORT_JSON만 저장합니다.`
      );
    }
  };

  const saveFreeformNote = () => {
    const body = paste.trim();
    if (!body) {
      setMessage("저장할 AI 조언이 비어 있어요.");
      return;
    }

    const ticker = activeTicker || asTicker(body.match(/\b[A-Z]{1,5}\b/)?.[0]);
    if (!ticker) {
      setMessage("메모를 붙일 종목을 먼저 선택하거나, Thesis를 먼저 저장해 주세요.");
      return;
    }

    const firstLine = body.split("\n").find((line) => line.trim())?.trim() ?? "AI 조언 메모";
    const note: AiNote = {
      id: uid("note"),
      ticker,
      noteDate: today(),
      title: firstLine.slice(0, 70),
      body,
    };

    setState((current) => {
      const previous = current.profiles[ticker];
      return {
        ...current,
        profiles: {
          ...current.profiles,
          [ticker]: previous ?? {
            ticker,
            companyName: ticker,
            sector: "미분류",
            aiValueChain: [],
            status: "메모",
            updatedAt: note.noteDate,
          },
        },
        aiNotes: [note, ...current.aiNotes],
      };
    });

    setSelectedTicker(ticker);
    setPaste("");
    setMessage(`${ticker}에 형식 없는 AI 조언 메모를 저장했어요.`);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ai-map-thesis-backup-${today()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportHtmlReport = () => {
    if (!selected || !latestThesis) return;

    const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${selected.ticker} report</title>
<style>
body{margin:0;background:#0b0d12;color:#e6e8ee;font-family:Arial,sans-serif;line-height:1.6}
main{max-width:920px;margin:0 auto;padding:32px 18px}
section{border:1px solid #1e293b;border-radius:8px;padding:18px;margin:14px 0;background:#111827}
h1,h2{margin:0 0 10px} .muted{color:#94a3b8}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.pill{display:inline-block;padding:4px 8px;border-radius:999px;background:#1e293b;margin:3px}
table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #1e293b;padding:8px;text-align:left}
</style>
</head>
<body><main>
<section>
<p class="muted">${latestThesis.reportDate}</p>
<h1>${selected.ticker} / ${selected.companyName}</h1>
<p>${selected.oneLineThesis || ""}</p>
${selected.aiValueChain.map((item) => `<span class="pill">${item}</span>`).join("")}
</section>
<section class="grid">
<div>종목 매력<br><strong>${score(latestThesis.scores?.stock)}</strong></div>
<div>실적 가시성<br><strong>${score(latestThesis.scores?.entry)}</strong></div>
<div>성장성<br><strong>${score(latestThesis.scores?.attack)}</strong></div>
<div>현재 판단<br><strong>${latestThesis.action || "-"}</strong></div>
</section>
<section><h2>사업모델</h2><p>${latestThesis.businessModel || ""}</p></section>
<section><h2>투자포인트</h2><ul>${(latestThesis.investmentPoints ?? []).map((item) => `<li>${item}</li>`).join("")}</ul></section>
<section><h2>리스크</h2><table><tbody>${(latestThesis.risks ?? []).map((risk) => `<tr><td>${risk.name}</td><td>${risk.level || ""}</td><td>${risk.response || ""}</td></tr>`).join("")}</tbody></table></section>
<section><h2>최종 판단</h2><p>${latestThesis.finalView || ""}</p></section>
</main></body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selected.ticker}_report_${latestThesis.reportDate}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    if (!window.confirm("저장된 Thesis와 리서치 메모를 모두 비울까요?")) return;
    persistState(emptyState);
    setState(emptyState);
    setSelectedTicker("");
  };

  const copyMainPrompt = async () => {
    await navigator.clipboard.writeText(thesisPrompt);
    setPromptCopied(true);
    window.setTimeout(() => setPromptCopied(false), 1200);
  };

  const copyHeatmapPrompt = async () => {
    await navigator.clipboard.writeText(heatmapPrompt);
    setHeatmapPromptCopied(true);
    window.setTimeout(() => setHeatmapPromptCopied(false), 1200);
  };

  const heatmapSectorNodes = heatmapSectors.map((sector) => {
    const items = profiles.filter((profile) => profile.heatmapSectorId === sector.id);
    const value = items.reduce((sum, profile) => sum + treemapSizeFor(profile), 0);
    return { sector, items, value: value || 1 };
  });
  const heatmapSectorRects = treemapLayout(heatmapSectorNodes, (node) => node.value);
  const marketCapCount = heatmapProfiles.filter((profile) => {
    const value = marketCapFor(profile);
    return value !== null && value !== undefined && value > 0;
  }).length;
  const metricCount = heatmapProfiles.filter((profile) => {
    const value = metricFor(profile);
    return value !== null && value !== undefined && !Number.isNaN(Number(value));
  }).length;

  return (
    <div className="min-h-screen bg-[#0b0d12] text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">AI Map Thesis OS</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">AI 밸류체인 투자 판단 보드</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              메인에서는 최초 분석만 저장해 종목을 만들고, 이후 리서치는 각 종목 페이지에 누적합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportData}>JSON 백업</Button>
            <Button onClick={exportHtmlReport} tone="emerald">선택 리포트 HTML</Button>
            <Button onClick={resetAll} tone="rose">초기화</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">
        <section className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="내 섹터" value={heatmapSectors.length} />
            <Metric label="히트맵 종목" value={heatmapProfiles.length} />
            <Metric label="전체 저장 종목" value={profiles.length} />
          </div>

          <section className="rounded-lg border border-slate-800 bg-slate-900/45 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold">나만의 AI 인프라 스탁 히트맵</h2>
                <p className="mt-1 max-w-3xl text-sm text-slate-400">
                  내가 만든 섹터와 관심종목만 보여주고, 시가총액은 면적, 오늘 변동률은 색상으로 표현합니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={syncHeatmapMarketData} tone="emerald">
                  {heatmapLoading ? "동기화 중..." : "오늘 데이터 동기화"}
                </Button>
                <select
                  value={sizeMode}
                  onChange={(event) => {
                    const nextMode = event.target.value as typeof sizeMode;
                    setSizeMode(nextMode);
                    if (nextMode === "marketCap" && heatmapProfiles.length > 0 && marketCapCount < heatmapProfiles.length && !heatmapLoading) {
                      void syncHeatmapMarketData();
                    }
                  }}
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  <option value="marketCap">크기: 시가총액</option>
                  <option value="interest">크기: 관심도</option>
                </select>
                <select
                  value={colorMode}
                  onChange={(event) => setColorMode(event.target.value as typeof colorMode)}
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  <option value="dayChangePercent">색상: 오늘 변동률</option>
                  <option value="return3m">색상: 3개월 수익률</option>
                  <option value="return1y">색상: 1년 수익률</option>
                  <option value="distanceFromHigh52w">색상: 52주 고점 대비</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.6fr]">
              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <h3 className="font-semibold">섹터 만들기</h3>
                <div className="mt-3 flex gap-2">
                  <input
                    value={newSectorName}
                    onChange={(event) => setNewSectorName(event.target.value)}
                    placeholder="예: AI 전력/냉각"
                    className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                  <Button onClick={addHeatmapSector} tone="emerald">추가</Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {heatmapSectors.length === 0 ? (
                    <p className="text-sm text-slate-600">아직 만든 섹터가 없습니다.</p>
                  ) : (
                    heatmapSectors.map((sector) => (
                      <span key={sector.id} className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: sector.color }} />
                        {sector.name}
                        <button
                          type="button"
                          onClick={() => removeHeatmapSector(sector.id)}
                          className="text-slate-500 hover:text-rose-300"
                          aria-label={`${sector.name} 섹터 숨기기`}
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <h3 className="font-semibold">관심종목 추가</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-[0.8fr_1.2fr_1.2fr_0.7fr_auto]">
                  <input
                    value={newStockTicker}
                    onChange={(event) => setNewStockTicker(event.target.value.toUpperCase())}
                    placeholder="티커"
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                  <input
                    value={newStockName}
                    onChange={(event) => setNewStockName(event.target.value)}
                    placeholder="회사명 선택"
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                  <select
                    value={newStockSectorId}
                    onChange={(event) => setNewStockSectorId(event.target.value)}
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="">섹터 선택</option>
                    {heatmapSectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>{sector.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={newStockWeight}
                    onChange={(event) => setNewStockWeight(event.target.value)}
                    placeholder="관심도"
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                  <Button onClick={addHeatmapStock} tone="emerald">추가</Button>
                </div>
                <p className="mt-2 text-xs text-slate-500">관심도는 시가총액 데이터가 없을 때 타일 크기를 정하는 수동 가중치입니다.</p>
              </div>
            </div>

            <details className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <summary className="cursor-pointer font-semibold">AI JSON으로 섹터/종목 한 번에 추가</summary>
              <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <textarea
                    value={heatmapJson}
                    onChange={(event) => setHeatmapJson(event.target.value)}
                    placeholder="AI가 준 HEATMAP_JSON 블록을 여기에 붙여넣으세요."
                    className="h-56 w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button onClick={importHeatmapJson} tone="emerald">JSON 반영</Button>
                    <Button onClick={() => setHeatmapJson("")}>비우기</Button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    이미 있는 섹터와 티커는 새로 만들지 않고 업데이트합니다. 종목 상세 페이지에 쌓인 리서치 데이터는 유지됩니다.
                  </p>
                </div>
                <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-950">
                  <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                    <span className="text-xs text-slate-500">히트맵 JSON 요청 프롬프트</span>
                    <button
                      type="button"
                      onClick={copyHeatmapPrompt}
                      className="relative h-7 w-7 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800"
                      title="프롬프트 복사"
                      aria-label="히트맵 프롬프트 복사"
                    >
                      <span className="absolute left-[9px] top-[7px] h-3 w-3 rounded-sm border border-slate-300" />
                      <span className="absolute left-[6px] top-[10px] h-3 w-3 rounded-sm border border-slate-500 bg-slate-900" />
                    </button>
                  </div>
                  <pre className="max-h-56 overflow-auto p-4 text-xs leading-relaxed text-slate-300">
                    {heatmapPrompt}
                  </pre>
                  {heatmapPromptCopied && <p className="border-t border-slate-800 px-3 py-2 text-xs text-emerald-300">복사됨</p>}
                </div>
              </div>
            </details>
            {message && <p className="mt-3 text-sm text-slate-400">{message}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="rounded border border-slate-800 bg-slate-950 px-2 py-1">
                시가총액 데이터 {marketCapCount}/{heatmapProfiles.length}
              </span>
              <span className="rounded border border-slate-800 bg-slate-950 px-2 py-1">
                색상 데이터 {metricCount}/{heatmapProfiles.length}
              </span>
              {sizeMode === "marketCap" && marketCapCount === 0 && heatmapProfiles.length > 0 && (
                <span className="rounded border border-amber-800 bg-amber-950/30 px-2 py-1 text-amber-300">
                  아직 시가총액이 없어 관심도 기준처럼 보입니다. 오늘 데이터 동기화를 눌러주세요.
                </span>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-slate-800 bg-black/30 p-3">
              {heatmapSectors.length === 0 ? (
                <div className="flex min-h-72 items-center justify-center rounded-md border border-dashed border-slate-700 text-sm text-slate-500">
                  섹터를 추가하면 나만의 AI 인프라 히트맵이 시작됩니다.
                </div>
              ) : (
                <>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="rounded border border-slate-700 bg-black/70 px-2 py-1">AI 인프라 커스텀 인덱스</span>
                    <span className="rounded border border-slate-700 bg-black/70 px-2 py-1">면적: {sizeMode === "marketCap" ? "시가총액" : "관심도"}</span>
                    <span className="rounded border border-slate-700 bg-black/70 px-2 py-1">색상: {colorMode === "dayChangePercent" ? "오늘 변동률" : colorMode === "return3m" ? "3개월 수익률" : colorMode === "return1y" ? "1년 수익률" : "52주 고점 대비"}</span>
                    <span className="rounded border border-slate-700 bg-black/70 px-2 py-1">시총 {marketCapCount}/{heatmapProfiles.length}</span>
                  </div>
                  <div className="relative h-[720px] overflow-hidden rounded-md border border-slate-800 bg-black">
                  {heatmapSectorRects.map(({ item: node, x, y, w, h }) => {
                    const stockRects = treemapLayout(node.items, treemapSizeFor);
                    const sectorTooSmall = w < 18 || h < 16;

                    return (
                      <div
                        key={node.sector.id}
                        className="absolute overflow-hidden border border-black/80 bg-zinc-950"
                        style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
                      >
                        <div className="absolute left-0 top-0 z-10 flex h-7 w-full items-center justify-between bg-black/70 px-2 text-xs font-semibold text-slate-300">
                          <span className="truncate">{node.sector.name} ›</span>
                          {!sectorTooSmall && <span className="text-slate-500">{node.items.length}</span>}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 top-7">
                          {node.items.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-xs text-slate-600">비어 있음</div>
                          ) : (
                            stockRects.map(({ item: profile, x: sx, y: sy, w: sw, h: sh }) => {
                              const metric = metricFor(profile);
                              const area = sw * sh;
                              const tiny = sw < 8 || sh < 10 || area < 120;
                              const singleLine = sh < 24 || area < 420;
                              const large = sw >= 18 && sh >= 32 && area >= 650;
                              const oneLineSize = Math.max(9, Math.min(17, Math.min(sw, sh) * 0.78));
                              const tickerSize = large ? Math.max(16, Math.min(24, Math.min(sw, sh) * 0.82)) : Math.max(12, Math.min(18, Math.min(sw, sh) * 0.62));
                              const percentSize = large ? Math.max(12, Math.min(18, Math.min(sw, sh) * 0.62)) : Math.max(10, Math.min(14, Math.min(sw, sh) * 0.48));

                              return (
                                <div
                                  key={`${node.sector.id}-${profile.ticker}`}
                                  className="absolute overflow-hidden border border-black/80 transition-[filter] hover:z-20 hover:brightness-125"
                                  style={{
                                    left: `${sx}%`,
                                    top: `${sy}%`,
                                    width: `${sw}%`,
                                    height: `${sh}%`,
                                    backgroundColor: heatColor(metric),
                                  }}
                                  title={`${profile.ticker} ${percent(metric)} / ${profile.companyName}`}
                                >
                                  <Link href={`/company/${profile.ticker}`} className="flex h-full items-center justify-center overflow-hidden px-1 text-center font-mono font-bold leading-[0.9] text-white">
                                    {tiny ? (
                                      <span className="truncate text-[9px]">{profile.ticker}</span>
                                    ) : singleLine ? (
                                      <span
                                        className="max-w-full truncate whitespace-nowrap"
                                        style={{ fontSize: `${oneLineSize}px` }}
                                      >
                                        {sh < 16 ? profile.ticker : `${profile.ticker} ${percent(metric)}`}
                                      </span>
                                    ) : (
                                      <span className="flex min-w-0 flex-col items-center justify-center gap-0.5">
                                        <span
                                          className="max-w-full truncate whitespace-nowrap"
                                          style={{ fontSize: `${tickerSize}px` }}
                                        >
                                          {profile.ticker}
                                        </span>
                                        <span
                                          className="max-w-full truncate whitespace-nowrap"
                                          style={{ fontSize: `${percentSize}px` }}
                                        >
                                          {percent(metric)}
                                        </span>
                                      </span>
                                    )}
                                  </Link>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </>
              )}
            </div>

            <details className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <summary className="cursor-pointer font-semibold">히트맵 종목 관리</summary>
              <div className="mt-3 max-h-80 overflow-auto rounded-md border border-slate-800">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead className="sticky top-0 bg-slate-950 text-xs text-slate-500">
                    <tr>
                      <th className="border-b border-slate-800 px-3 py-2 text-left">티커</th>
                      <th className="border-b border-slate-800 px-3 py-2 text-left">회사</th>
                      <th className="border-b border-slate-800 px-3 py-2 text-left">섹터</th>
                      <th className="border-b border-slate-800 px-3 py-2 text-left">관심도</th>
                      <th className="border-b border-slate-800 px-3 py-2 text-left">시가총액</th>
                      <th className="border-b border-slate-800 px-3 py-2 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapProfiles
                      .sort((a, b) => a.ticker.localeCompare(b.ticker))
                      .map((profile) => {
                        const snapshot = state.companyDetails?.[profile.ticker]?.marketData?.marketSnapshot;
                        return (
                          <tr key={`manage-${profile.ticker}`} className="border-b border-slate-900 text-slate-300">
                            <td className="px-3 py-2 font-mono font-bold text-white">{profile.ticker}</td>
                            <td className="px-3 py-2">{profile.companyName}</td>
                            <td className="px-3 py-2">
                              <select
                                value={profile.heatmapSectorId ?? ""}
                                onChange={(event) => changeHeatmapSector(profile.ticker, event.target.value)}
                                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none"
                              >
                                {heatmapSectors.map((sector) => (
                                  <option key={sector.id} value={sector.id}>{sector.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="1"
                                value={profile.heatmapWeight ?? 1}
                                onChange={(event) => updateHeatmapWeight(profile.ticker, Number(event.target.value))}
                                className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-400">{compactMoney(snapshot?.marketCap)}</td>
                            <td className="px-3 py-2 text-right">
                              <Button onClick={() => removeHeatmapStock(profile.ticker)} tone="rose">삭제</Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                히트맵 타일 위에는 버튼을 올리지 않고, 삭제와 관심도 수정은 여기에서 관리합니다. 삭제는 종목 상세 리서치와 시장 데이터까지 함께 지웁니다.
              </p>
            </details>
          </section>

          <details className="rounded-lg border border-slate-800 bg-slate-900/45 p-4">
            <summary className="cursor-pointer text-lg font-semibold">도구함: 최초분석 붙여넣기 / 사용방법 / 프롬프트</summary>
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <h2 className="text-lg font-semibold">최초 분석 붙여넣기</h2>
              <p className="mt-1 text-sm text-slate-400">
                메인에서는 회사 정체성과 투자 가설만 가볍게 저장합니다. 섹터 배치는 위 히트맵에서 직접 정합니다.
              </p>
              <textarea
                value={paste}
                onChange={(event) => setPaste(event.target.value)}
                placeholder="여기에 최초 등록용 thesis REPORT_JSON 답변 전체를 붙여넣으세요."
                className="mt-4 h-56 w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button onClick={saveParsedReport} tone="emerald">최초 분석 저장</Button>
                <Button onClick={() => setPaste("")}>비우기</Button>
                {message && <span className="text-sm text-slate-400">{message}</span>}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <div>
                <h2 className="text-lg font-semibold">사용방법</h2>
                <p className="mt-1 text-sm text-slate-400">히트맵은 수동 큐레이션이 기준이고, 분석 기록은 종목 상세 페이지에 쌓입니다.</p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <GuideStep title="1. 섹터 만들기" body="GPU, 전력/냉각처럼 직접 보고 싶은 AI 인프라 섹터를 만듭니다." />
                <GuideStep title="2. 관심종목 추가" body="내가 고른 종목만 섹터에 넣습니다. 자동 분류 종목은 메인에 보이지 않습니다." />
                <GuideStep title="3. 종목별 누적" body="종목을 클릭해 상세 페이지에서 가치투자 리서치와 시장 데이터를 쌓습니다." />
              </div>

              <div className="mt-4 overflow-hidden rounded-md border border-slate-800 bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                  <span className="text-xs text-slate-500">최초 분석 프롬프트</span>
                  <button
                    type="button"
                    onClick={copyMainPrompt}
                    className="relative h-7 w-7 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800"
                    title="프롬프트 복사"
                    aria-label="프롬프트 복사"
                  >
                    <span className="absolute left-[9px] top-[7px] h-3 w-3 rounded-sm border border-slate-300" />
                    <span className="absolute left-[6px] top-[10px] h-3 w-3 rounded-sm border border-slate-500 bg-slate-900" />
                  </button>
                </div>
                <pre className="max-h-80 overflow-auto p-4 text-xs leading-relaxed text-slate-300">
                  {thesisPrompt}
                </pre>
              </div>
              {promptCopied && <p className="mt-2 text-xs text-emerald-300">복사됨</p>}
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/45 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-emerald-300">{score(value)}</p>
      <p className="text-[11px] text-slate-600">/ 10</p>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-slate-900 px-2 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono text-slate-200">{price(value)}</span>
    </div>
  );
}

function GuideStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{body}</p>
    </div>
  );
}

function HistoryPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function TimelineItem({
  date,
  title,
  children,
}: {
  date: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-l border-slate-700 pl-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{title}</p>
        <p className="font-mono text-xs text-slate-500">{date}</p>
      </div>
      <div className="mt-1 text-sm text-slate-400">{children}</div>
    </div>
  );
}
