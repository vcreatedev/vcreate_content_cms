// Vercel serverless function: proxies to the Anthropic Messages API. Needs ANTHROPIC_API_KEY in Vercel env vars.
const BRAND = `You work inside vcreate Studio, the content tool of vcreate, a web design studio for small businesses in Andhra Pradesh and Telangana (Instagram @vcreatewebsites). Voice: friendly, clear, practical, plain English with light Telugu-context warmth, no hype, no emojis overload. Never mention other brands. Never invent client names or results.`;

const SYSTEM = {
  create: `${BRAND} Task: generate new social content ideas. Reply with ONLY a JSON array. Each item: {"title": string, "platform": "Instagram"|"Facebook"|"YouTube"|"LinkedIn"|"WhatsApp"|"Website", "type": "Post"|"Carousel"|"Reel"|"Story"|"Video"|"Blog"|"Poster", "caption": string, "notes": string}.`,
  edit: `${BRAND} Task: edit one content item following the user's instruction. Reply with ONLY a JSON object: {"title": string, "caption": string, "notes": string}. Keep what the instruction does not ask to change.`,
  schedule: `${BRAND} Task: build a posting schedule. You get today's date and a list of items. Spread them sensibly (max 1 post per platform per day, best days Tue-Sat, avoid clustering). Reply with ONLY a JSON array: [{"id": string, "date": "YYYY-MM-DD", "reason": string}] covering every item given.`,
  poster: `${BRAND} Task: write copy for a social media poster. Reply with ONLY a JSON object: {"headline": string (max 8 words), "subline": string (max 16 words), "cta": string (max 4 words), "theme": "dark"|"light"|"indigo", "caption": string}. Do not describe or draw any logo.`,
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: "ANTHROPIC_API_KEY is not set in Vercel. Add it in Project Settings → Environment Variables, then redeploy." });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const { task, prompt } = body || {};
  if (!SYSTEM[task] || typeof prompt !== "string" || !prompt.trim() || prompt.length > 12000) return res.status(400).json({ error: "Bad request" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5", max_tokens: 3000, system: SYSTEM[task], messages: [{ role: "user", content: prompt }] }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || "Claude API error" });
    const text = (j.content || []).map((b) => b.text || "").join("");
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(502).json({ error: "Could not reach Claude: " + e.message });
  }
};
