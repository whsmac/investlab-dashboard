const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const ALLOWED_SYMBOLS = [
  // Existing portfolio holdings — keep these enabled.
  "TSLA", "BITU", "TQQQ", "USD", "SOXL",
  // Broad market and market-risk indicators.
  "SPY", "QQQ", "DIA", "IWM", "SOXX", "VIXY", "TLT", "GLD", "USO",
  // Historical market indicator charts.
  "^TNX", "GC=F", "CL=F",
  // Sector ETFs.
  "XLK", "XLF", "XLE", "XLI", "XLY", "XLP",
  "XLV", "XLC", "XLU", "XLB", "XLRE",
  // Representative large-cap companies for the sector heatmap.
  "AAPL", "MSFT", "NVDA", "AVGO",
  "JPM", "BAC",
  "XOM", "CVX",
  "CAT", "GE",
  "AMZN", "TSLA",
  "WMT", "COST",
  "LLY", "JNJ",
  "META", "GOOGL",
  "NEE", "DUK",
  "LIN", "SHW",
  "PLD", "AMT",
];

const CACHE_MS = 5 * 60 * 1000;

type Quote = {
  price: number;
  changePercent: number | null;
  previousClose: number | null;
  fetchedAt: number;
};

const priceCache = new Map<string, Quote>();

async function fetchYahooQuote(symbol: string): Promise<Quote> {
  const cached = priceCache.get(symbol);

  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return cached;
  }

  // Intraday range exposes Yahoo Finance's previous regular-session close.
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/` +
    `${encodeURIComponent(symbol)}?range=1d&interval=1h`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`${symbol}: Yahoo Finance HTTP ${response.status}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  const price = Number(meta?.regularMarketPrice);
  const previousCloseValue = Number(meta?.chartPreviousClose ?? meta?.previousClose);
  const previousClose =
    Number.isFinite(previousCloseValue) && previousCloseValue > 0
      ? previousCloseValue
      : null;
  const changePercent =
    previousClose !== null && Number.isFinite(price) && price > 0
      ? ((price - previousClose) / previousClose) * 100
      : null;

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`${symbol}: 유효한 가격 데이터가 없습니다.`);
  }

  const quote: Quote = {
    price,
    changePercent,
    previousClose,
    fetchedAt: Date.now(),
  };
  priceCache.set(symbol, quote);
  return quote;
}

