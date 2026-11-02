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
const CLIENT_READ = [...CLIENT_WRITE, "meta", "boards", "contract", "contractSignature", "messages", "dates", "visibility", "files", "invoices", "changeOrders"]
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
  const body = escHtml(text)
    .replace(/^(https:\/\/\S+#setup=[a-f0-9]+)$/m, '<a href="$1" style="display:inline-block;background:#1e1a14;color:#ffffff;padding:13px 24px;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;letter-spacing:.14em;text-transform:uppercase">Set up my portal</a>').replace(/(^|[\s>])(https:\/\/[^\s<"]+)/g, '$1<a href="$2" style="color:#8a6a3c">$2</a>').replace(/\n/g, "<br>")
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

// ---------- Sign-in accounts (Netlify Identity admin) ----------
function identity() { return getIdentityConfig() as { url: string; token?: string } | null }
async function idFetch(path: string, init: RequestInit = {}) {
  const cfg = identity(); if (!cfg?.token) throw new Error("identity-admin-unavailable")
  return fetch(`${cfg.url}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.token}`, ...(init.headers || {}) } })
}
async function findUser(email: string): Promise<{ id: string; email: string } | null> {
  for (let page = 1; page <= 20; page++) {
    const r = await idFetch(`/admin/users?per_page=100&page=${page}`); if (!r.ok) return null
    const users = (((await r.json()) as any).users || []) as { id: string; email: string }[]
    const u = users.find((x) => (x.email || "").toLowerCase() === email); if (u) return u
    if (users.length < 100) return null
  }
  return null
}
async function ensureUser(email: string, name: string) {
  const found = await findUser(email); if (found) return found
  const pw = crypto.randomUUID() + crypto.randomUUID()  // placeholder until the client chooses their own
  const r = await idFetch("/admin/users", { method: "POST", body: JSON.stringify({ email, password: pw, confirm: true, user_metadata: { full_name: name } }) })
  if (!r.ok) { const again = await findUser(email); if (again) return again; throw new Error(`create-user-${r.status}`) }
  return (await r.json()) as { id: string; email: string }
}
function token() { const b = new Uint8Array(24); crypto.getRandomValues(b); return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("") }
const SETUP_DAYS = 7

type Person = { name?: string; email?: string; phone?: string }
type ProjectRec = { id: string; name: string; type?: string; phase?: string; contact?: string; total?: number; address?: string; drive?: string; clients: Person[]; createdAt?: string; createdBy?: string; updatedAt?: string }
async function registry() { return ((await store().get("projects", { type: "json" })) || {}) as Record<string, ProjectRec> }
async function clientsMap() { return ((await store().get("clients", { type: "json" })) || {}) as Record<string, any> }

