"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ScenarioAction = "sell" | "hold" | "buy_more";

type Risk = {
  id?: string;
  name?: string;
  text?: string;
  level?: string;
  response?: string;
  triggerCondition?: string;
  scenarios?: {
    bear?: { price?: number | null; action?: ScenarioAction; memo?: string };
    base?: { price?: number | null; action?: ScenarioAction; memo?: string };
    bull?: { price?: number | null; action?: ScenarioAction; memo?: string };
  };
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
  scores?: { stock?: number | null; entry?: number | null; attack?: number | null };
  businessModel?: string;
  investmentPoints?: string[];
  recentNews?: string[];
  earningsAndGuidance?: string;
  outlook?: string;
  valuation?: Valuation;
  risks?: Risk[];
  finalView?: string;
  rawText?: string;
};

type AiNote = {
  id: string;
  ticker: string;
  noteDate: string;
  title: string;
  body: string;
  updateType?: string;
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

type ValueChainPosition = {
  layer: string;
  aiRevenueShare: number | null;
  aiRevenueTrend: "expanding" | "stable" | "shrinking";
  exposureType: "direct" | "indirect" | "infrastructure";
  replaceability: string;
  competitors: string[];
};

type CompanyDetail = {
  valueChainPosition?: ValueChainPosition;
  valuation?: Valuation;
  quarterlyData?: QuarterlyDatum[];
  catalysts?: Catalyst[];
  risks?: Risk[];
};

type AppState = {
  profiles: Record<string, StockProfile>;
  theses: ThesisSnapshot[];
  dailyChecks: Array<{ id: string; ticker: string; checkDate: string; action?: string; memo?: string }>;
  aiNotes: AiNote[];
  companyDetails?: Record<string, CompanyDetail>;
};

const STORAGE_KEY = "ai-map-thesis-os-v1";

const LAYERS = [
  { id: "GPU/ASIC", label: "GPU/ASIC", color: "bg-emerald-400", border: "border-emerald-500" },
  { id: "HBM/메모리", label: "HBM/메모리", color: "bg-sky-400", border: "border-sky-500" },
  { id: "광통신", label: "광통신", color: "bg-indigo-400", border: "border-indigo-500" },
  { id: "전력/냉각", label: "전력/냉각", color: "bg-amber-400", border: "border-amber-500" },
  { id: "클라우드", label: "클라우드", color: "bg-cyan-400", border: "border-cyan-500" },
  { id: "로봇/피지컬 AI", label: "로봇/피지컬 AI", color: "bg-rose-400", border: "border-rose-500" },
  { id: "보안/소프트웨어", label: "보안/소프트웨어", color: "bg-violet-400", border: "border-violet-500" },
  { id: "미분류", label: "미분류", color: "bg-slate-400", border: "border-slate-500" },
];

const emptyState: AppState = {
  profiles: {},
  theses: [],
  dailyChecks: [],
  aiNotes: [],
  companyDetails: {},
};

const prompts = {
  position: `이 종목의 AI 밸류체인 포지션만 분석해줘.

필요 항목:
- valueChainLayer: GPU/ASIC, HBM/메모리, 광통신, 전력/냉각, 클라우드, 로봇/피지컬 AI, 보안/소프트웨어, 미분류 중 하나
- AI 관련 매출 비중 추정
- AI 매출 추세
- 직접 수혜/간접 수혜/인프라 수혜
- 이 회사가 빠지면 누가 대체 가능한지
- 직접 경쟁자 2~3개

답변 마지막에는 아래 JSON만 별도 코드블록으로 줘.
\`\`\`json
{
  "layer": "광통신",
  "aiRevenueShare": 65,
  "aiRevenueTrend": "expanding",
  "exposureType": "direct",
  "replaceability": "대체 가능성 설명",
  "competitors": ["AVGO", "MRVL"]
}
\`\`\``,
  valuation: `이 종목의 현재 주가가 가치투자 관점에서 비싼지 싼지 분석해줘.

EPS, Forward EPS, PER, Forward PER, 적정 PER, Bear/Base/Bull 목표주가, 업사이드, 판단 근거를 정리해줘.
단기 매수가/손절가가 아니라 기업가치와 목표주가 관점으로 써줘.

답변 마지막에는 아래 JSON만 별도 코드블록으로 줘.
\`\`\`json
{
  "currentPrice": 75,
  "eps": 1.8,
  "forwardEps": 2.6,
  "per": 41.7,
  "forwardPer": 28.8,
  "fairPer": 32,
  "bearTarget": 68,
  "baseTarget": 83,
  "bullTarget": 100,
  "targetPrice": 83,
  "upside": "+10%",
  "view": "밸류에이션 판단"
}
\`\`\``,
  quarterly: `최근 실적 발표를 성장률 & CapEx 트래커에 넣기 좋게 정리해줘.

분기, 발표일, 데이터센터 매출, YoY, QoQ, 다음 분기 가이던스, 핵심 고객사 비중, 한줄 메모만 뽑아줘.

답변 마지막에는 아래 JSON만 별도 코드블록으로 줘.
\`\`\`json
{
  "quarter": "FY26 Q1",
  "reportDate": "2026-05-30",
  "dataCenterRevenue": 1.5,
  "revenueYoY": 35,
  "revenueQoQ": 8,
  "nextQuarterGuidance": "가이던스 요약",
  "keyCustomers": "MSFT 25%, META 20%",
  "notes": "한줄 메모"
}
\`\`\``,
  catalyst: `향후 6개월 동안 이 종목의 주가/Thesis에 영향을 줄 Catalyst를 정리해줘.

실적, 신제품, 컨퍼런스, 정책, 고객사 실적, 기타로 분류하고 중요도를 High/Medium/Low로 표시해줘.

답변 마지막에는 아래 JSON 배열만 별도 코드블록으로 줘.
\`\`\`json
[
  {
    "date": "2026-06-10",
    "event": "Q2 실적 발표",
    "category": "earnings",
    "impact": "high",
    "notes": "확인할 포인트"
  }
]
\`\`\``,
  risk: `이 종목의 핵심 위험요인 하나를 초보 투자자도 이해하기 쉽게 분석해줘.

필요 항목:
- 위험요인 이름: 어려운 금융용어 말고 쉬운 말로
- 이 문제가 실제로 터졌다고 볼 수 있는 신호
- 나쁜 경우 / 보통 경우 / 좋은 경우별 예상 가격
- 각 경우에 내가 할 행동: 매도 / 보유 / 추가매수
- 왜 그렇게 행동해야 하는지 쉬운 설명

답변 마지막에는 아래 JSON만 별도 코드블록으로 줘.
\`\`\`json
{
  "name": "AI 매출 성장 둔화",
  "triggerCondition": "다음 실적에서 AI 관련 매출 성장률이 크게 낮아지고 가이던스도 하향될 때",
  "scenarios": {
    "bear": { "price": 55, "action": "sell", "memo": "성장 스토리가 깨진 경우라 비중을 줄인다." },
    "base": { "price": 75, "action": "hold", "memo": "성장은 이어지지만 기대보다 느린 경우라 확인이 필요하다." },
    "bull": { "price": 100, "action": "buy_more", "memo": "성장률이 다시 높아지고 고객 수요가 확인되면 추가매수 가능하다." }
  }
}
\`\`\``,
  research: `이 종목에 대한 새 리서치 메모를 작성해줘.

기존 thesis 전체를 반복하지 말고, 이번 정보가 thesis를 강화/약화/중립 중 어디에 해당하는지와 바뀌는 점만 정리해줘.

답변 마지막에는 아래 JSON만 별도 코드블록으로 줘.
\`\`\`json
{
  "title": "메모 제목",
  "body": "리서치 메모 본문"
}
\`\`\``,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function asTicker(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function num(value: string | number | null | undefined) {
  const parsed = Number(value);
  return value === "" || value === null || value === undefined || Number.isNaN(parsed) ? null : parsed;
}

function money(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function pct(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function multiple(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}x`;
}

function saveState(next: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function dday(date: string) {
  if (!date) return "";
  const a = new Date(`${today()}T00:00:00`).getTime();
  const b = new Date(`${date}T00:00:00`).getTime();
  const diff = Math.ceil((b - a) / 86400000);
  if (Number.isNaN(diff)) return "";
  if (diff === 0) return "D-Day";
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

function cleanMarkdown(text: string) {
  return text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .trim();
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text;
  const firstArray = raw.indexOf("[");
  const firstObject = raw.indexOf("{");
  const starts = [firstArray, firstObject].filter((index) => index >= 0);
  if (starts.length === 0) throw new Error("JSON을 찾지 못했어요.");
  const start = Math.min(...starts);
  const end = raw.lastIndexOf(raw[start] === "[" ? "]" : "}");
  if (end <= start) throw new Error("JSON 끝을 찾지 못했어요.");
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeAction(value: unknown): ScenarioAction {
  return value === "sell" || value === "buy_more" || value === "hold" ? value : "hold";
}

function latestByDate<T extends { reportDate?: string; noteDate?: string; checkDate?: string }>(items: T[]) {
  return [...items].sort((a, b) =>
    String(b.reportDate || b.noteDate || b.checkDate || "").localeCompare(String(a.reportDate || a.noteDate || a.checkDate || ""))
  )[0];
}

export default function CompanyPage() {
  const params = useParams<{ ticker: string }>();
  const ticker = asTicker(params.ticker);
  const [state, setState] = useState<AppState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [modal, setModal] = useState<null | "position" | "valuation" | "quarterly" | "catalyst" | "risk" | "research">(null);
  const [editingNote, setEditingNote] = useState<AiNote | null>(null);
  const [jsonPaste, setJsonPaste] = useState("");
  const [jsonMessage, setJsonMessage] = useState("");

  const [positionDraft, setPositionDraft] = useState<ValueChainPosition>({
    layer: "미분류",
    aiRevenueShare: null,
    aiRevenueTrend: "expanding",
    exposureType: "direct",
    replaceability: "",
    competitors: [],
  });
  const [valuationDraft, setValuationDraft] = useState<Valuation>({});
  const [quarterDraft, setQuarterDraft] = useState<QuarterlyDatum>({
    id: "",
    quarter: "",
    reportDate: "",
    dataCenterRevenue: null,
    revenueYoY: null,
    revenueQoQ: null,
    nextQuarterGuidance: "",
    keyCustomers: "",
    notes: "",
  });
  const [catalystDraft, setCatalystDraft] = useState<Catalyst>({
    id: "",
    date: "",
    event: "",
    category: "earnings",
    impact: "medium",
    notes: "",
  });
  const [riskDraft, setRiskDraft] = useState<Risk>({
    id: "",
    name: "",
    triggerCondition: "",
    scenarios: {
      bear: { price: null, action: "sell", memo: "" },
      base: { price: null, action: "hold", memo: "" },
      bull: { price: null, action: "buy_more", memo: "" },
    },
  });
  const [researchDraft, setResearchDraft] = useState({ title: "", body: "" });

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

  const profile = state.profiles[ticker];
  const detail = state.companyDetails?.[ticker] ?? {};
  const theses = useMemo(
    () => state.theses.filter((item) => item.ticker === ticker).sort((a, b) => b.reportDate.localeCompare(a.reportDate)),
    [state.theses, ticker]
  );
  const notes = useMemo(
    () => state.aiNotes.filter((item) => item.ticker === ticker).sort((a, b) => b.noteDate.localeCompare(a.noteDate)),
    [state.aiNotes, ticker]
  );
  const latestThesis = latestByDate(theses);
  const layer = detail.valueChainPosition?.layer ?? profile?.sector ?? latestThesis?.sector ?? "미분류";
  const layerMeta = LAYERS.find((item) => item.id === layer) ?? LAYERS[LAYERS.length - 1];
  const valuation = detail.valuation ?? latestThesis?.valuation ?? {};
  const quarterly = [...(detail.quarterlyData ?? [])].sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  const catalysts = [...(detail.catalysts ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const risks = detail.risks?.length ? detail.risks : latestThesis?.risks ?? [];

  const updateDetail = (patch: Partial<CompanyDetail>) => {
    setState((current) => {
      const next = {
        ...current,
        companyDetails: {
          ...(current.companyDetails ?? {}),
          [ticker]: { ...(current.companyDetails?.[ticker] ?? {}), ...patch },
        },
      };
      return saveState(next);
    });
  };

  const openModal = (nextModal: NonNullable<typeof modal>) => {
    setJsonPaste("");
    setJsonMessage("");
    setModal(nextModal);
  };

  const applyJsonPaste = () => {
    if (!modal) return;
    try {
      const parsed = extractJson(jsonPaste);

      if (modal === "position") {
        setPositionDraft({
          layer: String(parsed.layer ?? parsed.valueChainLayer ?? "미분류"),
          aiRevenueShare: num(parsed.aiRevenueShare),
          aiRevenueTrend: ["expanding", "stable", "shrinking"].includes(parsed.aiRevenueTrend) ? parsed.aiRevenueTrend : "expanding",
          exposureType: ["direct", "indirect", "infrastructure"].includes(parsed.exposureType) ? parsed.exposureType : "direct",
          replaceability: String(parsed.replaceability ?? ""),
          competitors: Array.isArray(parsed.competitors) ? parsed.competitors.map((item: unknown) => asTicker(item)).filter(Boolean) : [],
        });
      }

      if (modal === "valuation") {
        setValuationDraft({
          currentPrice: num(parsed.currentPrice),
          eps: num(parsed.eps),
          forwardEps: num(parsed.forwardEps),
          per: num(parsed.per),
          forwardPer: num(parsed.forwardPer),
          fairPer: num(parsed.fairPer),
          bearTarget: num(parsed.bearTarget),
          baseTarget: num(parsed.baseTarget),
          bullTarget: num(parsed.bullTarget),
          targetPrice: num(parsed.targetPrice),
          upside: String(parsed.upside ?? ""),
          view: String(parsed.view ?? ""),
        });
      }

      if (modal === "quarterly") {
        setQuarterDraft((current) => ({
          ...current,
          quarter: String(parsed.quarter ?? ""),
          reportDate: String(parsed.reportDate ?? ""),
          dataCenterRevenue: num(parsed.dataCenterRevenue),
          revenueYoY: num(parsed.revenueYoY),
          revenueQoQ: num(parsed.revenueQoQ),
          nextQuarterGuidance: String(parsed.nextQuarterGuidance ?? ""),
          keyCustomers: String(parsed.keyCustomers ?? ""),
          notes: String(parsed.notes ?? ""),
        }));
      }

      if (modal === "catalyst") {
        if (Array.isArray(parsed)) {
          const rows: Catalyst[] = parsed.map((item) => ({
            id: uid("cat"),
            date: String(item.date ?? ""),
            event: String(item.event ?? ""),
            category: ["earnings", "product", "conference", "policy", "customer_earnings", "other"].includes(item.category) ? item.category : "other",
            impact: ["high", "medium", "low"].includes(item.impact) ? item.impact : "medium",
            notes: String(item.notes ?? ""),
          }));
          updateDetail({ catalysts: [...(detail.catalysts ?? []), ...rows] });
          setJsonMessage(`${rows.length}개 Catalyst를 바로 저장했어요.`);
          return;
        }
        const item = parsed;
        setCatalystDraft((current) => ({
          ...current,
          date: String(item.date ?? ""),
          event: String(item.event ?? ""),
          category: ["earnings", "product", "conference", "policy", "customer_earnings", "other"].includes(item.category) ? item.category : "other",
          impact: ["high", "medium", "low"].includes(item.impact) ? item.impact : "medium",
          notes: String(item.notes ?? ""),
        }));
      }

      if (modal === "risk") {
        setRiskDraft((current) => ({
          ...current,
          name: String(parsed.name ?? parsed.text ?? ""),
          triggerCondition: String(parsed.triggerCondition ?? ""),
          scenarios: {
            bear: {
              price: num(parsed.scenarios?.bear?.price),
              action: normalizeAction(parsed.scenarios?.bear?.action),
              memo: String(parsed.scenarios?.bear?.memo ?? ""),
            },
            base: {
              price: num(parsed.scenarios?.base?.price),
              action: normalizeAction(parsed.scenarios?.base?.action),
              memo: String(parsed.scenarios?.base?.memo ?? ""),
            },
            bull: {
              price: num(parsed.scenarios?.bull?.price),
              action: normalizeAction(parsed.scenarios?.bull?.action),
              memo: String(parsed.scenarios?.bull?.memo ?? ""),
            },
          },
        }));
      }

      if (modal === "research") {
        setResearchDraft({
          title: String(parsed.title ?? "리서치 업데이트"),
          body: String(parsed.body ?? parsed.summary ?? ""),
        });
      }

      setJsonMessage("JSON을 입력칸에 반영했어요. 확인 후 저장하세요.");
    } catch (error) {
      setJsonMessage(error instanceof Error ? error.message : "JSON을 읽지 못했어요.");
    }
  };

  const openPosition = () => {
    setPositionDraft(detail.valueChainPosition ?? {
      layer,
      aiRevenueShare: null,
      aiRevenueTrend: "expanding",
      exposureType: "direct",
      replaceability: "",
      competitors: [],
    });
    openModal("position");
  };

  const savePosition = () => {
    updateDetail({ valueChainPosition: positionDraft });
    setState((current) => {
      const existing = current.profiles[ticker];
      const next = {
        ...current,
        profiles: {
          ...current.profiles,
          [ticker]: {
            ...(existing ?? {}),
            ticker,
            companyName: existing?.companyName ?? latestThesis?.companyName ?? ticker,
            sector: positionDraft.layer,
            aiValueChain: [positionDraft.layer],
            oneLineThesis: existing?.oneLineThesis ?? latestThesis?.oneLineThesis,
            businessModel: existing?.businessModel ?? latestThesis?.businessModel,
            status: existing?.status ?? "검토",
            updatedAt: today(),
          },
        },
      };
      return saveState(next);
    });
    setModal(null);
  };

  const saveValuation = () => {
    updateDetail({ valuation: valuationDraft });
    setModal(null);
  };

  const saveQuarter = () => {
    const row = { ...quarterDraft, id: quarterDraft.id || uid("q") };
    const existing = detail.quarterlyData ?? [];
    const nextRows = existing.some((item) => item.id === row.id)
      ? existing.map((item) => (item.id === row.id ? row : item))
      : [row, ...existing];
    updateDetail({ quarterlyData: nextRows });
    if (row.reportDate && row.quarter) {
      const autoCatalyst: Catalyst = {
        id: uid("cat"),
        date: row.reportDate,
        event: `${row.quarter} 실적 발표`,
        category: "earnings",
        impact: "medium",
        notes: row.notes,
      };
      updateDetail({ quarterlyData: nextRows, catalysts: [autoCatalyst, ...(detail.catalysts ?? [])] });
    }
    setModal(null);
  };

  const saveCatalyst = () => {
    const row = { ...catalystDraft, id: catalystDraft.id || uid("cat") };
    const existing = detail.catalysts ?? [];
    const nextRows = existing.some((item) => item.id === row.id)
      ? existing.map((item) => (item.id === row.id ? row : item))
      : [...existing, row];
    updateDetail({ catalysts: nextRows });
    setModal(null);
  };

  const saveRisk = () => {
    const row = { ...riskDraft, id: riskDraft.id || uid("risk") };
    const existing = detail.risks ?? [];
    const nextRows = existing.some((item) => item.id === row.id)
      ? existing.map((item) => (item.id === row.id ? row : item))
      : [...existing, row];
    updateDetail({ risks: nextRows });
    setModal(null);
  };

  const saveResearch = () => {
    const note: AiNote = {
      id: editingNote?.id || uid("note"),
      ticker,
      noteDate: editingNote?.noteDate || today(),
      title: researchDraft.title.trim() || "리서치 업데이트",
      body: researchDraft.body.trim(),
      updateType: "manual",
    };
    setState((current) => {
      const existing = current.aiNotes ?? [];
      const next = {
        ...current,
        aiNotes: existing.some((item) => item.id === note.id)
          ? existing.map((item) => (item.id === note.id ? note : item))
          : [note, ...existing],
      };
      return saveState(next);
    });
    setEditingNote(null);
    setModal(null);
  };

  const deleteQuarter = (id: string) => updateDetail({ quarterlyData: (detail.quarterlyData ?? []).filter((item) => item.id !== id) });
  const deleteCatalyst = (id: string) => updateDetail({ catalysts: (detail.catalysts ?? []).filter((item) => item.id !== id) });
  const deleteRisk = (id?: string) => updateDetail({ risks: (detail.risks ?? []).filter((item) => item.id !== id) });
  const deleteNote = (id: string) => {
    if (!window.confirm("이 리서치 메모를 삭제할까요?")) return;
    setState((current) => saveState({ ...current, aiNotes: current.aiNotes.filter((item) => item.id !== id) }));
  };

  const exportResearchFile = () => {
    const markdown = [
      `# ${ticker} AI Thesis Workspace`,
      "",
      `Generated: ${today()}`,
      "",
      "## 회사 정체성",
      latestThesis?.businessModel || profile?.businessModel || "",
      "",
      "## 투자 가설",
      latestThesis?.finalView || latestThesis?.oneLineThesis || profile?.oneLineThesis || "",
      "",
      "## AI 밸류체인 포지션",
      JSON.stringify(detail.valueChainPosition ?? {}, null, 2),
      "",
      "## 밸류에이션과 목표주가",
      JSON.stringify(valuation, null, 2),
      "",
      "## 성장률 & CapEx 트래커",
      JSON.stringify(quarterly, null, 2),
      "",
      "## Catalyst",
      JSON.stringify(catalysts, null, 2),
      "",
      "## 리스크 시나리오",
      JSON.stringify(risks, null, 2),
      "",
      "## 리서치 업데이트",
      ...notes.flatMap((note) => [`### ${note.noteDate} ${note.title}`, note.body, ""]),
    ].join("\n");
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ticker}_ai_thesis_${today()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0b0d12] text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
            ← 맵으로
          </Link>
          <div className="flex items-center gap-2">
            <Button onClick={exportResearchFile}>AI 파일 내보내기</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${layerMeta.color}`} />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">{layer}</p>
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{profile?.companyName || latestThesis?.companyName || ticker}</h1>
              <p className="mt-3 max-w-4xl text-base text-slate-300">
                {latestThesis?.oneLineThesis || profile?.oneLineThesis || "아직 투자 가설이 정리되지 않았습니다."}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <InfoCard title="회사 정체성">
            {latestThesis?.businessModel || profile?.businessModel || "아직 사업모델 분석이 없습니다."}
          </InfoCard>
          <InfoCard title="투자 가설">
            {latestThesis?.finalView || latestThesis?.oneLineThesis || profile?.oneLineThesis || "아직 투자 가설이 정리되지 않았습니다."}
          </InfoCard>
        </section>

        <Section title="AI 밸류체인 포지션" onAdd={openPosition}>
          <div className={`rounded-lg border ${layerMeta.border} bg-slate-950/50 p-4`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${layerMeta.color}`} />
              <strong>{detail.valueChainPosition?.layer ?? layer}</strong>
              <Badge>{pct(detail.valueChainPosition?.aiRevenueShare)} AI 매출</Badge>
              <Badge>{trendLabel(detail.valueChainPosition?.aiRevenueTrend)}</Badge>
              <Badge>{exposureLabel(detail.valueChainPosition?.exposureType)}</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              {detail.valueChainPosition?.replaceability || "대체 가능성과 밸류체인 내 병목성 분석이 아직 없습니다."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(detail.valueChainPosition?.competitors ?? []).map((competitor) => (
                <Link key={competitor} href={`/company/${competitor}`} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-emerald-300 hover:bg-slate-800">
                  {competitor}
                </Link>
              ))}
            </div>
          </div>
        </Section>

        <Section title="밸류에이션과 목표주가" onAdd={() => { setValuationDraft(valuation); openModal("valuation"); }}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="현재가" value={money(valuation.currentPrice ?? latestThesis?.currentPrice)} />
            <Metric label="EPS" value={formatNumber(valuation.eps)} />
            <Metric label="Forward EPS" value={formatNumber(valuation.forwardEps)} />
            <Metric label="PER" value={multiple(valuation.per)} />
            <Metric label="Forward PER" value={multiple(valuation.forwardPer)} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Bear" value={money(valuation.bearTarget)} />
            <Metric label="Base" value={money(valuation.baseTarget ?? valuation.targetPrice)} />
            <Metric label="Bull" value={money(valuation.bullTarget)} />
            <Metric label="Upside" value={valuation.upside || "-"} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">{valuation.view || "아직 밸류에이션 판단이 없습니다."}</p>
        </Section>

        <Section title="성장률 & CapEx 트래커" onAdd={() => { setQuarterDraft({ id: "", quarter: "", reportDate: "", dataCenterRevenue: null, revenueYoY: null, revenueQoQ: null, nextQuarterGuidance: "", keyCustomers: "", notes: "" }); openModal("quarterly"); }}>
          <MiniCharts data={quarterly} />
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-950 text-xs text-slate-500">
                <tr>
                  <th className="p-3">분기</th><th>발표일</th><th>DC 매출</th><th>YoY</th><th>QoQ</th><th>가이던스</th><th>핵심 고객</th><th>메모</th><th></th>
                </tr>
              </thead>
              <tbody>
                {quarterly.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800">
                    <td className="p-3 font-medium">{row.quarter}</td>
                    <td>{row.reportDate}</td>
                    <td>{row.dataCenterRevenue ?? "-"}</td>
                    <td>{pct(row.revenueYoY)}</td>
                    <td>{pct(row.revenueQoQ)}</td>
                    <td className="max-w-xs">{row.nextQuarterGuidance}</td>
                    <td>{row.keyCustomers}</td>
                    <td>{row.notes}</td>
                    <td><button onClick={() => deleteQuarter(row.id)} className="text-xs text-rose-400">삭제</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {quarterly.length === 0 && <p className="p-4 text-sm text-slate-500">아직 분기 데이터가 없습니다.</p>}
          </div>
        </Section>

        <Section title="향후 6개월 Catalyst" onAdd={() => { setCatalystDraft({ id: "", date: "", event: "", category: "earnings", impact: "medium", notes: "" }); openModal("catalyst"); }}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {catalysts.map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between">
                  <Badge tone={item.impact}>{item.impact.toUpperCase()}</Badge>
                  <span className="font-mono text-xs text-slate-500">{dday(item.date)}</span>
                </div>
                <h3 className="mt-3 font-semibold">{item.event}</h3>
                <p className="mt-1 text-xs text-slate-500">{item.date} · {categoryLabel(item.category)}</p>
                <p className="mt-3 text-sm text-slate-400">{item.notes}</p>
                <button onClick={() => deleteCatalyst(item.id)} className="mt-3 text-xs text-rose-400">삭제</button>
              </article>
            ))}
            {catalysts.length === 0 && <p className="text-sm text-slate-500">등록된 Catalyst가 없습니다.</p>}
          </div>
        </Section>

        <Section title="위험요인별 대응 계획" onAdd={() => { setRiskDraft({ id: "", name: "", triggerCondition: "", scenarios: { bear: { price: null, action: "sell", memo: "" }, base: { price: null, action: "hold", memo: "" }, bull: { price: null, action: "buy_more", memo: "" } } }); openModal("risk"); }}>
          <div className="grid gap-3 md:grid-cols-2">
            {risks.map((risk, index) => (
              <details key={risk.id ?? `${risk.name}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <summary className="cursor-pointer font-semibold">{risk.name || risk.text || "위험요인"}</summary>
                <p className="mt-3 text-sm text-slate-400">
                  <span className="text-slate-500">문제가 실제로 커졌다고 볼 신호: </span>
                  {risk.triggerCondition || risk.response || "아직 정리되지 않았습니다."}
                </p>
                <div className="mt-4 grid gap-2">
                  {(["bear", "base", "bull"] as const).map((kind) => (
                    <ScenarioBox key={kind} kind={kind} data={risk.scenarios?.[kind]} />
                  ))}
                </div>
                {risk.id && <button onClick={() => deleteRisk(risk.id)} className="mt-3 text-xs text-rose-400">삭제</button>}
              </details>
            ))}
            {risks.length === 0 && <p className="text-sm text-slate-500">등록된 리스크가 없습니다.</p>}
          </div>
        </Section>

        <Section title="리서치 업데이트" onAdd={() => { setEditingNote(null); setResearchDraft({ title: "", body: "" }); openModal("research"); }}>
          <div className="grid gap-3">
            {notes.map((note) => (
              <article key={note.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold">{cleanMarkdown(note.title)}</h3>
                  <div className="flex gap-2">
                    <span className="font-mono text-xs text-slate-500">{note.noteDate}</span>
                    <button onClick={() => { setEditingNote(note); setResearchDraft({ title: note.title, body: note.body }); openModal("research"); }} className="text-xs text-slate-400">수정</button>
                    <button onClick={() => deleteNote(note.id)} className="text-xs text-rose-400">삭제</button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{cleanMarkdown(note.body)}</p>
              </article>
            ))}
            {notes.length === 0 && <p className="text-sm text-slate-500">아직 리서치 업데이트가 없습니다.</p>}
          </div>
        </Section>
      </main>

      {modal && (
        <Modal title={modalTitle(modal)} onClose={() => setModal(null)}>
          <PromptBox text={prompts[modal]} ticker={ticker} />
          <JsonPasteBox
            value={jsonPaste}
            onChange={setJsonPaste}
            onApply={applyJsonPaste}
            message={jsonMessage}
          />
          {modal === "position" && (
            <div className="space-y-3">
              <Field label="Layer"><Select value={positionDraft.layer} onChange={(value) => setPositionDraft((d) => ({ ...d, layer: value }))} options={LAYERS.map((item) => item.id)} /></Field>
              <Field label="AI 매출 비중 (%)"><Input value={positionDraft.aiRevenueShare ?? ""} onChange={(v) => setPositionDraft((d) => ({ ...d, aiRevenueShare: num(v) }))} /></Field>
              <Field label="AI 매출 추세"><Select value={positionDraft.aiRevenueTrend} onChange={(value) => setPositionDraft((d) => ({ ...d, aiRevenueTrend: value as ValueChainPosition["aiRevenueTrend"] }))} options={["expanding", "stable", "shrinking"]} /></Field>
              <Field label="수혜 유형"><Select value={positionDraft.exposureType} onChange={(value) => setPositionDraft((d) => ({ ...d, exposureType: value as ValueChainPosition["exposureType"] }))} options={["direct", "indirect", "infrastructure"]} /></Field>
              <Field label="대체 가능성"><Textarea value={positionDraft.replaceability} onChange={(v) => setPositionDraft((d) => ({ ...d, replaceability: v }))} /></Field>
              <Field label="경쟁자 티커"><Input value={positionDraft.competitors.join(", ")} onChange={(v) => setPositionDraft((d) => ({ ...d, competitors: v.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean) }))} /></Field>
              <Button onClick={savePosition} tone="emerald">저장</Button>
            </div>
          )}
          {modal === "valuation" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(["currentPrice", "eps", "forwardEps", "per", "forwardPer", "fairPer", "bearTarget", "baseTarget", "bullTarget", "targetPrice"] as const).map((key) => (
                <Field key={key} label={key}><Input value={valuationDraft[key] ?? ""} onChange={(v) => setValuationDraft((d) => ({ ...d, [key]: num(v) }))} /></Field>
              ))}
              <div className="sm:col-span-2"><Field label="Upside"><Input value={valuationDraft.upside ?? ""} onChange={(v) => setValuationDraft((d) => ({ ...d, upside: v }))} /></Field></div>
              <div className="sm:col-span-2"><Field label="판단"><Textarea value={valuationDraft.view ?? ""} onChange={(v) => setValuationDraft((d) => ({ ...d, view: v }))} /></Field></div>
              <Button onClick={saveValuation} tone="emerald">저장</Button>
            </div>
          )}
          {modal === "quarterly" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="분기"><Input value={quarterDraft.quarter} onChange={(v) => setQuarterDraft((d) => ({ ...d, quarter: v }))} /></Field>
              <Field label="발표일"><Input type="date" value={quarterDraft.reportDate} onChange={(v) => setQuarterDraft((d) => ({ ...d, reportDate: v }))} /></Field>
              <Field label="데이터센터 매출(B$)"><Input value={quarterDraft.dataCenterRevenue ?? ""} onChange={(v) => setQuarterDraft((d) => ({ ...d, dataCenterRevenue: num(v) }))} /></Field>
              <Field label="YoY(%)"><Input value={quarterDraft.revenueYoY ?? ""} onChange={(v) => setQuarterDraft((d) => ({ ...d, revenueYoY: num(v) }))} /></Field>
              <Field label="QoQ(%)"><Input value={quarterDraft.revenueQoQ ?? ""} onChange={(v) => setQuarterDraft((d) => ({ ...d, revenueQoQ: num(v) }))} /></Field>
              <Field label="핵심 고객"><Input value={quarterDraft.keyCustomers} onChange={(v) => setQuarterDraft((d) => ({ ...d, keyCustomers: v }))} /></Field>
              <div className="sm:col-span-2"><Field label="다음 분기 가이던스"><Textarea value={quarterDraft.nextQuarterGuidance} onChange={(v) => setQuarterDraft((d) => ({ ...d, nextQuarterGuidance: v }))} /></Field></div>
              <div className="sm:col-span-2"><Field label="메모"><Input value={quarterDraft.notes} onChange={(v) => setQuarterDraft((d) => ({ ...d, notes: v }))} /></Field></div>
              <Button onClick={saveQuarter} tone="emerald">저장</Button>
            </div>
          )}
          {modal === "catalyst" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="날짜"><Input type="date" value={catalystDraft.date} onChange={(v) => setCatalystDraft((d) => ({ ...d, date: v }))} /></Field>
              <Field label="이벤트"><Input value={catalystDraft.event} onChange={(v) => setCatalystDraft((d) => ({ ...d, event: v }))} /></Field>
              <Field label="카테고리"><Select value={catalystDraft.category} onChange={(v) => setCatalystDraft((d) => ({ ...d, category: v as Catalyst["category"] }))} options={["earnings", "product", "conference", "policy", "customer_earnings", "other"]} /></Field>
              <Field label="영향도"><Select value={catalystDraft.impact} onChange={(v) => setCatalystDraft((d) => ({ ...d, impact: v as Catalyst["impact"] }))} options={["high", "medium", "low"]} /></Field>
              <div className="sm:col-span-2"><Field label="메모"><Textarea value={catalystDraft.notes} onChange={(v) => setCatalystDraft((d) => ({ ...d, notes: v }))} /></Field></div>
              <Button onClick={saveCatalyst} tone="emerald">저장</Button>
            </div>
          )}
          {modal === "risk" && (
            <div className="space-y-3">
              <Field label="위험요인 이름"><Input value={riskDraft.name ?? ""} onChange={(v) => setRiskDraft((d) => ({ ...d, name: v }))} /></Field>
              <Field label="문제가 실제로 커졌다고 볼 신호"><Textarea value={riskDraft.triggerCondition ?? ""} onChange={(v) => setRiskDraft((d) => ({ ...d, triggerCondition: v }))} /></Field>
              {(["bear", "base", "bull"] as const).map((kind) => (
                <div key={kind} className="rounded-md border border-slate-800 p-3">
                  <h4 className="font-semibold">{kind === "bear" ? "나쁜 경우" : kind === "base" ? "보통 경우" : "좋은 경우"}</h4>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <Input value={riskDraft.scenarios?.[kind]?.price ?? ""} onChange={(v) => setRiskDraft((d) => ({ ...d, scenarios: { ...d.scenarios, [kind]: { ...d.scenarios?.[kind], price: num(v) } } }))} placeholder="가격" />
                    <Select value={riskDraft.scenarios?.[kind]?.action ?? "hold"} onChange={(v) => setRiskDraft((d) => ({ ...d, scenarios: { ...d.scenarios, [kind]: { ...d.scenarios?.[kind], action: v as ScenarioAction } } }))} options={["sell", "hold", "buy_more"]} />
                    <Input value={riskDraft.scenarios?.[kind]?.memo ?? ""} onChange={(v) => setRiskDraft((d) => ({ ...d, scenarios: { ...d.scenarios, [kind]: { ...d.scenarios?.[kind], memo: v } } }))} placeholder="메모" />
                  </div>
                </div>
              ))}
              <Button onClick={saveRisk} tone="emerald">저장</Button>
            </div>
          )}
          {modal === "research" && (
            <div className="space-y-3">
              <Field label="제목"><Input value={researchDraft.title} onChange={(v) => setResearchDraft((d) => ({ ...d, title: v }))} /></Field>
              <Field label="내용"><Textarea value={researchDraft.body} onChange={(v) => setResearchDraft((d) => ({ ...d, body: v }))} rows={10} /></Field>
              <Button onClick={saveResearch} tone="emerald">{editingNote ? "수정 저장" : "저장"}</Button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function Section({ title, children, onAdd }: { title: string; children: React.ReactNode; onAdd: () => void }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button onClick={onAdd} className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm hover:bg-slate-800">+</button>
      </div>
      {children}
    </section>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

function MiniCharts({ data }: { data: QuarterlyDatum[] }) {
  const values = data.map((item) => item.dataCenterRevenue ?? 0);
  const max = Math.max(...values, 1);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
        <p className="text-sm font-medium">데이터센터 매출 추이</p>
        <div className="mt-4 flex h-32 items-end gap-2">
          {[...data].reverse().map((item) => (
            <div key={item.id} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t bg-emerald-500/80" style={{ height: `${((item.dataCenterRevenue ?? 0) / max) * 100}%` }} />
              <span className="text-[10px] text-slate-500">{item.quarter}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
        <p className="text-sm font-medium">YoY 성장률</p>
        <div className="mt-4 flex h-32 items-end gap-2">
          {[...data].reverse().map((item) => (
            <div key={item.id} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t bg-cyan-500/80" style={{ height: `${Math.max(4, Math.min(100, item.revenueYoY ?? 0))}%` }} />
              <span className="text-[10px] text-slate-500">{pct(item.revenueYoY)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScenarioBox({ kind, data }: { kind: "bear" | "base" | "bull"; data?: Risk["scenarios"] extends infer S ? S extends object ? S[keyof S] : never : never }) {
  const colors = {
    bear: "border-rose-800 bg-rose-950/20 text-rose-200",
    base: "border-slate-700 bg-slate-900 text-slate-200",
    bull: "border-emerald-800 bg-emerald-950/20 text-emerald-200",
  };
  const labels = {
    bear: "나쁜 경우",
    base: "보통 경우",
    bull: "좋은 경우",
  };
  return (
    <div className={`rounded-md border p-3 ${colors[kind]}`}>
      <div className="flex justify-between text-sm">
        <strong>{labels[kind]}</strong>
        <span>{money(data?.price)}</span>
      </div>
      <p className="mt-1 text-xs">내 행동: {actionLabel(data?.action)}</p>
      <p className="mt-1 text-xs leading-5 opacity-90">{data?.memo || "왜 이렇게 대응할지 메모가 없습니다."}</p>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800">닫기</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PromptBox({ text, ticker }: { text: string; ticker: string }) {
  const prompt = text.replace("이 종목", ticker);
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <details className="mb-4 rounded-md border border-slate-800 bg-slate-900 p-3">
      <summary className="cursor-pointer text-sm font-medium">프롬프트 예시</summary>
      <div className="mt-3 rounded-md border border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
          <span className="text-xs text-slate-500">Prompt</span>
          <button
            type="button"
            onClick={copyPrompt}
            className="relative h-7 w-7 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800"
            title="프롬프트 복사"
            aria-label="프롬프트 복사"
          >
            <span className="absolute left-[9px] top-[7px] h-3 w-3 rounded-sm border border-slate-300" />
            <span className="absolute left-[6px] top-[10px] h-3 w-3 rounded-sm border border-slate-500 bg-slate-900" />
          </button>
        </div>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-3 text-xs leading-6 text-slate-400">{prompt}</pre>
      </div>
      {copied && <p className="mt-2 text-xs text-emerald-300">복사됨</p>}
    </details>
  );
}

function JsonPasteBox({
  value,
  onChange,
  onApply,
  message,
}: {
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  message: string;
}) {
  return (
    <details className="mb-4 rounded-md border border-slate-800 bg-slate-900 p-3" open>
      <summary className="cursor-pointer text-sm font-medium">JSON 붙여넣기 자동 입력</summary>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="AI가 준 JSON 코드블록이나 JSON 본문을 그대로 붙여넣으세요."
        className="mt-3 h-32 w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button onClick={onApply} tone="emerald">JSON 반영</Button>
        {message && <span className="text-xs text-slate-400">{message}</span>}
      </div>
    </details>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm text-slate-400"><span className="mb-1 block">{label}</span>{children}</label>;
}

function Input({ value, onChange, type = "text", placeholder = "" }: { value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500" />;
}

function Textarea({ value, onChange, rows = 4 }: { value: string; onChange: (value: string) => void; rows?: number }) {
  return <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="w-full resize-y rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500" />;
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}

function Button({ children, onClick, tone = "slate" }: { children: React.ReactNode; onClick?: () => void; tone?: "slate" | "emerald" }) {
  return <button type="button" onClick={onClick} className={`rounded-md border px-3 py-2 text-sm font-medium ${tone === "emerald" ? "border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-500" : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"}`}>{children}</button>;
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: "high" | "medium" | "low" }) {
  const cls = tone === "high" ? "bg-rose-950 text-rose-300" : tone === "medium" ? "bg-amber-950 text-amber-300" : tone === "low" ? "bg-slate-800 text-slate-400" : "bg-slate-800 text-slate-300";
  return <span className={`rounded-full px-2 py-1 text-xs ${cls}`}>{children}</span>;
}

function trendLabel(value?: string) {
  return value === "expanding" ? "확대 중" : value === "stable" ? "정체" : value === "shrinking" ? "축소" : "-";
}

function exposureLabel(value?: string) {
  return value === "direct" ? "직접 수혜" : value === "indirect" ? "간접 수혜" : value === "infrastructure" ? "인프라 수혜" : "-";
}

function categoryLabel(value: Catalyst["category"]) {
  const labels = { earnings: "실적", product: "신제품", conference: "컨퍼런스", policy: "정책", customer_earnings: "고객사 실적", other: "기타" };
  return labels[value];
}

function actionLabel(value?: ScenarioAction) {
  return value === "sell" ? "매도" : value === "buy_more" ? "추매" : "홀드";
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function modalTitle(modal: NonNullable<ReturnType<typeof useCompanyModalType>>) {
  return modal;
}

function useCompanyModalType(): null | "position" | "valuation" | "quarterly" | "catalyst" | "risk" | "research" {
  return null;
}
