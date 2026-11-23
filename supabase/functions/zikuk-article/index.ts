// ZIKUK-DNA — writes the magazine article that tells the story of a distilled idea,
// and, every few stories, a synthesis article across all of them.
// Writing method "מתובנה לתובנה": chapters that each end in one insight, then an
// insight drawn only from placing those insights side by side.
// Modes: { dnaId } writes a story (once per genome; an admin may rewrite it),
//        { mode: "synthesis" } (admin, or internal after every SYNTH_EVERY stories).
import Anthropic from "npm:@anthropic-ai/sdk";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SB_HEADERS = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const HOURLY_LIMIT = 30;
const SYNTH_EVERY = 4;
const GENE_LABEL: Record<string, string> = { form: "צורה", material: "חומר", light: "אור", color: "צבע", movement: "תנועה", time: "זמן" };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title_light", "title_bold", "lede", "chapters", "meta_insight", "meta_explain", "steps", "question"],
  properties: {
    title_light: { type: "string" },
    title_bold: { type: "string" },
    lede: { type: "string" },
    chapters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "body", "insight"],
        properties: { heading: { type: "string" }, body: { type: "string" }, insight: { type: "string" } },
      },
    },
    meta_insight: { type: "string" },
    meta_explain: { type: "string" },
    steps: { type: "array", items: { type: "string" } },
    question: { type: "string" },
  },
};

const METHOD = `שיטת הכתיבה "מתובנה לתובנה" של זיקוק DNA.
כתבה מספרת איך רעיון גולמי הפך לקוד עיצובי, ומה אפשר ללמוד מהדרך. היא לא מתארת את הגנום, היא חושבת דרכו.

מבנה:
- title_light: השורה הראשונה של הכותרת, דקה: דימוי מוחשי, 2 עד 4 מילים.
- title_bold: השורה השנייה, מודגשת: הטענה, 2 עד 5 מילים.
- lede: פתיח של 2 עד 3 משפטים. נפתח ברגע מוחשי או בתמונה, לא בהגדרה.
- chapters: כל פרק 70 עד 120 מילים, דימוי מוחשי אחד, ונגמר ב-insight.
  insight: משפט אחד, טענה שאפשר להתווכח איתה. לא סיכום של הפרק ולא חזרה על הכותרת.
- meta_insight: התובנה מתובנות. מניחים את תובנות הפרקים זו לצד זו ושואלים מה נראה רק מהחיבור ביניהן. משפט אחד, חד, שלא נמצא באף פרק לבדו.
- meta_explain: 2 עד 3 משפטים שמראים מאילו תובנות היא נולדה, עם הפניה למספרי הפרקים ("מפרק 02 ומפרק 04...").
- steps: שלושה צעדים ממוספרים למה זה אומר לתכנון, לעיצוב או למדיניות. כל צעד פעולה שאפשר לעשות.
- question: שאלה אחת פתוחה לקורא, שממשיכה את החשיבה.

כללי ניסוח:
עברית טבעית, תקינה וקצרה. לא פיוטית, לא מתורגמת ולא מליצית. בלי סימני קריאה, בלי אימוג'י, בלי קלישאות ("בעולם המשתנה", "לא רק... אלא גם").
גוף שלישי או ראשון רבים. משפטים קצרים, פועל חזק.
מזכירים רק אנשים, מבנים, מקומות ויצירות אמיתיים, ושם מקום כתוב בעברית ובלועזית. בלי ציטוטים מומצאים ובלי נתונים שאי אפשר לאמת.`;

const STORY_CHAPTERS = `פרקי סיפור הזיקוק, בסדר הזה:
01 "החומר הגולמי": מאיפה הרעיון בא, מה נאמר בו ומה נשאר לא אמור.
02 "מה מתחת": המהות, הבעיה או האמת שמתחת לרעיון.
03 "המתח": שני הקטבים, ואיך הם נראים במרחב, בחומר ובאור.
04 "הקוד": הגנים הדומיננטיים כעדות. לא רשימה, אלא מה הם אומרים יחד, ואיזה גן חלש ולמה זה חשוב.
05 "השושלת" רק בהכלאה או במוטציה: מה עבר בירושה, מה השתנה, ומה נולד שלא היה בהורים.
heading של כל פרק: השם הקבוע שלו.`;

