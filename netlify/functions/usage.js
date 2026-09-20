// Falo · medidor de uso do Azure Speech (para monitorar a franquia grátis)
// GET  -> { month, used, limit, pct }  (segundos de áudio usados no mês)
// POST { seconds } -> soma ao contador do mês e devolve o total
// Guarda o contador no Netlify Blobs (grátis, persistente). Serve só para
// SABERMOS quando estamos chegando no limite grátis (5h/mês do tier F0).
const { getStore } = require("@netlify/blobs");

const FREE_LIMIT = 5 * 3600; // 5 horas de áudio por mês = 18000 s (tier grátis F0)
const json = (o, code) => ({
  statusCode: code || 200,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(o),
});

exports.handler = async (event) => {
  try {
    const store = getStore("falo-usage");
    const month = new Date().toISOString().slice(0, 7); // AAAA-MM
    const key = "audio-seconds-" + month;

    if (event.httpMethod === "POST") {
      let secs = 0;
      try { secs = Number(JSON.parse(event.body || "{}").seconds) || 0; } catch (e) {}
      secs = Math.max(0, Math.min(secs, 120)); // limita 1 chamada a no máx 2 min (anti-abuso)
      const cur = parseFloat((await store.get(key)) || "0") || 0;
      const next = cur + secs;
      await store.set(key, String(next));
      return json({ month, used: Math.round(next), limit: FREE_LIMIT, pct: +(next / FREE_LIMIT).toFixed(4) });
    }

    const cur = parseFloat((await store.get(key)) || "0") || 0;
    return json({ month, used: Math.round(cur), limit: FREE_LIMIT, pct: +(cur / FREE_LIMIT).toFixed(4) });
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
};
