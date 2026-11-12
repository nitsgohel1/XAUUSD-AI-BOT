// Cloudflare Worker: public read-only market-data proxy for the XAUUSD AI Bot.
// Source: Yahoo Finance chart endpoint, symbol GC=F (COMEX gold futures reference).
// This is NOT an Octa XAUUSD spot feed and is not guaranteed real-time.
const ALLOWED_TF = new Set(["5m", "15m", "1h", "4h", "1d", "1w"]);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=15", ...extra }
  });
}
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "GET") return json({ error: "GET only" }, 405);
    if (url.pathname !== "/" && url.pathname !== "/candles") return json({ error: "Use /?tf=15m&limit=300" }, 404);

    const tf = url.searchParams.get("tf") || "15m";
    if (!ALLOWED_TF.has(tf)) return json({ error: "Unsupported timeframe", allowed: [...ALLOWED_TF] }, 400);
    const limit = Math.max(30, Math.min(500, Number.parseInt(url.searchParams.get("limit") || "300", 10) || 300));
    const interval = (tf === "4h" || tf === "1h") ? "60m" : tf === "1w" ? "1wk" : tf;
    const seconds = tf === "5m" ? 300 : tf === "15m" ? 900 : tf === "1h" ? 3600 : tf === "4h" ? 14400 : tf === "1d" ? 86400 : 604800;
    const end = Math.floor(Date.now() / 1000);
    const start = end - Math.ceil(seconds * limit * 1.8);
    const yahoo = new URL("https://query1.finance.yahoo.com/v8/finance/chart/GC=F");
    yahoo.search = new URLSearchParams({
      period1: String(start),
      period2: String(end),
      interval,
      events: "history"
    }).toString();

    try {
      const upstream = await fetch(yahoo.toString(), {
        headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 XAUUSD-AI-BOT market-data proxy" },
        cf: { cacheTtl: 15, cacheEverything: true }
      });
      if (!upstream.ok) return json({ error: "Yahoo Finance upstream error", status: upstream.status }, 502);
      const payload = await upstream.json();
      const result = payload?.chart?.result?.[0];
      if (!result) return json({ error: payload?.chart?.error?.description || "No Yahoo candle data" }, 502);
      const q = result.indicators?.quote?.[0];
      if (!q || !Array.isArray(result.timestamp)) return json({ error: "Yahoo response has no OHLC candles" }, 502);

      let candles = result.timestamp.map((t, i) => {
        const values = [t, q.open?.[i], q.high?.[i], q.low?.[i], q.close?.[i], q.volume?.[i] || 0];
        return values.slice(0, 5).every(v => v !== null && v !== undefined && Number.isFinite(Number(v))) && Number(q.high[i]) >= Number(q.low[i])
          ? [Number(t), Number(q.open[i]), Number(q.high[i]), Number(q.low[i]), Number(q.close[i]), Number(q.volume?.[i] || 0)]
          : null;
      }).filter(Boolean);

      if (tf === "4h") {
        const buckets = new Map();
        for (const c of candles) {
          const key = Math.floor(c[0] / 14400) * 14400;
          const b = buckets.get(key);
          if (!b) buckets.set(key, [key, c[1], c[2], c[3], c[4], c[5]]);
          else { b[2] = Math.max(b[2], c[2]); b[3] = Math.min(b[3], c[3]); b[4] = c[4]; b[5] += c[5]; }
        }
        candles = [...buckets.values()];
      }
      candles = candles.slice(-limit);
      if (candles.length < 30) return json({ error: "Not enough candles returned", count: candles.length }, 502);
      return json({
        candles,
        instrument: "COMEX Gold futures (GC=F) reference for XAUUSD analysis",
        symbol: "GC=F",
        timeframe: tf,
        source: "Yahoo Finance chart data",
        note: "Futures reference, not Octa XAUUSD spot. Provider timing/delay is not guaranteed."
      });
    } catch (error) {
      return json({ error: "Market data request failed", detail: String(error?.message || error) }, 502);
    }
  }
};