const SYNTH_CHAPTERS = `כתבת "מבט על הגנום": סינתזה של כל סיפורי הזיקוק.
- מקבצים את הזיקוקים ל-3 עד 5 אשכולות לפי קרבה של מהות ומתח, לא לפי נושא שטחי. כל אשכול הוא פרק.
- heading: שם האשכול, 2 עד 4 מילים. body מזכיר את הזיקוקים בשמם ומסביר מה מחבר ביניהם ובמה הם שונים.
- insight של כל פרק נגזר מתובנות הכתבות שבאשכול, לא מחזר אותן.
- meta_insight: התובנה מכל התובנות, מה שנראה רק כשמסתכלים על כל האוסף.
- steps: שלושה צעדים למה האוסף כולו אומר לתכנון ולעיצוב.`;

function anthropicKeys(): string[] {
  const keys: string[] = [];
  const add = (v?: string) => {
    const t = v?.trim().replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "").replace(/\s+/g, "");
    if (t && !keys.includes(t)) keys.push(t);
  };
  add(Deno.env.get("ANTHROPIC_API_KEY"));
  for (const name of Object.keys(Deno.env.toObject())) {
    if (/^SUPABASE_/i.test(name) || !/anthropic|claude/i.test(name)) continue;
    add(Deno.env.get(name));
  }
  return keys;
}

async function write(system: string, userText: string, effort = "medium"): Promise<Record<string, unknown>> {
  const keys = anthropicKeys();
  if (!keys.length) throw new Error("מפתח Claude לא מוגדר בשרת.");
  let authFailed = false;
  for (const apiKey of keys) {
    try {
      const response = await new Anthropic({ apiKey }).beta.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system,
        output_config: { effort, format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: userText }],
      } as never);
      if (response.stop_reason === "refusal") throw new Error("הכתיבה נדחתה.");
      const text = response.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
      return JSON.parse(text);
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) { authFailed = true; continue; }
      if (err instanceof Anthropic.RateLimitError) throw new Error("עומס זמני, נסו שוב בעוד דקה.");
      if (err instanceof Anthropic.APIError) { console.error(`Claude API ${err.status}: ${err.message}`); throw new Error("שירות הכתיבה לא זמין כרגע."); }
      throw err;
    }
  }
  throw new Error(authFailed ? "מפתח Claude בשרת אינו תקף." : "הכתיבה נכשלה.");
}

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { ...SB_HEADERS, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  if (!r.ok) throw new Error(await r.text());
  return r.status === 204 ? null : r.json();
}

async function isAdmin(req: Request): Promise<boolean> {
  const token = req.headers.get("x-user-token");
  if (!token) return false;
  const u = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SERVICE, Authorization: `Bearer ${token}` } });
  if (!u.ok) return false;
  const email = String((await u.json())?.email ?? "").toLowerCase();
  if (!email) return false;
  const rows = await rest(`zikuk_admins?select=email&email=ilike.${encodeURIComponent(email)}`);
  return rows.length > 0;
}

async function writtenLastHour(): Promise<number> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const r = await fetch(`${SB_URL}/rest/v1/zikuk_articles?select=id&updated_at=gte.${since}`, { method: "HEAD", headers: { ...SB_HEADERS, Prefer: "count=exact" } });
  return Number((r.headers.get("content-range") ?? "").split("/")[1]) || 0;
}

type Gene = { key: string; value: string; intensity: number; note: string };
type Dna = { id: string; kind: string; lens: string | null; title: string; source_input: string | null; distillation: string; essence: string; tension: string; genes: Gene[]; description_he: string; parent_ids: string[] };

const dnaBrief = (d: Dna) => [
  `שם: ${d.title}`,
  d.lens ? `עדשה: ${d.lens}` : "",
  d.source_input ? `הרעיון הגולמי: ${d.source_input}` : "",
  `משפט זיקוק: ${d.distillation}`,
  `מהות: ${d.essence}`,
  `מתח: ${d.tension}`,
  `גנים: ${(d.genes ?? []).map((g) => `${GENE_LABEL[g.key] ?? g.key} ${g.intensity}: ${g.value} (${g.note})`).join("; ")}`,
  d.description_he ? `תיאור: ${d.description_he}` : "",
].filter(Boolean).join("\n");

const clean = (a: Record<string, unknown>) => ({
  title_light: String(a.title_light ?? "").trim(),
  title_bold: String(a.title_bold ?? "").trim(),
  lede: a.lede,
  chapters: (Array.isArray(a.chapters) ? a.chapters : []).slice(0, 6),
  meta_insight: a.meta_insight,
  meta_explain: a.meta_explain,
  steps: (Array.isArray(a.steps) ? a.steps : []).slice(0, 4),
  question: a.question,
  updated_at: new Date().toISOString(),
});

