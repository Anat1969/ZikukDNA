// ZIKUK-DNA — distills a raw idea into its design DNA: one distillation sentence,
// six genes, a palette, a Hebrew Midjourney prompt and a generated 1:1 image.
// Modes: distill (free text), hybrid (two parents crossed), mutation (one gene pushed).
// Text: Claude (ANTHROPIC_API_KEY). Image: fal.ai (FAL_API_KEY), copied into the
// zikuk-media bucket. Open to every visitor, capped at HOURLY_LIMIT per hour.
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SB_HEADERS = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const BUCKET = "zikuk-media";
const HOURLY_LIMIT = 20;

const LENSES = ["אדריכלות", "עיר ומרחב", "רעיון ותודעה", "חומר ואובייקט", "טבע ונוף", "אמנות ותרבות"];
const GENES = [
  { key: "form", label: "צורה" },
  { key: "material", label: "חומר" },
  { key: "light", label: "אור" },
  { key: "color", label: "צבע" },
  { key: "movement", label: "תנועה" },
  { key: "time", label: "זמן" },
];
const MANDATORY = "Documentary realism, Professional architecture photography, 1:1";
const MJ_NEG = "--no text, words, writing, frame divisions";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lens", "title", "distillation", "essence", "tension", "genes", "palette", "magic_words", "description_he", "prompt_he", "prompt_en", "next_prompt"],
  properties: {
    lens: { type: "string", enum: LENSES },
    title: { type: "string" },
    distillation: { type: "string" },
    essence: { type: "string" },
    tension: { type: "string" },
    genes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "value", "intensity", "note"],
        properties: {
          key: { type: "string", enum: GENES.map((g) => g.key) },
          value: { type: "string" },
          intensity: { type: "integer" },
          note: { type: "string" },
        },
      },
    },
    palette: { type: "array", items: { type: "string" } },
    magic_words: { type: "array", items: { type: "string" } },
    description_he: { type: "string" },
    prompt_he: { type: "string" },
    prompt_en: { type: "string" },
    next_prompt: { type: "string" },
  },
};

const SYSTEM = `את/ה "מזקק ה-DNA": אדריכל/ית ומעצב/ת שמזקק/ת כל רעיון גולמי לקוד הגנטי העיצובי שלו.
המטרה: לא לקשט, אלא לחשוף את המהות, ולתרגם אותה לשפה חזותית שאפשר לבנות ממנה.
עברית טבעית, תקינה, קצרה ומקצועית. לא פיוטית ולא מתורגמת. בלי סימני קריאה, בלי אימוג'י, בלי חיצים.

שדות:
- lens: העדשה המתאימה ביותר מתוך: ${LENSES.join(", ")}.
- title: שם קצר לגנום, 2 עד 4 מילים.
- distillation: משפט זיקוק אחד, עד 18 מילים, שאומר מה הרעיון באמת.
- essence: משפט אחד: הבעיה או האמת שמתחת לרעיון.
- tension: הניגוד המרכזי בניסוח "בין ___ ל___".
- genes: בדיוק שישה גנים, אחד לכל מפתח: ${GENES.map((g) => `${g.key} (${g.label})`).join(", ")}.
  value: ביטוי מוחשי של 2 עד 6 מילים (לא "אור יפה" אלא "אור מתפזר דרך סבכת בטון").
  intensity: 0 עד 100, כמה הגן הזה דומיננטי בזהות של הרעיון.
  note: משפט קצר: למה הגן הזה כאן.
- palette: ארבעה צבעי hex שנגזרים מהרעיון, מהכהה לבהיר.
- magic_words: 2 עד 3 פעלי חשיבה מתוך: זקק, חלץ, פענח, סנתז, מפה, חשוף, בחן, התווה. רק כאלה שמשנים את החשיבה על הרעיון הזה.
- description_he: 2 עד 3 שורות: התחושה, ואיך המתח משתקף בצורה, בנפח, בחומר, בצבע, בפתחים, במעברים, באור ובקומפוזיציה.
- prompt_he: פרומפט למידג'רני בעברית בלבד, שורה אחת רציפה, בסדר: מושג חזותי מרכזי, סגנון אדריכלי, חומר ומרקם, מקור אור ואיכותו, כלל קומפוזיציה, פלטה, אווירה, ניגוד, זווית מצלמה, שעה ביום. כל פרט תורם לתמונה. בלי פרמטרים ובלי שלילות, הם יתווספו אוטומטית.
- prompt_en: אותו פרומפט באנגלית, למחולל התמונות. בלי אנשים בפוקוס, בלי טקסט.
- next_prompt: פרומפט המשך מוכן להעתקה ל-Claude, 2 עד 4 משפטים, שמשתמש במילות הקסם שבחרת כדי להעמיק או לממש את הרעיון (למשל להפוך אותו לפרוגרמה, לחומר, למדיניות או למבנה).

מזכירים רק אנשים, מבנים ויצירות אמיתיים. בלי נתונים שאי אפשר לאמת.`;

