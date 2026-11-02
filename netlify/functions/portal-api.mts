// Client portal API. Every request is checked against Netlify Identity:
//  - admins (emails in PORTAL_ADMINS) can read and change any project
//  - clients can read their own project (minus anything internal) and change only the parts a client is allowed to change
// Project data lives in the Netlify Blobs store "portal", one entry per section: project/{id}/{section}.
// Uploaded files live in the store "portal-files": {project}/{fileId}.
import { getUser, getIdentityConfig } from "@netlify/identity"
import { getStore } from "@netlify/blobs"
import type { Config, Context } from "@netlify/functions"

// Sections a client may overwrite directly.
const CLIENT_WRITE = ["choices", "choiceDates", "upgrades", "clientDates", "clientFiles"]
// Sections a client may read (boards and contract are filtered first).
const CLIENT_READ = [...CLIENT_WRITE, "boards", "contract", "contractSignature", "messages", "dates", "visibility", "files", "invoices", "changeOrders"]
// Sections an admin may overwrite directly. Signatures and messages only change through their own endpoints.
const ADMIN_WRITE = [...CLIENT_WRITE, "boards", "dates", "visibility", "files", "invoices", "contract", "changeOrders", "info", "todos", "messages"]

const MARKUP = 1.25
const MAX_FILE = 5_500_000

const store = () => getStore({ name: "portal", consistency: "strong" })
const files = () => getStore({ name: "portal-files", consistency: "strong" })
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } })
const clean = (s: string) => s.replace(/[^a-z0-9-]/gi, "").toLowerCase()
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

function admins(): string[] {
  return (Netlify.env.get("PORTAL_ADMINS") || "ashley@sovereign-renovations.com,greg@sovereign-renovations.com").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
}

async function whoAmI() {
  const user = await getUser()
  if (!user || !user.email) return null
  const email = user.email.toLowerCase()
  if (admins().includes(email)) return { email, name: user.name || "", role: "admin" as const, project: null as string | null }
  const clients = ((await store().get("clients", { type: "json" })) || {}) as Record<string, { project: string; name?: string }>
  const c = clients[email]
  return { email, name: user.name || c?.name || "", role: c ? ("client" as const) : ("none" as const), project: c?.project || null }
}

type Opt = { id?: string; letter?: string; name?: string; details?: string; vendor?: string; link?: string; qty?: number; cost?: number; photo?: string; bg?: string }
type Board = { id: string; name?: string; group?: string; due?: string; limit?: number; range?: string; showRange?: boolean; note?: string; status?: string; options?: Opt[] }

// What a client sees of a board: only boards that were sent, no costs, vendors or links, just the upgrade amount.
function boardsForClient(boards: unknown): unknown[] {
  if (!Array.isArray(boards)) return []
  return (boards as Board[]).filter((b) => b && b.status === "sent").map((b) => ({
    id: b.id, name: b.name || "", group: b.group || "", due: b.due || "", note: b.note || "",
    range: b.showRange ? b.range || "" : "",
    options: (b.options || []).map((o) => {
      const price = (Number(o.cost) || 0) * MARKUP * (Number(o.qty) || 1)
      const limit = Number(b.limit) || 0
      const over = limit > 0 ? Math.max(0, Math.round(price - limit)) : 0
      return { id: o.id, letter: o.letter || "", name: o.name || "", details: o.details || "", photo: o.photo || "", bg: o.bg || "", upgrade: over }
    }),
  }))
}

// Fingerprint of the contract terms, saved with the signature so any later change is detectable.
async function fingerprint(v: unknown) {
  const data = new TextEncoder().encode(JSON.stringify(v))
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("")
}
function easternDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(d)
}
function easternStamp(d = new Date()) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(d)
}

