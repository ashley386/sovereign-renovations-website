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

// ---------- Email (Resend). Off until RESEND_API_KEY is set in Netlify. ----------
const SITE = "https://sovereign-renovations.com"
function owner() { return (Netlify.env.get("PORTAL_NOTIFY") || "ashley@sovereign-renovations.com").trim() }
function escHtml(s: string) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)) }
function htmlOf(text: string) {
  const body = escHtml(text).replace(/(https:\/\/[^\s<]+)/g, '<a href="$1" style="color:#8a6a3c">$1</a>').replace(/\n/g, "<br>")
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2b2620;font-size:16px;line-height:1.55">` +
    `<p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8a6a3c;margin:0 0 18px">Sovereign Renovations</p>${body}` +
    `<p style="font-size:12px;color:#8f897e;margin-top:28px;border-top:1px solid #e6dfd2;padding-top:12px">Sovereign Renovations &middot; Raleigh, NC &middot; ${SITE}</p></div>`
}
async function sendEmail(to: string[], subject: string, text: string, replyTo?: string) {
  const key = Netlify.env.get("RESEND_API_KEY")
  if (!key) return { sent: false, reason: "email-not-set-up" }
  const from = Netlify.env.get("PORTAL_FROM") || "Sovereign Renovations <portal@sovereign-renovations.com>"
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text, html: htmlOf(text), reply_to: replyTo || owner() }),
  })
  const j = await r.json().catch(() => ({}))
  return r.ok ? { sent: true, id: (j as any).id } : { sent: false, reason: (j as any).message || `status-${r.status}` }
}
// Notice to Ashley about something the client did. Never blocks the client's save if email fails.
async function noticeToOwner(context: Context, subject: string, text: string, clientEmail: string) {
  const job = sendEmail([owner()], subject, text + `\n\nOpen the admin portal: ${SITE}/portal/admin-home.html`, clientEmail).catch(() => null)
  try { (context as any).waitUntil ? (context as any).waitUntil(job) : await job } catch { await job }
}
async function recipients(project: string) {
  const clients = ((await store().get("clients", { type: "json" })) || {}) as Record<string, { project: string; name?: string }>
  return Object.entries(clients).filter(([, c]) => c.project === project).map(([email, c]) => ({ email, name: c.name || "" }))
}