async function createdLastHour(): Promise<number> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const r = await fetch(`${SB_URL}/rest/v1/zikuk_dnas?select=id&created_at=gte.${since}`, {
    method: "HEAD",
    headers: { ...SB_HEADERS, Prefer: "count=exact" },
  });
  const range = r.headers.get("content-range") ?? "";
  return Number(range.split("/")[1]) || 0;
}

function falKey(): string | undefined {
  const direct = Deno.env.get("FAL_API_KEY")?.trim();
  if (direct) return direct;
  for (const name of Object.keys(Deno.env.toObject())) {
    if (!/fal/i.test(name) || /^SUPABASE_/i.test(name)) continue;
    const v = Deno.env.get(name)?.trim();
    if (v) return v;
  }
}

async function makeImage(prompt: string, id: string): Promise<string | null> {
  const key = falKey();
  if (!key) return null;
  const full = `${prompt}. ${MANDATORY}, natural light, no text, no words, no writing, no frame divisions.`;
  for (const [endpoint, body] of [
    ["https://fal.run/fal-ai/nano-banana-2", { prompt: full, aspect_ratio: "1:1" }],
    ["https://fal.run/fal-ai/flux/schnell", { prompt: full, image_size: "square_hd", num_inference_steps: 4, num_images: 1 }],
  ] as const) {
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) continue;
      const data = await r.json();
      const url = data?.images?.[0]?.url;
      if (!url) continue;
      const img = await fetch(url);
      if (!img.ok) return url;
      const type = img.headers.get("content-type") ?? "image/jpeg";
      const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
      const path = `dna/${id}.${ext}`;
      const up = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: "POST",
        headers: { ...SB_HEADERS, "Content-Type": type, "x-upsert": "true", "Cache-Control": "31536000" },
        body: await img.arrayBuffer(),
      });
      return up.ok ? `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}` : url;
    } catch (_) { /* try next */ }
  }
  return null;
}

type Dna = { id: string; title: string; distillation: string; tension: string; genes: { key: string; value: string; intensity: number }[]; source_input: string | null };

async function loadParents(ids: string[]): Promise<Dna[]> {
  const clean = ids.filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 2);
  if (!clean.length) return [];
  const r = await fetch(
    `${SB_URL}/rest/v1/zikuk_dnas?select=id,title,distillation,tension,genes,source_input&id=in.(${clean.join(",")})`,
    { headers: SB_HEADERS },
  );
  const rows: Dna[] = r.ok ? await r.json() : [];
  return clean.map((id) => rows.find((x) => x.id === id)).filter(Boolean) as Dna[];
}

