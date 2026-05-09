import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type YahooNumber = {
  raw?: number;
  fmt?: string;
};

function raw(value: YahooNumber | undefined | null) {
  return typeof value?.raw === "number" ? value.raw : null;
}

function fmt(value: YahooNumber | undefined | null) {
  return value?.fmt ?? "";
}

function pct(value: number | null) {
  if (value === null || Number.isNaN(value)) return "";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function toDate(seconds: number | null) {
  if (!seconds) return "";
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "ai-map-thesis-os/1.0 contact: local-research-tool",
      accept: "application/json,text/plain,*/*",
    },
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchSecLinks(ticker: string) {
  try {
    const data = await fetchJson("https://www.sec.gov/files/company_tickers.json");
    const row = Object.values(data as Record<string, { ticker: string; cik_str: number; title: string }>).find(
      (item) => item.ticker.toUpperCase() === ticker
    );
    if (!row) return null;
    const cik = String(row.cik_str).padStart(10, "0");
    return {
      cik,
      companyName: row.title,
      submissionsUrl: `https://data.sec.gov/submissions/CIK${cik}.json`,
      companyFactsUrl: `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
      secSearchUrl: `https://www.sec.gov/edgar/browse/?CIK=${cik}`,
    };
  } catch {
    return null;
  }
}

async function fetchSecCompanyFacts(cik: string) {
  try {
    return await fetchJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`);
  } catch {
    return null;
  }
}

async function fetchYahooQuote(ticker: string) {
  try {
    const data = await fetchJson(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`);
    return data?.quoteResponse?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

function unitItems(facts: any, tag: string) {
  const taxonomy = Object.values(facts?.facts ?? {}).find((group: any) => group?.[tag]?.units) as any;
  const units = taxonomy?.[tag]?.units ?? {};
  return Object.values(units).flatMap((items) => Array.isArray(items) ? items : []) as any[];
}

function annualValue(facts: any, tag: string) {
  const items = unitItems(facts, tag)
    .filter((item) => item.fy && item.fp === "FY" && typeof item.val === "number")
    .sort((a, b) => String(b.end).localeCompare(String(a.end)));
  return items[0]?.val ?? null;
}

function latestValue(facts: any, tag: string) {
  const items = unitItems(facts, tag)
    .filter((item) => typeof item.val === "number")
    .sort((a, b) => String(b.end).localeCompare(String(a.end)));
  return items[0]?.val ?? null;
}

function quarterlyValues(facts: any, tag: string) {
  const rows = unitItems(facts, tag)
    .filter((item) => /^Q[1-4]$/.test(String(item.fp)) && typeof item.val === "number")
    .filter((item) => {
      const start = item.start ? new Date(item.start).getTime() : 0;
      const end = item.end ? new Date(item.end).getTime() : 0;
      const days = start && end ? (end - start) / 86400000 : 0;
      return !days || days <= 120;
    })
    .sort((a, b) => String(a.end).localeCompare(String(b.end)));

  const byQuarter = new Map<string, any>();
  for (const row of rows) {
    const key = `${row.fy}-${row.fp}-${row.end}`;
    const existing = byQuarter.get(key);
    if (!existing || (!existing.frame && row.frame)) {
      byQuarter.set(key, row);
    }
  }

  return [...byQuarter.values()].sort((a, b) => String(a.end).localeCompare(String(b.end)));
}

function buildChartMetrics(chart: any) {
  const result = chart?.chart?.result?.[0];
  const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter((value: unknown) => typeof value === "number") as number[];
  if (closes.length === 0) return {};

  const current = closes[closes.length - 1];
  const first = closes[0];
  const threeMonthIndex = Math.max(0, closes.length - 63);
  const threeMonth = closes[threeMonthIndex];
  const ma200Values = closes.slice(-200);
  const ma200 = ma200Values.reduce((sum, value) => sum + value, 0) / ma200Values.length;
  const high52w = Math.max(...closes);
  const low52w = Math.min(...closes);

  return {
    currentPrice: current,
    high52w,
    low52w,
    movingAverage200d: ma200,
    return3m: threeMonth ? ((current - threeMonth) / threeMonth) * 100 : null,
    return1y: first ? ((current - first) / first) * 100 : null,
    distanceFromHigh52w: high52w ? ((current - high52w) / high52w) * 100 : null,
    distanceFromLow52w: low52w ? ((current - low52w) / low52w) * 100 : null,
    above200d: current >= ma200,
  };
}

function buildQuarterlyRows(statements: any[]) {
  const rows = [...statements]
    .reverse()
    .map((statement) => ({
      quarter: toDate(raw(statement.endDate)),
      reportDate: toDate(raw(statement.endDate)),
      revenue: raw(statement.totalRevenue),
    }))
    .filter((row) => row.quarter && row.revenue !== null);

  return rows.map((row, index) => {
    const previous = rows[index - 1];
    const sameQuarterLastYear = rows[index - 4];
    const qoq = previous?.revenue ? ((row.revenue! - previous.revenue) / previous.revenue) * 100 : null;
    const yoy = sameQuarterLastYear?.revenue ? ((row.revenue! - sameQuarterLastYear.revenue) / sameQuarterLastYear.revenue) * 100 : null;
    return {
      quarter: row.quarter,
      reportDate: row.reportDate,
      dataCenterRevenue: row.revenue === null ? null : Number((row.revenue / 1_000_000_000).toFixed(2)),
      revenueYoY: yoy === null ? null : Number(yoy.toFixed(1)),
      revenueQoQ: qoq === null ? null : Number(qoq.toFixed(1)),
      nextQuarterGuidance: "",
      keyCustomers: "",
      notes: "API 자동 입력: 전체 매출 기준입니다. 데이터센터/AI 매출은 별도 확인 필요.",
    };
  });
}

function buildSecQuarterlyRows(facts: any) {
  const revenueRows = quarterlyValues(facts, "Revenues").length
    ? quarterlyValues(facts, "Revenues")
    : quarterlyValues(facts, "RevenueFromContractWithCustomerExcludingAssessedTax");

  const allRows = revenueRows.map((row, index) => {
    const previous = revenueRows[index - 1];
    const sameQuarterLastYear = revenueRows.find((item) => Number(item.fy) === Number(row.fy) - 1 && item.fp === row.fp);
    const qoq = previous?.val ? ((row.val - previous.val) / previous.val) * 100 : null;
    const yoy = sameQuarterLastYear?.val ? ((row.val - sameQuarterLastYear.val) / sameQuarterLastYear.val) * 100 : null;
    return {
      quarter: `${row.fy} ${row.fp}`,
      reportDate: String(row.end ?? ""),
      dataCenterRevenue: Number((row.val / 1_000_000_000).toFixed(2)),
      revenueYoY: yoy === null ? null : Number(yoy.toFixed(1)),
      revenueQoQ: qoq === null ? null : Number(qoq.toFixed(1)),
      nextQuarterGuidance: "",
      keyCustomers: "",
      notes: "SEC 자동 입력: 전체 매출 기준입니다. 데이터센터/AI 매출은 별도 확인 필요.",
    };
  });

  return allRows.slice(-4).reverse();
}

export async function GET(_: Request, { params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase();

  try {
    const [chart, sec, quote] = await Promise.all([
      fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1y&interval=1d`),
      fetchSecLinks(ticker),
      fetchYahooQuote(ticker),
    ]);

    const facts = sec?.cik ? await fetchSecCompanyFacts(sec.cik) : null;
    const chartMetrics = buildChartMetrics(chart);
    const chartMeta = chart?.chart?.result?.[0]?.meta ?? {};
    const currentPrice = quote?.regularMarketPrice ?? chartMetrics.currentPrice ?? chartMeta.regularMarketPrice ?? null;
    const eps = quote?.epsTrailingTwelveMonths ?? annualValue(facts, "EarningsPerShareDiluted");
    const shares = latestValue(facts, "EntityCommonStockSharesOutstanding");
    const marketCap = quote?.marketCap ?? (currentPrice && shares ? currentPrice * shares : null);
    const per = quote?.trailingPE ?? (currentPrice && eps ? currentPrice / eps : null);
    const targetPrice = null;
    const upside = currentPrice && targetPrice ? ((targetPrice - currentPrice) / currentPrice) * 100 : null;

    return NextResponse.json({
      ticker,
      source: "Yahoo chart + SEC public data",
      fetchedAt: new Date().toISOString(),
      companyName: sec?.companyName ?? ticker,
      valuation: {
        currentPrice,
        eps,
        forwardEps: quote?.epsForward ?? null,
        per: per === null ? null : Number(per.toFixed(1)),
        forwardPer: quote?.forwardPE ?? null,
        fairPer: null,
        bearTarget: null,
        baseTarget: targetPrice,
        bullTarget: null,
        targetPrice,
        upside: pct(upside),
        view: [
          "API 자동 입력: 현재가와 최근 연간 EPS 기반 PER을 채웠습니다.",
          "애널리스트 목표주가/Forward EPS는 키 없는 공개 API만으로는 안정적으로 제공되지 않아 비워둡니다.",
          "목표주가는 상세 페이지의 밸류에이션 탭에서 직접 판단해 채워주세요.",
        ].join("\n"),
      },
      marketSnapshot: {
        marketCap,
        currency: chartMeta.currency ?? "USD",
        regularMarketPrice: currentPrice,
        fiftyTwoWeekHigh: chartMetrics.high52w ?? null,
        fiftyTwoWeekLow: chartMetrics.low52w ?? null,
        movingAverage200d: chartMetrics.movingAverage200d ?? null,
        return3m: chartMetrics.return3m ?? null,
        return1y: chartMetrics.return1y ?? null,
        distanceFromHigh52w: chartMetrics.distanceFromHigh52w ?? null,
        distanceFromLow52w: chartMetrics.distanceFromLow52w ?? null,
        above200d: chartMetrics.above200d ?? null,
      },
      earningsCatalyst: null,
      analyst: {
        recommendationMean: null,
        recommendationKey: "",
        numberOfAnalystOpinions: null,
      },
      quarterlyData: buildSecQuarterlyRows(facts),
      sec,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ticker,
        error: error instanceof Error ? error.message : "market data fetch failed",
      },
      { status: 502 }
    );
  }
}
