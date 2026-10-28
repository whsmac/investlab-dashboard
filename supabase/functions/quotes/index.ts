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
  // Sector ETFs.
  "XLK", "XLF", "XLE", "XLI", "XLY", "XLP",
  "XLV", "XLC", "XLU", "XLB", "XLRE",
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

  // Five daily candles provide a more reliable previous-close reference
  // than relying on a single intraday candle.
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/` +
    `${encodeURIComponent(symbol)}?range=5d&interval=1d`;

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