async function fetchYahooHistory(symbol: string) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/` +
    `${encodeURIComponent(symbol)}?range=5y&interval=1d`;
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`${symbol}: Yahoo Finance HTTP ${response.status}`);
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  const timestamps: number[] = result?.timestamp ?? [];
  const rawCloses: unknown[] = result?.indicators?.quote?.[0]?.close ?? [];
  const series = timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().slice(0, 10),
    value: Number(rawCloses[index]),
  })).filter((point) => Number.isFinite(point.value) && point.value > 0);
  const closes: number[] = series.map((point) => point.value);
  const current = Number(meta?.regularMarketPrice);
  if (!Number.isFinite(current) || current <= 0 || closes.length < 2) {
    throw new Error(`${symbol}: 기간별 시세 데이터가 부족합니다.`);
  }
  const prevCloseValue = Number(meta?.chartPreviousClose ?? meta?.previousClose);
  const base = (tradingDaysAgo: number) => {
    const idx = Math.max(0, closes.length - 1 - tradingDaysAgo);
    return closes[idx];
  };
  const pct = (start: number | null | undefined) =>
    Number.isFinite(Number(start)) && Number(start) > 0
      ? ((current - Number(start)) / Number(start)) * 100
      : null;
  return {
    price: current,
    changes: {
      // Periods used by the market overview.
      week: pct(base(5)),
      month: pct(base(21)),
      year: pct(base(252)),
      threeYears: pct(base(756)),
      // Legacy sector heatmap periods.
      day: pct(Number.isFinite(prevCloseValue) && prevCloseValue > 0 ? prevCloseValue : base(1)),
      sixMonths: pct(base(126)),
    },
    series,
  };
}


async function fetchTqqqDiagnostics(includePrePost: boolean) {
  const query = new URLSearchParams({ range: "1d", interval: "1m" });
  if (includePrePost) query.set("includePrePost", "true");
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/TQQQ?${query.toString()}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    return { ok: false, status: response.status, error: `Yahoo Finance HTTP ${response.status}` };
  }
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta ?? {};
  const timestamps: number[] = result?.timestamp ?? [];
  const closes: unknown[] = result?.indicators?.quote?.[0]?.close ?? [];
  const points = timestamps.map((timestamp, index) => ({
    timestamp,
    isoTime: new Date(timestamp * 1000).toISOString(),
    close: Number.isFinite(Number(closes[index])) ? Number(closes[index]) : null,
  })).slice(-20);
  return {
    ok: true,
    status: response.status,
    request: { range: "1d", interval: "1m", includePrePost },
    meta: {
      currency: meta.currency ?? null,
      exchangeName: meta.exchangeName ?? null,
      instrumentType: meta.instrumentType ?? null,
      regularMarketPrice: meta.regularMarketPrice ?? null,
      regularMarketTime: meta.regularMarketTime ?? null,
      regularMarketPreviousClose: meta.regularMarketPreviousClose ?? null,
      chartPreviousClose: meta.chartPreviousClose ?? null,
      currentTradingPeriod: meta.currentTradingPeriod ?? null,
      dataGranularity: meta.dataGranularity ?? null,
      validRanges: meta.validRanges ?? null,
      preMarketPrice: meta.preMarketPrice ?? null,
      preMarketTime: meta.preMarketTime ?? null,
      postMarketPrice: meta.postMarketPrice ?? null,
      postMarketTime: meta.postMarketTime ?? null,
    },
    timestampCount: timestamps.length,
    firstTimestamp: timestamps.length ? timestamps[0] : null,
    lastTimestamp: timestamps.length ? timestamps[timestamps.length - 1] : null,
    recentPoints: points,
    chartError: data?.chart?.error ?? null,
  };
}


async function fetchYahooTqqqWebDiagnostics() {
  const endpoints = [
    {
      name: "chart-query1-extended",
      url: "https://query1.finance.yahoo.com/v8/finance/chart/TQQQ?range=1d&interval=1m&includePrePost=true",
    },
    {
      name: "chart-query2-extended",
      url: "https://query2.finance.yahoo.com/v8/finance/chart/TQQQ?range=1d&interval=1m&includePrePost=true",
    },
  ];

  const chartResults = await Promise.all(endpoints.map(async (endpoint) => {
    try {
      const response = await fetch(endpoint.url, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        return { name: endpoint.name, ok: false, status: response.status };
      }
      const data = await response.json();
      const result = data?.chart?.result?.[0];
      if (!result) {
        return { name: endpoint.name, ok: false, status: response.status, chartError: data?.chart?.error ?? null };
      }
      const timestamps: number[] = result.timestamp ?? [];
      const closes: unknown[] = result?.indicators?.quote?.[0]?.close ?? [];
      const recentPoints = timestamps.map((timestamp, index) => ({
        timestamp,
        isoTime: new Date(timestamp * 1000).toISOString(),
        close: Number.isFinite(Number(closes[index])) ? Number(closes[index]) : null,
      })).slice(-5);
      return {
        name: endpoint.name,
        ok: true,
        status: response.status,
        regularMarketPrice: result.meta?.regularMarketPrice ?? null,
        regularMarketTime: result.meta?.regularMarketTime ?? null,
        timestampCount: timestamps.length,
        lastTimestamp: timestamps.length ? timestamps[timestamps.length - 1] : null,
        lastIsoTime: timestamps.length ? new Date(timestamps[timestamps.length - 1] * 1000).toISOString() : null,
        recentPoints,
      };
    } catch (error) {
      return { name: endpoint.name, ok: false, error: error instanceof Error ? error.message : "fetch failed" };
    }
  }));

  const pageAttempts = [
    { name: "quote-page", url: "https://finance.yahoo.com/quote/TQQQ/" },
    { name: "quote-page-query", url: "https://finance.yahoo.com/quote/TQQQ/?guccounter=1" },
    { name: "chart-page", url: "https://finance.yahoo.com/chart/TQQQ" },
  ];
  const pageResults = await Promise.all(pageAttempts.map(async (attempt) => {
    try {
      const response = await fetch(attempt.url, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Encoding": "identity",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(15000),
      });
      const html = await response.text();
      const scripts: Array<Record<string, unknown>> = [];
      const scriptRegex = /<script\b([^>]*data-sveltekit-fetched[^>]*)>([\s\S]*?)<\/script>/gi;
      let match: RegExpExecArray | null;
      while ((match = scriptRegex.exec(html)) !== null) {
        const attrs = match[1];
        const dataUrl = attrs.match(/data-url="([^"]+)"/i)?.[1]?.replace(/&amp;/g, "&") ?? null;
        let wrapper: any = null;
        let parsedBody: any = null;
        try {
          wrapper = JSON.parse(match[2]);
          if (typeof wrapper?.body === "string") {
            try { parsedBody = JSON.parse(wrapper.body); } catch { /* keep wrapper summary */ }
          }
        } catch { /* ignore non-JSON script */ }
        const bodyText = typeof wrapper?.body === "string" ? wrapper.body : "";
        const overnightKeys = ["overnightPrice", "overnightMarketPrice", "overnightChange", "overnightChangePercent", "boats"];
        const foundKeys = overnightKeys.filter((key) => bodyText.toLowerCase().includes(key.toLowerCase()));
        const sparkItems = parsedBody?.spark?.result ?? [];
        const tqqqSpark = sparkItems.find((item: any) => item?.symbol === "TQQQ");
        const sparkResponse = tqqqSpark?.response?.[0];
        const timestamps = sparkResponse?.timestamp ?? [];
        const closes = sparkResponse?.indicators?.quote?.[0]?.close ?? [];
        scripts.push({
          dataUrl,
          wrapperStatus: wrapper?.status ?? null,
          bodyLength: bodyText.length,
          foundOvernightKeys: foundKeys,
          sparkSymbol: tqqqSpark?.symbol ?? null,
          sparkTimestampCount: timestamps.length,
          sparkLastTime: timestamps.length ? new Date(timestamps[timestamps.length - 1] * 1000).toISOString() : null,
          sparkLastPrice: timestamps.length ? closes[closes.length - 1] ?? null : null,
          parsedTopLevelKeys: parsedBody && typeof parsedBody === "object" ? Object.keys(parsedBody).slice(0, 12) : [],
        });
      }
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.slice(0, 200) ?? null;
      return {
        name: attempt.name,
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get("content-type"),
        htmlLength: html.length,
        title,
        embeddedScriptCount: scripts.length,
        embeddedScripts: scripts.slice(0, 20),
        htmlContainsOvernight: /overnightPrice|overnightMarketPrice|BOATS|Blue Ocean/i.test(html),
        error: null,
      };
    } catch (error) {
      return { name: attempt.name, ok: false, error: error instanceof Error ? error.message : "fetch failed" };
    }
  }));
  const pageDiagnostics = { attempts: pageResults };

  const apiEndpoints = [
    {
      name: "spark-query1",
      url: "https://query1.finance.yahoo.com/v7/finance/spark?symbols=TQQQ&range=1d&interval=1m",
    },
    {
      name: "spark-query2",
      url: "https://query2.finance.yahoo.com/v7/finance/spark?symbols=TQQQ&range=1d&interval=1m",
    },
    {
      name: "quote-query1-overnight",
      url: "https://query1.finance.yahoo.com/v7/finance/quote?symbols=TQQQ&overnightPrice=true&formatted=true&lang=en-US&region=US",
    },
    {
      name: "quoteType-query1-overnight",
      url: "https://query1.finance.yahoo.com/v1/finance/quoteType/TQQQ?formatted=true&enablePrivateCompany=true&overnightPrice=true&lang=en-US&region=US",
    },
  ];
  const apiResults = await Promise.all(apiEndpoints.map(async (endpoint) => {
    try {
      const response = await fetch(endpoint.url, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(12000),
      });
      const raw = await response.text();
      let body: any = null;
      try { body = JSON.parse(raw); } catch { /* keep response summary */ }
      const spark = body?.spark?.result?.find((item: any) => item?.symbol === "TQQQ") ?? null;
      const sparkResponse = spark?.response?.[0] ?? null;
      const sparkTimestamp = sparkResponse?.timestamp ?? [];
      const sparkClose = sparkResponse?.indicators?.quote?.[0]?.close ?? [];
      const quote = body?.quoteResponse?.result?.[0] ?? null;
      const quoteType = body?.quoteType?.result?.[0] ?? null;
      return {
        name: endpoint.name,
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get("content-type"),
        responseLength: raw.length,
        spark: sparkResponse ? {
          symbol: spark.symbol,
          meta: spark.meta ?? null,
          timestampCount: sparkTimestamp.length,
          lastTimestamp: sparkTimestamp.length ? sparkTimestamp[sparkTimestamp.length - 1] : null,
          lastIsoTime: sparkTimestamp.length ? new Date(sparkTimestamp[sparkTimestamp.length - 1] * 1000).toISOString() : null,
          recentPoints: sparkTimestamp.slice(-5).map((timestamp: number, index: number) => ({
            timestamp,
            isoTime: new Date(timestamp * 1000).toISOString(),
            close: sparkClose[index] ?? null,
          })),
        } : null,
        quote: quote ? {
          symbol: quote.symbol ?? null,
          regularMarketPrice: quote.regularMarketPrice ?? null,
          regularMarketTime: quote.regularMarketTime ?? null,
          marketState: quote.marketState ?? null,
          postMarketPrice: quote.postMarketPrice ?? null,
          postMarketTime: quote.postMarketTime ?? null,
          overnightPrice: quote.overnightPrice ?? null,
          overnightChange: quote.overnightChange ?? null,
          overnightChangePercent: quote.overnightChangePercent ?? null,
          rawKeys: Object.keys(quote),
        } : null,
        quoteType: quoteType ? {
          symbol: quoteType.symbol ?? null,
          quoteType: quoteType.quoteType ?? null,
          exchange: quoteType.exchange ?? null,
          overnightPrice: quoteType.overnightPrice ?? null,
          overnightChange: quoteType.overnightChange ?? null,
          overnightChangePercent: quoteType.overnightChangePercent ?? null,
          rawKeys: Object.keys(quoteType),
        } : null,
        error: body?.finance?.error?.description ?? body?.quoteResponse?.error?.description ?? body?.quoteType?.error?.description ?? null,
        bodyPreview: !body ? raw.slice(0, 500) : null,
      };
    } catch (error) {
      return { name: endpoint.name, ok: false, error: error instanceof Error ? error.message : "fetch failed" };
    }
  }));

  return {
    diagnostic: "Yahoo Finance TQQQ overnight-source comparison",
    fetchedAt: new Date().toISOString(),
    charts: chartResults,
    apiEndpoints: apiResults,
    quotePage: pageDiagnostics,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "POST 요청만 허용됩니다." },
      { status: 405, headers: corsHeaders },
    );
  }

  try {
    const body = await req.json();

    // Opt-in diagnostic modes; normal dashboard requests are unchanged.
    if (body?.debugTqqqWeb === true) {
      return Response.json(await fetchYahooTqqqWebDiagnostics(), { headers: corsHeaders });
    }

    // Compare Yahoo's standard chart response with its pre/post-market response.
    if (body?.debugTqqq === true) {
      const [standard, extended] = await Promise.all([
        fetchTqqqDiagnostics(false),
        fetchTqqqDiagnostics(true),
      ]);
      return Response.json(
        {
          diagnostic: "TQQQ Yahoo Finance chart API",
          fetchedAt: new Date().toISOString(),
          standard,
          includePrePost: extended,
        },
        { headers: corsHeaders },
      );
    }
    const requested = Array.isArray(body?.symbols)
      ? body.symbols
      : ALLOWED_SYMBOLS;

    const symbols = [
      ...new Set(
        requested.filter(
          (s: unknown): s is string =>
            typeof s === "string" && ALLOWED_SYMBOLS.includes(s),
        ),
      ),
    ];

    if (symbols.length === 0 && body?.includeFx !== true) {
      return Response.json(
        { error: "조회할 종목이 없습니다." },
        { status: 400, headers: corsHeaders },
      );
    }

    const quotes: Record<string, {
      price: number;
      changePercent: number | null;
      previousClose: number | null;
    }> = {};
    const errors: Record<string, string> = {};

    for (const symbol of symbols) {
      try {
        const quote = await fetchYahooQuote(symbol);
        quotes[symbol] = {
          price: quote.price,
          changePercent: quote.changePercent,
          previousClose: quote.previousClose,
        };
      } catch (error) {
        errors[symbol] = error instanceof Error
          ? error.message
          : "시세 조회 실패";
      }
    }

    let fx: number | null = null;

    if (body?.includeHistory === true) {
      const historySymbols = symbols.filter((symbol) =>
        !["BITU", "TQQQ", "USD", "SOXL"].includes(symbol)
      );
      const historyResults = await Promise.all(historySymbols.map(async (symbol) => {
        try {
          const history = await fetchYahooHistory(symbol);
          return { symbol, history, error: null };
        } catch (error) {
          return { symbol, history: null, error: error instanceof Error ? error.message : "기간별 시세 조회 실패" };
        }
      }));
      for (const item of historyResults) {
        if (item.history && quotes[item.symbol]) {
          (quotes[item.symbol] as any).periodChanges = item.history.changes;
          if (["^TNX", "GC=F", "CL=F"].includes(item.symbol)) {
            (quotes[item.symbol] as any).chartHistory = item.history.series;
          }
        } else if (item.error) {
          errors[item.symbol + ":history"] = item.error;
        }
      }
    }

    if (body?.includeFx === true) {
      try {
        fx = (await fetchYahooQuote("USDKRW=X")).price;
      } catch (error) {
        errors["USDKRW=X"] = error instanceof Error
          ? error.message
          : "환율 조회 실패";
      }
    }

    if (Object.keys(quotes).length === 0 && fx === null) {
      return Response.json(
        {
          error: "시세를 가져오지 못했습니다.",
          quotes,
          errors,
          source: "Yahoo Finance",
          fetchedAt: new Date().toISOString(),
        },
        { status: 502, headers: corsHeaders },
      );
    }

    return Response.json(
      {
        quotes,
        fx,
        errors,
        source: "Yahoo Finance",
        fetchedAt: new Date().toISOString(),
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error
          ? error.message
          : "요청 처리에 실패했습니다.",
      },
      { status: 400, headers: corsHeaders },
    );
  }
});