async function writeStory(dnaId: string, rewrite: boolean) {
  const [dna] = await rest(`zikuk_dnas?select=id,kind,lens,title,source_input,distillation,essence,tension,genes,description_he,parent_ids,published&id=eq.${dnaId}`);
  if (!dna) throw Object.assign(new Error("הגנום לא נמצא"), { status: 404 });
  const [existing] = await rest(`zikuk_articles?select=*&dna_id=eq.${dnaId}`);
  if (existing && !rewrite) return { article: existing, created: false };

  const parents: Dna[] = dna.parent_ids?.length
    ? await rest(`zikuk_dnas?select=id,kind,lens,title,source_input,distillation,essence,tension,genes,description_he,parent_ids&id=in.(${dna.parent_ids.join(",")})`)
    : [];
  const lineage = parents.length
    ? `\n\nזה גנום מסוג ${dna.kind === "hybrid" ? "הכלאה" : "מוטציה"}. ההורים:\n${parents.map((p, i) => `הורה ${i + 1}:\n${dnaBrief(p)}`).join("\n\n")}\nכתבו גם את פרק 05 "השושלת".`
    : "\n\nזה זיקוק ראשוני, בלי פרק 05.";
  const a = await write(`${METHOD}\n\n${STORY_CHAPTERS}`, `כתבו את סיפור הזיקוק של הגנום הזה.\n\n${dnaBrief(dna)}${lineage}`);
  const row = { ...clean(a), kind: "story", dna_id: dnaId, dna_ids: [dnaId, ...parents.map((p) => p.id)], published: dna.published };
  const [saved] = existing
    ? await rest(`zikuk_articles?id=eq.${existing.id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) })
    : await rest("zikuk_articles", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
  return { article: saved, created: !existing };
}

async function writeSynthesis() {
  const stories = await rest(`zikuk_articles?select=dna_id,title_light,title_bold,meta_insight,chapters&kind=eq.story&published=eq.true&order=created_at`);
  if (stories.length < 2) throw Object.assign(new Error("צריך לפחות שתי כתבות לסינתזה"), { status: 400 });
  const dnas: Dna[] = await rest(`zikuk_dnas?select=id,title,distillation,tension&id=in.(${stories.map((s: { dna_id: string }) => s.dna_id).join(",")})`);
  const brief = stories.map((s: { dna_id: string; title_light: string; title_bold: string; meta_insight: string; chapters: { insight: string }[] }, i: number) => {
    const d = dnas.find((x) => x.id === s.dna_id);
    return `${i + 1}. "${d?.title ?? s.title_bold}": ${d?.distillation ?? ""}\nמתח: ${d?.tension ?? ""}\nתובנות הפרקים: ${s.chapters.map((c) => c.insight).join(" | ")}\nתובנה מתובנות: ${s.meta_insight}`;
  }).join("\n\n");
  const a = await write(`${METHOD}\n\n${SYNTH_CHAPTERS}`, `אלה ${stories.length} סיפורי הזיקוק עד עכשיו:\n\n${brief}`, "high");
  const row = { ...clean(a), kind: "synthesis", dna_ids: stories.map((s: { dna_id: string }) => s.dna_id), published: true };
  const [saved] = await rest("zikuk_articles", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
  return saved;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: { dnaId?: string; mode?: string; rewrite?: boolean };
  try { body = await req.json(); } catch { return json({ error: "בקשה לא תקינה" }, 400); }

  // Internal calls (from zikuk-distill) carry the service key.
  const internal = req.headers.get("authorization") === `Bearer ${SERVICE}`;
  const admin = internal || (await isAdmin(req));
  if (!admin && (await writtenLastHour()) >= HOURLY_LIMIT) return json({ error: "נכתבו הרבה כתבות בשעה האחרונה. נסו שוב מאוחר יותר." }, 429);

  try {
    if (body.mode === "synthesis") {
      if (!admin) return json({ error: "סינתזה ידנית שמורה לעורכת" }, 403);
      return json({ article: await writeSynthesis() });
    }
    const id = String(body.dnaId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "גנום לא תקין" }, 400);
    const { article, created } = await writeStory(id, !!body.rewrite && admin);
    if (created) {
      // Once SYNTH_EVERY stories were added since the last synthesis, a new one is written in the background.
      const stories = await rest(`zikuk_articles?select=id&kind=eq.story&published=eq.true`);
      const [last] = await rest(`zikuk_articles?select=dna_ids&kind=eq.synthesis&order=created_at.desc&limit=1`);
      if (stories.length >= 2 && stories.length - (last?.dna_ids?.length ?? 0) >= SYNTH_EVERY) {
        EdgeRuntime.waitUntil(writeSynthesis().catch((e) => console.error(`synthesis: ${e}`)));
      }
    }
    return json({ article });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    return json({ error: (e as Error).message || "הכתיבה נכשלה" }, status);
  }
});
