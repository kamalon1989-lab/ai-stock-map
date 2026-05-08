"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  updatedAt: string;
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
  companyDetails?: Record<string, {
    valueChainPosition?: ValueChainPosition;
    valuation?: Valuation;
    quarterlyData?: QuarterlyDatum[];
    catalysts?: Catalyst[];
    risks?: Risk[];
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

function score(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(1);
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AppState;
        setState({
          profiles: parsed.profiles ?? {},
          theses: parsed.theses ?? [],
          dailyChecks: parsed.dailyChecks ?? [],
          aiNotes: parsed.aiNotes ?? [],
          companyDetails: parsed.companyDetails ?? {},
        });
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

  const saveParsedReport = () => {
    try {
      const report = parseReport(paste);

      if (report.type !== "thesis") {
        setMessage("메인에서는 최초 분석용 thesis REPORT_JSON만 저장합니다. 이후 분석은 종목 페이지에서 추가해 주세요.");
        return;
      }

      setState((current) => {
        const next = {
          ...current,
          profiles: {
            ...current.profiles,
            [report.ticker]: {
              ticker: report.ticker,
              companyName: report.companyName || report.ticker,
              sector: report.sector || "미분류",
              aiValueChain: report.aiValueChain ?? [],
              oneLineThesis: report.oneLineThesis,
              businessModel: report.businessModel,
              status: report.action || "검토",
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
            <Metric label="등록 종목" value={profiles.length} />
            <Metric label="최초 분석" value={state.theses.length} />
            <Metric label="추가 리서치" value={state.dailyChecks.length + state.aiNotes.length} />
          </div>

          <section className="rounded-lg border border-slate-800 bg-slate-900/45 p-4">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">AI 밸류체인 맵</h2>
                <p className="mt-1 text-sm text-slate-400">종목은 AI가 준 `aiValueChain` 값에 따라 자동 배치됩니다.</p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {VALUE_CHAIN.map((chain) => {
                const items = profiles.filter((profile) => getPrimaryChain(profile).id === chain.id);

                return (
                  <div key={chain.id} className="rounded-lg border border-slate-800 bg-slate-950/45 p-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${chain.accent}`} />
                      <h3 className="font-semibold">{chain.label}</h3>
                      <span className="ml-auto text-xs text-slate-500">{items.length}</span>
                    </div>
                    <div className="mt-3 flex min-h-16 flex-wrap content-start gap-2">
                      {items.length === 0 ? (
                        <p className="text-sm text-slate-600">아직 연결된 종목이 없습니다.</p>
                      ) : (
                        items.map((profile) => (
                          <Link
                            key={`${chain.id}-${profile.ticker}`}
                            href={`/company/${profile.ticker}`}
                            className={`rounded-md border px-2.5 py-2 text-left transition-colors ${
                              activeTicker === profile.ticker
                                ? "border-emerald-400 bg-emerald-950/40"
                                : "border-slate-700 bg-slate-900 hover:border-slate-500"
                            }`}
                          >
                            <span className="block font-mono text-sm text-emerald-300">{profile.ticker}</span>
                            <span className="block max-w-32 truncate text-xs text-slate-400">{profile.status || "검토"}</span>
                            {(profile.aiValueChain ?? []).length > 1 && (
                              <span className="mt-1 block text-[10px] text-slate-500">
                                +{profile.aiValueChain.length - 1} 연결
                              </span>
                            )}
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900/45 p-4">
            <h2 className="text-lg font-semibold">최초 분석 붙여넣기</h2>
            <p className="mt-1 text-sm text-slate-400">
              메인에서는 회사 정체성과 투자 가설만 가볍게 저장합니다. 밸류에이션, 실적, Catalyst, 리스크는 종목 페이지에서 채워갑니다.
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
            <p className="mt-3 text-xs text-slate-500">
              이후 밸류체인 포지션, 목표주가, 분기 실적, 향후 이벤트, 리스크는 생성된 종목을 클릭해 상세 페이지에서 추가합니다.
            </p>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900/45 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">사용방법</h2>
                <p className="mt-1 text-sm text-slate-400">다른 사용자가 와도 헷갈리지 않게, 작업 흐름을 화면 안에 고정했습니다.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <GuideStep title="1. 최초 분석" body="회사 정체성과 투자 가설만 간단히 저장해 종목을 만듭니다." />
              <GuideStep title="2. 맵 생성" body="저장된 종목은 AI 밸류체인 맵에 자동 배치됩니다." />
              <GuideStep title="3. 종목별 누적" body="이후 세부 리서치는 종목 페이지에서 항목별로 채워갑니다." />
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
          </section>
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
