// Falo · Azure Speech token issuer (Cloudflare Pages Function)
// Rota: /api/token
// Entrega um TOKEN temporario (~10 min) para o navegador usar o Azure Speech
// (reconhecimento de fala + nota de pronuncia) SEM NUNCA expor a chave.
// A chave fica so aqui no servidor, na variavel de ambiente AZURE_SPEECH_KEY.
export async function onRequest(context) {
  const key = context.env.AZURE_SPEECH_KEY;
  const region = context.env.AZURE_SPEECH_REGION || "brazilsouth";
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (!key) {
    return new Response(JSON.stringify({ error: "missing_key" }), { status: 500, headers });
  }
  try {
    const r = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      { method: "POST", headers: { "Ocp-Apim-Subscription-Key": key, "Content-Length": "0" } }
    );
    if (!r.ok) {
      return new Response(JSON.stringify({ error: "azure_" + r.status }), { status: r.status, headers });
    }
    const token = await r.text();
    return new Response(JSON.stringify({ token, region }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers });
  }
}