async function clientChangeNotice(context: Context, id: string, section: string, before: any, after: any, me: { email: string; name: string }, get: (s: string) => Promise<any>) {
  const who = me.name || me.email
  if (section === "choices") {
    const prev = before || {}, next = after || {}
    const boards = boardsForClient(await get("boards")) as { id: string; name: string; options: { id: string; letter: string; name: string; upgrade: number }[] }[]
    const lines: string[] = []
    for (const b of boards) {
      if (next[b.id] === undefined || next[b.id] === prev[b.id]) continue
      const o = b.options.find((x) => x.id === next[b.id]) || (typeof next[b.id] === "number" ? b.options[next[b.id]] : undefined)
      if (!o) continue
      lines.push(`- ${b.name}: Option ${o.letter}, ${o.name}${o.upgrade ? ` (upgrade +$${o.upgrade.toLocaleString("en-US")}, approved as a change order)` : " (included)"}`)
    }
    if (lines.length) await noticeToOwner(context, `${who} made a selection`, `${who} chose:\n${lines.join("\n")}\n\nSee the boards: ${SITE}/portal/admin-boards.html`, me.email)
  }
  if (section === "clientFiles" || section === "clientDates") {
    const seen = new Set((Array.isArray(before) ? before : []).map((x: unknown) => JSON.stringify(x)))
    const added = (Array.isArray(after) ? after : []).filter((x: unknown) => !seen.has(JSON.stringify(x)))
    if (!added.length) return
    const lines = section === "clientFiles"
      ? added.map((f: any) => `- ${f.name}${f.note ? ` ("${f.note}")` : ""}${f.url ? ` ${SITE}${f.url}` : ""}`)
      : added.map((d: any) => `- ${d.what}: ${d.from}${d.to && d.to !== d.from ? " to " + d.to : ""}${d.note ? ` ("${d.note}")` : ""}`)
    await noticeToOwner(context, section === "clientFiles" ? `${who} uploaded ${added.length === 1 ? "a file" : added.length + " files"}` : `${who} added a date to work around`, lines.join("\n"), me.email)
  }
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
      await noticeToOwner(context, `Contract signed: ${typed}`, `${typed} (${me.email}) signed the contract for project "${id}" on ${sig.stamp}.\n\nThe terms are now locked.`, me.email)
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
      if (!isAdmin) await noticeToOwner(context, `New message from ${msg.name}${msg.topic ? " (" + msg.topic + ")" : ""}`, `${msg.name} wrote:\n\n${t}\n\nReply in the portal: ${SITE}/portal/admin-messages.html`, me.email)
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

    // GET /api/portal/project/:id/recipients  (admin) -> who client emails go to
    if (req.method === "GET" && parts[2] === "recipients") {
      if (!isAdmin) return json({ error: "forbidden" }, 403)
      return json({ recipients: await recipients(id), emailReady: !!Netlify.env.get("RESEND_API_KEY") })
    }

    // POST /api/portal/project/:id/notify  { kind, subject, text }  (admin) -> email the project's client(s), after Ashley previewed it
    if (req.method === "POST" && parts[2] === "notify") {
      if (!isAdmin) return json({ error: "forbidden" }, 403)
      const { kind, subject, text } = await req.json().catch(() => ({}))
      const subj = String(subject || "").trim().slice(0, 200), body = String(text || "").trim().slice(0, 10000)
      if (!subj || !body) return json({ error: "subject-and-text-required" }, 400)
      const to = (await recipients(id)).map((r) => r.email)
      if (!to.length) return json({ error: "no-client-invited" }, 409)
      const result = await sendEmail(to, subj, body, me.email)
      const log = ((await get("emailLog")) || []) as unknown[]
      log.push({ at: new Date().toISOString(), by: me.email, kind: String(kind || ""), to, subject: subj, ...result })
      await store().setJSON(`${key}/emailLog`, log.slice(-200))
      return json({ ok: result.sent, ...result, to }, result.sent ? 200 : 502)
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

      const before = !isAdmin && ["choices", "clientFiles", "clientDates"].includes(section) ? await get(section) : null
      if (value === null) await store().delete(`${key}/${section}`)
      else await store().setJSON(`${key}/${section}`, value)
      await touch(section)
      if (!isAdmin) await clientChangeNotice(context, id, section, before, value, me, get)
      return json({ ok: true })
    }
    return json({ error: "method" }, 405)
  }

  // GET /api/portal/identity-check  (admins only) -> can the server manage sign-ins? (read-only probe)
  if (parts[0] === "identity-check" && req.method === "GET") {
    if (me.role !== "admin") return json({ error: "forbidden" }, 403)
    const cfg = getIdentityConfig() as { url: string; token?: string } | null
    if (!cfg?.token) return json({ token: false, url: cfg?.url || null })
    const r = await fetch(`${cfg.url}/admin/users?per_page=1&page=1`, { headers: { Authorization: `Bearer ${cfg.token}` } })
    const j = await r.json().catch(() => ({}))
    return json({ token: true, url: cfg.url, status: r.status, keys: Object.keys(j || {}), sample: Array.isArray((j as any).users) ? Object.keys((j as any).users[0] || {}) : null })
  }

  // POST /api/portal/test-email  (admins only) -> one test notice to Ashley's inbox, nobody else
  if (parts[0] === "test-email" && req.method === "POST") {
    if (me.role !== "admin") return json({ error: "forbidden" }, 403)
    const r = await sendEmail([owner()], "Portal email test", `This is a test from your client portal, sent by ${me.email}.\n\nIf you're reading this, email notices are working. Client activity (messages, signatures, selections, uploads and dates) will now email you here.`)
    return json({ to: owner(), ...r }, r.sent ? 200 : 502)
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
