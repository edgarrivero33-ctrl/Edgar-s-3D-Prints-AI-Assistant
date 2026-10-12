const PROFILE_URL = "https://www.facebook.com/marketplace/profile/100002822624353/";
const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const CATALOG = __CATALOG_JSON__;
const page = __PAGE_JSON__;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
function previewReply(message, quote) {
  const q = message.toLowerCase();
  const item = CATALOG.find(p => q.includes(p.name.toLowerCase().replace(" (2003)", "")) || q.includes(p.name.toLowerCase().replace(" · team edition", "")));
  if (/measure|size|fit|head circumference/.test(q)) return "Use a soft tape around the widest part of your head, about an inch above your eyebrows and ears. Keep it level and snug without pulling tight, then send the measurement in inches or centimeters. The seller can confirm the best fit before production. For reference, the usual sizing guidance is about 23–25 inches for adults and 22–23 inches for kids.";
  if (/custom|team|color|logo|visor|mesh|tint|led|stand/.test(q)) return "Customization depends on the build. Current examples include Spider-Man with an optional $15 stand, Doctor Doom with an LED option ($100 / $130), Daft Punk visors in mesh or tinted finishes, and Iron Man team colors for NFL, NCAA, or MLB designs. Tell me which helmet and detail you want, and I can help draft the request.";
  if (/ship|shipping|deliver|pickup|lead|time|when/.test(q)) return "Production timing and delivery or pickup details should be confirmed with the seller when you message. The current listing notes about 10 days of production for the Predator helmet; other timing may vary by build.";
  if (item) return item.name + " is listed at " + item.price + ". " + item.details + ". Want me to add it to your quote draft?";
  if (/price|cost|how much|budget/.test(q)) return "Some current starting prices: Spider-Man BND $120 (+$15 for the stand), Batman $130, Deadpool $140, Predator $260, and Iron Man team helmets $180. Tell me which design you’re considering and I’ll check its options.";
  if (quote && quote.length) return "You’re drafting a quote for " + quote.map(x => x.name).join(", ") + ". Share your head circumference, finish or visor preference, and when you need it. I’ll help organize the details before you message through Marketplace.";
  return "I can help you compare the listed builds, understand sizing, or put together a custom request. Which character or style are you interested in? Current examples include Spider-Man, Deadpool, Batman, Predator, Doctor Doom, Magneto, Iron Man team designs, and Daft Punk.";
}
async function chat(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Please send a valid chat message." }, 400); }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 1800) : "";
  if (!message) return json({ error: "Message is required." }, 400);
  const history = Array.isArray(body.history) ? body.history.slice(-10).filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string").map(m => ({ role: m.role, content: m.content.slice(0, 1800) })) : [];
  const quote = Array.isArray(body.quote) ? body.quote.slice(0, 4) : [];
  if ((env.AI && typeof env.AI.run === "function") || (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_AI_TOKEN)) {
    try {
      const system = "You are Mask Maker Studio's friendly sales assistant for a small maker selling custom 3D printed cosplay helmets and props through Facebook Marketplace. Help buyers choose, understand fit and options, and prepare a concise quote request. Be clear that all items are made to order. Never claim checkout, payment, ordering, shipping, or direct Marketplace messaging is integrated; direct customers to the Marketplace profile for final confirmation. Do not invent availability, materials, shipping terms, exact fit guarantees, or lead times. Prices are USD and are current reference prices, not guaranteed final quotes. Catalog: " + JSON.stringify(CATALOG) + ". Size guidance: head circumference around 23–25 inches adult, 22–23 inches kids. For sizing, tell buyers to measure around the widest head circumference above eyebrows and ears. Predator currently notes roughly 10 days production. Ask a short follow-up when information is missing. Quote draft: " + JSON.stringify(quote);
      const messages = [{ role: "system", content: system }, ...history];
      let result;
      if (env.AI && typeof env.AI.run === "function") {
        result = await env.AI.run(MODEL, { messages, max_tokens: 320 });
      } else {
        const response = await fetch("https://api.cloudflare.com/client/v4/accounts/" + encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID) + "/ai/run/" + MODEL, {
          method: "POST",
          headers: { "authorization": "Bearer " + env.CLOUDFLARE_AI_TOKEN, "content-type": "application/json" },
          body: JSON.stringify({ messages, max_tokens: 320 })
        });
        if (!response.ok) throw new Error("Workers AI request failed");
        const payload = await response.json();
        result = payload && payload.result;
      }
      const reply = result && (result.response || result.result);
      if (typeof reply === "string" && reply.trim()) return json({ reply: reply.trim(), mode: "workers-ai" });
    } catch (e) { /* Keep the catalog helper usable when the AI binding is unavailable. */ }
  }
  return json({ reply: previewReply(message, quote), mode: "preview" });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return new Response(page, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } });
    if (request.method === "GET" && url.pathname === "/api/health") {
      const ai = !!((env.AI && typeof env.AI.run === "function") || (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_AI_TOKEN));
      return json({ ai, mode: ai ? "workers-ai" : "preview", model: MODEL });
    }
    if (request.method === "POST" && url.pathname === "/api/chat") return chat(request, env);
    if (request.method === "GET" && url.pathname === "/api/catalog") return json({ products: CATALOG, profile: PROFILE_URL });
    return new Response("Not found", { status: 404 });
  }
};