const describe = (d: Dna) =>
  `"${d.title}": ${d.distillation} מתח: ${d.tension}. גנים: ${d.genes.map((g) => `${g.key}=${g.value} (${g.intensity})`).join("; ")}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if ((await createdLastHour()) >= HOURLY_LIMIT) {
    return json({ error: "נוצרו הרבה זיקוקים בשעה האחרונה. נסו שוב מאוחר יותר." }, 429);
  }

  let body: { mode?: string; input?: string; lens?: string; parentIds?: string[]; gene?: string; direction?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const mode = body.mode === "hybrid" || body.mode === "mutation" ? body.mode : "distill";
  const input = String(body.input ?? "").trim().slice(0, 4000);

  let userText = "";
  let parents: Dna[] = [];
  if (mode === "distill") {
    if (!input) return json({ error: "צריך לכתוב רעיון לזיקוק." }, 400);
    const lens = LENSES.includes(String(body.lens)) ? `העדשה שנבחרה: ${body.lens}.\n` : "";
    userText = `${lens}הרעיון הגולמי: ${input}`;
  } else if (mode === "hybrid") {
    parents = await loadParents(body.parentIds ?? []);
    if (parents.length !== 2) return json({ error: "צריך לבחור שני גנומים להכלאה." }, 400);
    userText = `הכלאה: צרו גנום חדש שיורש מכל הורה את הגנים החזקים שלו, ומייצר מתח חדש שלא היה באף אחד מהם.\nהורה א: ${describe(parents[0])}\nהורה ב: ${describe(parents[1])}${input ? `\nכוונה להכלאה: ${input}` : ""}\nהשם צריך להעיד על הצאצא, לא לחבר את שמות ההורים.`;
  } else {
    parents = await loadParents(body.parentIds ?? []);
    const gene = GENES.find((g) => g.key === body.gene);
    if (parents.length !== 1 || !gene) return json({ error: "צריך גנום וגן למוטציה." }, 400);
    const dir = body.direction === "down" ? "להחליש עד כמעט היעלמות" : "להקצין עד שיהפוך לגן המוביל";
    userText = `מוטציה: קחו את הגנום הבא ו${dir} את גן ה${gene.label}. שאר הגנים נשארים קרובים למקור, אבל הזהות כולה משתנה בהתאם. הסבירו בזיקוק מה השתנה.\nהמקור: ${describe(parents[0])}${input ? `\nכוונה: ${input}` : ""}`;
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")?.trim();
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY is not configured" }, 500);
  const client = new Anthropic({ apiKey });

  let dna: Record<string, unknown>;
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 12000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: userText }],
    } as never);
    if (response.stop_reason === "refusal") return json({ error: "הבקשה נדחתה. נסו ניסוח אחר." }, 422);
    const text = response.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
    dna = JSON.parse(text);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: "עומס זמני, נסו שוב בעוד דקה." }, 429);
    if (err instanceof Anthropic.APIError) return json({ error: `Claude API ${err.status}: ${err.message}` }, 502);
    return json({ error: String(err) }, 500);
  }

  // Normalize genes: exactly one per key, in canonical order, intensity clamped.
  const raw = Array.isArray(dna.genes) ? dna.genes as { key: string; value: string; intensity: number; note: string }[] : [];
  const genes = GENES.map((g) => {
    const f = raw.find((x) => x.key === g.key);
    return { key: g.key, label: g.label, value: f?.value ?? "", intensity: Math.max(0, Math.min(100, Math.round(Number(f?.intensity ?? 50)))), note: f?.note ?? "" };
  });
  const palette = (Array.isArray(dna.palette) ? dna.palette as string[] : []).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 4);
  const promptHe = `${String(dna.prompt_he ?? "").trim().replace(/[.,\s]+$/, "")}, ${MANDATORY} ${MJ_NEG}`;

  const id = crypto.randomUUID();
  const image_url = await makeImage(String(dna.prompt_en ?? dna.title), id);

  const row = {
    id,
    kind: mode,
    lens: LENSES.includes(String(dna.lens)) ? dna.lens : null,
    title: dna.title,
    source_input: input || null,
    distillation: dna.distillation,
    essence: dna.essence,
    tension: dna.tension,
    genes,
    palette,
    magic_words: Array.isArray(dna.magic_words) ? (dna.magic_words as string[]).slice(0, 3) : [],
    description_he: dna.description_he,
    prompt_he: promptHe,
    prompt_en: dna.prompt_en,
    next_prompt: dna.next_prompt,
    image_url,
    parent_ids: parents.map((p) => p.id),
  };
  const ins = await fetch(`${SB_URL}/rest/v1/zikuk_dnas`, {
    method: "POST",
    headers: { ...SB_HEADERS, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!ins.ok) return json({ error: `שמירה נכשלה: ${await ins.text()}` }, 500);
  const [saved] = await ins.json();
  return json({ dna: saved });
});
