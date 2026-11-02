// Website photos for the homepage "What we do" carousels (and later the Gallery).
//   GET    /api/site-photos              -> { services: { kitchenRemodel: [ {id|url, alt} ], ... } }   (public)
//   GET    /api/site-photos/img/:id      -> the image                                                   (public)
//   POST   /api/site-photos/upload       multipart: file, service                                       (admins)
//   PUT    /api/site-photos/:service     body: [ {id|url, alt} ]  (new order / removals)                 (admins)
import { getUser } from "@netlify/identity"
import { getStore } from "@netlify/blobs"
import type { Config } from "@netlify/functions"

const SERVICES = ["kitchenRemodel", "bathrooms", "laundry", "featureWall", "aLaCarte"]
const store = () => getStore({ name: "site-photos", consistency: "strong" })
const json = (b: unknown, status = 200, cache = "no-store") =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json", "Cache-Control": cache } })

async function isAdmin() {
  const u = await getUser()
  const list = (Netlify.env.get("PORTAL_ADMINS") || "ashley@sovereign-renovations.com,greg@sovereign-renovations.com")
    .split(",").map((s) => s.trim().toLowerCase())
  return !!(u && u.email && list.includes(u.email.toLowerCase()))
}
async function manifest(): Promise<Record<string, Array<Record<string, string>>>> {
  return ((await store().get("manifest", { type: "json" })) || {}) as Record<string, Array<Record<string, string>>>
}

export default async (req: Request) => {
  const parts = new URL(req.url).pathname.replace(/^\/api\/site-photos\/?/, "").split("/").filter(Boolean)

  if (req.method === "GET" && parts[0] === "img" && parts[1]) {
    const id = parts[1].replace(/[^a-z0-9-]/gi, "")
    const r = await store().getWithMetadata(`img/${id}`, { type: "arrayBuffer" })
    if (!r) return new Response("Not found", { status: 404 })
    return new Response(r.data as ArrayBuffer, {
      headers: { "Content-Type": String((r.metadata as Record<string, unknown>)?.type || "image/jpeg"), "Cache-Control": "public, max-age=31536000, immutable" },
    })
  }

  if (req.method === "GET" && !parts.length) {
    return json({ services: await manifest() }, 200, "public, max-age=30")
  }

  if (!(await isAdmin())) return json({ error: "forbidden" }, 403)

  if (req.method === "POST" && parts[0] === "upload") {
    const form = await req.formData()
    const file = form.get("file") as File | null
    const service = String(form.get("service") || "")
    if (!file || !SERVICES.includes(service)) return json({ error: "bad-input" }, 400)
    if (!/^image\//.test(file.type)) return json({ error: "not-an-image" }, 400)
    if (file.size > 5_500_000) return json({ error: "too-large" }, 413)
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    await store().set(`img/${id}`, await file.arrayBuffer(), { metadata: { type: file.type, name: file.name, service } })
    const m = await manifest()
    m[service] = [...(m[service] || []), { id, alt: String(form.get("alt") || "") }]
    await store().setJSON("manifest", m)
    return json({ ok: true, id, list: m[service] })
  }

  if (req.method === "PUT" && SERVICES.includes(parts[0])) {
    const list = await req.json()
    if (!Array.isArray(list)) return json({ error: "bad-input" }, 400)
    const clean = list.slice(0, 40).map((x: Record<string, unknown>) =>
      x.id ? { id: String(x.id).replace(/[^a-z0-9-]/gi, ""), alt: String(x.alt || "") } : { url: String(x.url || ""), alt: String(x.alt || "") })
      .filter((x) => (x as Record<string, string>).id || /^https:\/\//.test((x as Record<string, string>).url))
    const m = await manifest()
    const removed = (m[parts[0]] || []).filter((o) => o.id && !clean.some((c) => (c as Record<string, string>).id === o.id))
    m[parts[0]] = clean as Array<Record<string, string>>
    await store().setJSON("manifest", m)
    await Promise.all(removed.map((o) => store().delete(`img/${o.id}`)))
    return json({ ok: true, list: m[parts[0]] })
  }

  return json({ error: "not-found" }, 404)
}

export const config: Config = { path: ["/api/site-photos", "/api/site-photos/*"] }