export default async (req: Request, context: Context) => {
  const me = await whoAmI()
  if (!me) return json({ error: "signed-out" }, 401)
  const parts = new URL(req.url).pathname.replace(/^\/api\/portal\/?/, "").split("/").filter(Boolean)

  // GET /api/portal/me
  if (parts[0] === "me") return json(me)

  // /api/portal/project/:id[/...]
  if (parts[0] === "project" && parts[1]) {
    const id = clean(parts[1])
    if (me.role !== "admin" && me.project !== id) return json({ error: "forbidden" }, 403)
    const isAdmin = me.role === "admin"
    const key = `project/${id}`
    const get = (section: string) => store().get(`${key}/${section}`, { type: "json" }) as Promise<any>
    const touch = (section: string) => store().setJSON(`${key}/updated`, { at: new Date().toISOString(), by: me.email, section })

    // GET /api/portal/project/:id  -> every section this person may see
    if (req.method === "GET" && !parts[2]) {
      const doc: Record<string, unknown> = { id }
      const { blobs } = await store().list({ prefix: key + "/" })
      await Promise.all(blobs.map(async (b) => {
        const section = b.key.slice(key.length + 1)
        if (!isAdmin && !CLIENT_READ.includes(section)) return
        const v = await store().get(b.key, { type: "json" })
        if (v !== null) doc[section] = v
      }))
      if (!isAdmin) {
        doc.boards = boardsForClient(doc.boards)
        const c = doc.contract as { status?: string } | undefined
        if (c && c.status !== "sent" && c.status !== "signed") delete doc.contract
      }
      return json(doc)
    }

    // POST /api/portal/project/:id/sign  { name, agree }  -> the homeowner signs the contract
    if (req.method === "POST" && parts[2] === "sign") {
      if (me.role !== "client") return json({ error: "only-the-homeowner-signs" }, 403)
      const { name, agree } = await req.json().catch(() => ({}))
      const typed = String(name || "").trim().slice(0, 120)
      if (!typed || agree !== true) return json({ error: "name-and-agreement-required" }, 400)
      const contract = await get("contract")
      if (!contract || contract.status !== "sent") return json({ error: "nothing-to-sign" }, 409)
      if (await get("contractSignature")) return json({ error: "already-signed" }, 409)
      const now = new Date()
      const sig = {
        name: typed, email: me.email, date: easternDate(now), stamp: easternStamp(now), at: now.toISOString(),
        ip: context.ip || "", agent: (req.headers.get("user-agent") || "").slice(0, 200),
        terms: await fingerprint(contract.f || contract),
      }
      await store().setJSON(`${key}/contractSignature`, sig)
      await store().setJSON(`${key}/contract`, { ...contract, status: "signed" })
      await touch("contractSignature")
      return json({ ok: true, signature: sig })
    }

    // POST /api/portal/project/:id/messages  { text }  -> add a message to the thread
    if (req.method === "POST" && parts[2] === "messages") {
      const { text, topic } = await req.json().catch(() => ({}))
      const t = String(text || "").trim().slice(0, 5000)
      if (!t) return json({ error: "empty" }, 400)
      const list = ((await get("messages")) || []) as unknown[]
      const msg = { id: rid(), from: isAdmin ? "admin" : "client", email: me.email, name: me.name || me.email.split("@")[0], topic: String(topic || "").slice(0, 60), text: t, at: new Date().toISOString() }
      list.push(msg)
      await store().setJSON(`${key}/messages`, list)
      await touch("messages")
      return json({ ok: true, message: msg, messages: list })
    }

    // POST /api/portal/project/:id/upload  (raw file body, X-File-Name header)
    if (req.method === "POST" && parts[2] === "upload") {
      const buf = await req.arrayBuffer()
      if (!buf.byteLength) return json({ error: "empty" }, 400)
      if (buf.byteLength > MAX_FILE) return json({ error: "too-large", max: MAX_FILE }, 413)
      const name = decodeURIComponent(req.headers.get("x-file-name") || "file").replace(/[\\/]/g, "_").slice(0, 150)
      const type = (req.headers.get("content-type") || "application/octet-stream").slice(0, 100)
      const fid = rid()
      const meta = { id: fid, name, type, size: buf.byteLength, by: me.email, role: me.role, at: new Date().toISOString() }
      await files().set(`${id}/${fid}`, buf, { metadata: meta })
      return json({ ok: true, file: { ...meta, url: `/api/portal/project/${id}/file/${fid}` } })
    }

    // GET /api/portal/project/:id/file/:fid  -> the uploaded file
    if (req.method === "GET" && parts[2] === "file" && parts[3]) {
      const fid = clean(parts[3])
      const r = await files().getWithMetadata(`${id}/${fid}`, { type: "arrayBuffer" })
      if (!r) return json({ error: "not-found" }, 404)
      const m = r.metadata as { name?: string; type?: string }
      return new Response(r.data, { headers: {
        "Content-Type": m.type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${String(m.name || "file").replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      } })
    }

    // PUT /api/portal/project/:id/:section
    if (req.method === "PUT" && parts[2]) {
      const section = parts[2]
      const allowed = isAdmin ? ADMIN_WRITE : CLIENT_WRITE
      if (!allowed.includes(section)) return json({ error: "forbidden-section" }, 403)
      const body = await req.text()
      if (body.length > 400_000) return json({ error: "too-large" }, 413)
      let value: any
      try { value = JSON.parse(body) } catch { return json({ error: "bad-json" }, 400) }

      if (section === "contract") {
        const signed = await get("contractSignature")
        if (signed && value !== null) {
          // Once the homeowner signs, the terms are locked. The page may still save its copy; keep the signed status.
          const current = await get("contract")
          if (current && JSON.stringify(current.f) === JSON.stringify(value.f)) return json({ ok: true, locked: true })
          return json({ error: "signed-contract-is-locked" }, 409)
        }
        if (value === null) await store().delete(`${key}/contractSignature`) // voiding the contract voids its signature
        else if (value.status === "signed") value.status = "sent"             // only a real signature can mark it signed
      }

      if (value === null) await store().delete(`${key}/${section}`)
      else await store().setJSON(`${key}/${section}`, value)
      await touch(section)
      return json({ ok: true })
    }
    return json({ error: "method" }, 405)
  }

  // POST /api/portal/invite  { email, name, project }  (admins only)
  if (parts[0] === "invite" && req.method === "POST") {
    if (me.role !== "admin") return json({ error: "forbidden" }, 403)
    const { email, name, project } = await req.json()
    const e = String(email || "").trim().toLowerCase()
    const p = clean(String(project || ""))
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || !p) return json({ error: "bad-input" }, 400)
    const clients = ((await store().get("clients", { type: "json" })) || {}) as Record<string, unknown>
    clients[e] = { project: p, name: String(name || ""), invitedBy: me.email, invitedAt: new Date().toISOString() }
    await store().setJSON("clients", clients)
    const cfg = getIdentityConfig() as { url: string; token?: string } | null
    if (!cfg?.token) return json({ ok: true, invited: false, note: "Saved. Send the invite from the Netlify Identity page." })
    const r = await fetch(`${cfg.url}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify({ email: e, data: { full_name: String(name || "") } }),
    })
    return json({ ok: true, invited: r.ok, status: r.status })
  }

  return json({ error: "not-found" }, 404)
}

export const config: Config = { path: "/api/portal/*" }
