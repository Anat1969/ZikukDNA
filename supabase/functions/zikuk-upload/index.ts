// ZIKUK-DNA — attaches the Midjourney image a visitor made from a genome's prompt.
// Anyone may add the first image to a genome; replacing or removing one needs an admin.
// Capped at HOURLY_LIMIT uploads per hour across the app.
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
const BUCKET = "zikuk-media";
const HOURLY_LIMIT = 30;
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function isAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("x-user-token");
  if (!auth) return false;
  const u = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SERVICE, Authorization: `Bearer ${auth}` } });
  if (!u.ok) return false;
  const email = String((await u.json())?.email ?? "").toLowerCase();
  if (!email) return false;
  const r = await fetch(`${SB_URL}/rest/v1/zikuk_admins?select=email&email=ilike.${encodeURIComponent(email)}`, { headers: SB_HEADERS });
  return r.ok && (await r.json()).length > 0;
}

async function uploadsLastHour(): Promise<number> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const r = await fetch(`${SB_URL}/rest/v1/zikuk_dnas?select=id&mj_uploaded_at=gte.${since}`, {
    method: "HEAD",
    headers: { ...SB_HEADERS, Prefer: "count=exact" },
  });
  return Number((r.headers.get("content-range") ?? "").split("/")[1]) || 0;
}

async function patch(id: string, body: Record<string, unknown>) {
  const r = await fetch(`${SB_URL}/rest/v1/zikuk_dnas?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...SB_HEADERS, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return (await r.json())[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let form: FormData;
  try { form = await req.formData(); } catch { return json({ error: "בקשה לא תקינה" }, 400); }
  const id = String(form.get("dnaId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "גנום לא תקין" }, 400);

  const q = await fetch(`${SB_URL}/rest/v1/zikuk_dnas?select=id,mj_image_url,published&id=eq.${id}`, { headers: SB_HEADERS });
  const [dna] = q.ok ? await q.json() : [];
  if (!dna) return json({ error: "הגנום לא נמצא" }, 404);
  const admin = await isAdmin(req);

  if (form.get("remove") === "1") {
    if (!admin) return json({ error: "רק עורכת יכולה להסיר תמונה" }, 403);
    try { return json({ dna: await patch(id, { mj_image_url: null, mj_uploaded_at: null }) }); }
    catch (e) { return json({ error: String(e) }, 500); }
  }

  if (dna.mj_image_url && !admin) return json({ error: "לגנום הזה כבר יש תמונה. החלפה דורשת כניסת עורכת." }, 403);
  if (!dna.published && !admin) return json({ error: "הגנום לא נמצא" }, 404);
  if (!admin && (await uploadsLastHour()) >= HOURLY_LIMIT) return json({ error: "הועלו הרבה תמונות בשעה האחרונה. נסו שוב מאוחר יותר." }, 429);

  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "לא התקבלה תמונה" }, 400);
  const ext = TYPES[file.type];
  if (!ext) return json({ error: "אפשר להעלות JPG, PNG או WEBP" }, 415);
  if (file.size > MAX_BYTES) return json({ error: "התמונה גדולה מ-10MB" }, 413);

  const path = `mj/${id}-${Date.now()}.${ext}`;
  const up = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...SB_HEADERS, "Content-Type": file.type, "Cache-Control": "31536000" },
    body: await file.arrayBuffer(),
  });
  if (!up.ok) return json({ error: `ההעלאה נכשלה: ${await up.text()}` }, 500);

  try {
    const saved = await patch(id, { mj_image_url: `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`, mj_uploaded_at: new Date().toISOString() });
    return json({ dna: saved });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
