// Global leaderboard for Dodge the Darios.
// GET  /scores        -> top 10 (best score per name)
// POST /scores {name, score, seconds, kills} -> { rank, top }

const ALLOWED_ORIGINS = ["https://arjunkshah12345-hash.github.io", "http://localhost:8787", "http://127.0.0.1:8787"];
const TOP_SQL = `SELECT name, MAX(score) AS score, seconds, kills FROM scores GROUP BY name ORDER BY score DESC LIMIT 10`;

function cors(req) {
  const origin = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
const json = (req, body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors(req) } });

async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function cleanName(raw) {
  if (typeof raw !== "string") return null;
  const name = raw.normalize("NFKC").replace(/[^\p{L}\p{N} _.\-!?']/gu, "").replace(/\s+/g, " ").trim().slice(0, 16);
  return name.length ? name : null;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
    if (url.pathname !== "/scores") return json(req, { error: "not found" }, 404);

    if (req.method === "GET") {
      const { results } = await env.DB.prepare(TOP_SQL).all();
      return json(req, { top: results });
    }

    if (req.method === "POST") {
      let body;
      try { body = await req.json(); } catch { return json(req, { error: "bad json" }, 400); }
      const name = cleanName(body.name);
      const score = Math.floor(Number(body.score)), seconds = Math.floor(Number(body.seconds)), kills = Math.floor(Number(body.kills) || 0);
      if (!name) return json(req, { error: "name required" }, 400);
      // Loose plausibility check. Scores are client-reported, so this only stops the laziest cheating.
      if (!Number.isFinite(score) || !Number.isFinite(seconds) || score < 1 || seconds < 3 || seconds > 7200 || kills < 0 ||
          score > seconds * 300 + 1000) return json(req, { error: "score rejected" }, 422);

      const ipHash = await sha256((req.headers.get("CF-Connecting-IP") || "unknown") + "|dario-salt");
      const now = Date.now();
      const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE ip_hash = ? AND created_at > ?").bind(ipHash, now - 60_000).first();
      if (recent.n >= 5) return json(req, { error: "slow down" }, 429);

      await env.DB.prepare("INSERT INTO scores (name, score, seconds, kills, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(name, score, seconds, kills, ipHash, now).run();
      const [rankRow, top] = await env.DB.batch([
        env.DB.prepare("SELECT COUNT(*) + 1 AS rank FROM (SELECT MAX(score) AS s FROM scores GROUP BY name) WHERE s > ?").bind(score),
        env.DB.prepare(TOP_SQL),
      ]);
      return json(req, { rank: rankRow.results[0].rank, top: top.results });
    }
    return json(req, { error: "method not allowed" }, 405);
  },
};