export default async (req: Request, context: Context) => {
  const parts = new URL(req.url).pathname.replace(/^\/api\/portal\/?/, "").split("/").filter(Boolean)

  // POST /api/portal/setup  { token, password }  -> a client chooses their password from the invite link (no sign-in needed)
  if (parts[0] === "setup" && req.method === "POST") {
    const { token: t, password } = await req.json().catch(() => ({}))
    const tk = String(t || "").replace(/[^a-f0-9]/g, "")
    const pw = String(password || "")
    if (!tk) return json({ error: "bad-link" }, 400)
    if (pw.length < 8) return json({ error: "password-too-short" }, 400)
    const rec = (await store().get(`setup/${tk}`, { type: "json" })) as { email: string; project: string; exp: string; used?: string } | null
    if (!rec || rec.used || new Date(rec.exp) < new Date()) return json({ error: "link-expired" }, 410)
    const u = await findUser(rec.email); if (!u) return json({ error: "no-account" }, 410)
    const r = await idFetch(`/admin/users/${u.id}`, { method: "PUT", body: JSON.stringify({ password: pw, confirm: true }) })
    if (!r.ok) return json({ error: "could-not-set-password", status: r.status }, 502)
    await store().setJSON(`setup/${tk}`, { ...rec, used: new Date().toISOString() })
    const map = await clientsMap(); if (map[rec.email]) { map[rec.email].passwordSetAt = new Date().toISOString(); await store().setJSON("clients", map) }
    return json({ ok: true, email: rec.email })
  }

  const me = await whoAmI()
  if (!me) return json({ error: "signed-out" }, 401)

  // GET /api/portal/me  (also tells Ashley the first time a client signs in)
  if (parts[0] === "me") {
    if (me.role === "client") {
      const map = await clientsMap()
      if (map[me.email] && !map[me.email].firstLogin) {
        map[me.email].firstLogin = new Date().toISOString(); await store().setJSON("clients", map)
        const reg = await registry(), pname = reg[me.project || ""]?.name || me.project
        await noticeToOwner(context, `${me.name || me.email} signed in to the portal`, `${me.name || me.email} (${me.email}) just signed in to the ${pname} portal for the first time.`, me.email)
      }
    }
    return json(me)
  }

  // GET /api/portal/projects  (admin) -> every project set up in the portal, with each person's sign-in status
  if (parts[0] === "projects" && req.method === "GET") {
    if (me.role !== "admin") return json({ error: "forbidden" }, 403)
    const reg = await registry(), map = await clientsMap()
    const list = Object.values(reg).map((p) => ({ ...p, clients: (p.clients || []).map((c) => {
      const m = map[(c.email || "").toLowerCase()] || {}
      return { ...c, invitedAt: m.invitedAt || null, passwordSetAt: m.passwordSetAt || null, firstLogin: m.firstLogin || null }
    }) }))
    return json({ projects: list })
  }

  // POST /api/portal/projects  (admin) -> create or update a project from the Set up portal steps
  if (parts[0] === "projects" && req.method === "POST") {
    if (me.role !== "admin") return json({ error: "forbidden" }, 403)
    const b = await req.json().catch(() => null) as any
    const id = clean(String(b?.id || ""))
    const name = String(b?.name || "").trim().slice(0, 120)
    if (!id || !name || id === "company") return json({ error: "id-and-name-required" }, 400)
    const people: Person[] = (Array.isArray(b.clients) ? b.clients : []).slice(0, 6).map((c: any) => ({
      name: String(c.name || "").trim().slice(0, 100), email: String(c.email || "").trim().toLowerCase().slice(0, 150), phone: String(c.phone || "").trim().slice(0, 40),
    })).filter((c: Person) => c.name || c.email)
    for (const c of people) if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) return json({ error: "bad-email", email: c.email }, 400)
    const reg = await registry(), now = new Date().toISOString(), prev = reg[id]
    const rec: ProjectRec = { id, name, type: String(b.type || ""), phase: String(b.phase || ""), contact: String(b.contact || "Ashley"), total: Number(b.total) || 0,
      address: String(b.address || "").slice(0, 200), drive: String(b.drive || "").slice(0, 300), clients: people,
      createdAt: prev?.createdAt || now, createdBy: prev?.createdBy || me.email, updatedAt: now }
    reg[id] = rec; await store().setJSON("projects", reg)
    const key = `project/${id}`
    await store().setJSON(`${key}/meta`, { name, type: rec.type, phase: rec.phase, contact: rec.contact, total: rec.total, address: rec.address, clients: people.map((c) => ({ name: c.name })) })
    if (b.visibility && typeof b.visibility === "object") await store().setJSON(`${key}/visibility`, b.visibility)
    // Starter boards and dates only fill an empty project, so re-running setup never wipes work.
    if (Array.isArray(b.boards) && b.boards.length && !(await store().get(`${key}/boards`, { type: "json" }))) await store().setJSON(`${key}/boards`, b.boards.slice(0, 40))
    if (Array.isArray(b.dates)) { // the setup page shows the current dates, so what it sends is the new list
      const dates = b.dates.slice(0, 30).map((d: any) => ({ what: String(d.what || "").slice(0, 120), date: /^\d{4}-\d{2}-\d{2}$/.test(d.date || "") ? d.date : "", note: String(d.note || "").slice(0, 200) })).filter((d: any) => d.what)
      if (dates.length) await store().setJSON(`${key}/dates`, dates); else await store().delete(`${key}/dates`)
    }
    const map = await clientsMap()
    for (const c of people) if (c.email) map[c.email] = { ...(map[c.email] || {}), project: id, name: c.name }
    await store().setJSON("clients", map)
    await store().setJSON(`${key}/updated`, { at: now, by: me.email, section: "setup" })
    return json({ ok: true, project: rec })
  }

  // ---------- Leads (admin) ----------
  // GET /api/portal/leads                 -> all leads, newest first (website form leads arrive automatically)
  // POST /api/portal/leads {name,...}     -> add a lead by hand
  // PUT /api/portal/leads/:id {status, consult, note, project} -> update one
  if (parts[0] === "leads") {
    if (me.role !== "admin") return json({ error: "forbidden" }, 403)
    const STATUSES = ["new", "contacted", "consult", "ballpark", "project", "lost"]
    let leads = (await store().get("leads", { type: "json" })) as any[] | null
    if (!leads && !(await store().get("leadsSeeded", { type: "json" }))) { // first time: carry over the leads that were on the dashboard
      const t = new Date().toISOString()
      leads = [["Justin Loy", "new"], ["Thompson Primary Bath", "ballpark"], ["Charles Lee", "ballpark"], ["Laurie Bevelock", "consult"]]
        .map(([name, status], k) => ({ id: "seed" + k, name, phone: "", email: "", message: "", source: "manual", status, at: t, notes: [] }))
      await store().setJSON("leads", leads); await store().setJSON("leadsSeeded", { at: t })
    }
    leads = leads || []
    if (req.method === "GET") return json({ leads })
    if (req.method === "POST" && !parts[1]) {
      const b = await req.json().catch(() => ({})) as any
      const name = String(b.name || "").trim().slice(0, 120); if (!name) return json({ error: "name-required" }, 400)
      const lead = { id: rid(), name, phone: String(b.phone || "").slice(0, 40), email: String(b.email || "").trim().toLowerCase().slice(0, 150), message: String(b.message || "").slice(0, 5000), source: "manual", status: "new", at: new Date().toISOString(), notes: [] }
      leads.unshift(lead); await store().setJSON("leads", leads); return json({ ok: true, lead })
    }
    if (req.method === "PUT" && parts[1]) {
      const l = leads.find((x) => x.id === parts[1]); if (!l) return json({ error: "not-found" }, 404)
      const b = await req.json().catch(() => ({})) as any
      if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return json({ error: "bad-status" }, 400); l.status = b.status }
      if (b.consult !== undefined) l.consult = String(b.consult || "").slice(0, 40)
      if (b.project !== undefined) l.project = clean(String(b.project || ""))
      for (const k of ["name", "phone", "email"]) if (b[k] !== undefined) l[k] = String(b[k]).trim().slice(0, 150)
      if (b.note) l.notes = [...(l.notes || []), { at: new Date().toISOString(), by: me.email, text: String(b.note).slice(0, 2000) }]
      l.updatedAt = new Date().toISOString()
      await store().setJSON("leads", leads); return json({ ok: true, lead: l })
    }
    return json({ error: "method" }, 405)
  }

  // DELETE /api/portal/projects/:id  { confirm: id }  (admin) -> take a project out of the portal (its data and client access).
  // Sign-in accounts are left in Netlify Identity; without a project they can't see anything.
  if (parts[0] === "projects" && parts[1] && req.method === "DELETE") {
    if (me.role !== "admin") return json({ error: "forbidden" }, 403)
    const id = clean(parts[1]); const { confirm } = await req.json().catch(() => ({}))
    if (!id || confirm !== id || id === "company") return json({ error: "confirm-with-project-id" }, 400)
    const reg = await registry(); delete reg[id]; await store().setJSON("projects", reg)
    const map = await clientsMap(); for (const [e, c] of Object.entries(map)) if ((c as any).project === id) delete map[e]
    await store().setJSON("clients", map)
    const { blobs } = await store().list({ prefix: `project/${id}/` }); await Promise.all(blobs.map((b) => store().delete(b.key)))
    const f = await files().list({ prefix: `${id}/` }); await Promise.all(f.blobs.map((b) => files().delete(b.key)))
    return json({ ok: true, removed: blobs.length, files: f.blobs.length })
  }

  // POST /api/portal/invite-email  { project, email, subject, text }  (admin) -> branded invite with a choose-password link
  if (parts[0] === "invite-email" && req.method === "POST") {
    if (me.role !== "admin") return json({ error: "forbidden" }, 403)
    const b = await req.json().catch(() => ({})) as any
    const project = clean(String(b.project || "")), email = String(b.email || "").trim().toLowerCase()
    const reg = await registry(), p = reg[project]
    const person = p?.clients.find((c) => c.email === email)
    if (!p || !person) return json({ error: "not-a-client-of-this-project" }, 400)
    const subject = String(b.subject || "").trim().slice(0, 200), text = String(b.text || "").slice(0, 10000)
    if (!subject || !text.includes("{link}")) return json({ error: "subject-and-link-required" }, 400)
    if (!Netlify.env.get("RESEND_API_KEY")) return json({ error: "email-not-set-up" }, 409)
    await ensureUser(email, person.name || "")
    const tk = token(), exp = new Date(Date.now() + SETUP_DAYS * 864e5).toISOString()
    await store().setJSON(`setup/${tk}`, { email, project, exp, by: me.email, at: new Date().toISOString() })
    const link = `${SITE}/portal/login.html#setup=${tk}`
    const first = (person.name || "").split(" ")[0] || "there"
    const result = await sendEmail([email], subject, text.replace(/\{link\}/g, link).replace(/\{first\}/g, first), me.email)
    if (!result.sent) return json({ ok: false, ...result }, 502)
    const map = await clientsMap(); map[email] = { ...(map[email] || {}), project, name: person.name, invitedAt: new Date().toISOString(), invitedBy: me.email }
    await store().setJSON("clients", map)
    const log = ((await store().get(`project/${project}/emailLog`, { type: "json" })) || []) as unknown[]
    log.push({ at: new Date().toISOString(), by: me.email, kind: "invite", to: [email], subject, sent: true }); await store().setJSON(`project/${project}/emailLog`, log.slice(-200))
    return json({ ok: true, to: email, expires: exp })
  }

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
