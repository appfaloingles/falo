// Falo · Azure Speech token issuer
// Entrega um TOKEN temporário (~10 min) para o navegador usar o Azure Speech
// (reconhecimento de fala + nota de pronúncia) SEM NUNCA expor a chave.
// A chave fica só aqui no servidor, na variável de ambiente AZURE_SPEECH_KEY.
exports.handler = async () => {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || "brazilsouth";
  const noStore = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (!key) {
    return { statusCode: 500, headers: noStore, body: JSON.stringify({ error: "missing_key" }) };
  }
  try {
    const r = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      { method: "POST", headers: { "Ocp-Apim-Subscription-Key": key, "Content-Length": "0" } }
    );
    if (!r.ok) {
      return { statusCode: r.status, headers: noStore, body: JSON.stringify({ error: "azure_" + r.status }) };
    }
    const token = await r.text();
    return { statusCode: 200, headers: noStore, body: JSON.stringify({ token, region }) };
  } catch (e) {
    return { statusCode: 500, headers: noStore, body: JSON.stringify({ error: String(e && e.message || e) }) };
  }
};
