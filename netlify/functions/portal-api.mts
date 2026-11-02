// Client portal API. Every request is checked against Netlify Identity:
//  - admins (emails in PORTAL_ADMINS) can read and change any project
//  - clients can read their own project and change only the parts a client is allowed to change
// Project data lives in the Netlify Blobs store "portal", one JSON document per project.
import { getUser, getIdentityConfig } from "@netlify/identity"
import { getStore } from "@netlify/blobs"
import type { Config, Context } from "@netlify/functions"

const CLIENT_SECTIONS = ["choices", "choiceDates", "upgrades", "clientDates", "clientFiles", "messages", "contractSignature"]
const ADMIN_SECTIONS = [...CLIENT_SECTIONS, "boards", "dates", "visibility", "files", "invoices", "contract", "changeOrders", "info"]

const store = () => getStore({ name: "portal", consistency: "strong" })
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } })

function admins(): string[] {
  return (Netlify.env.get("PORTAL_ADMINS") || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
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

export default async (req: Request, context: Context) => {
  const me = await whoAmI()
  if (!me) return json({ error: "signed-out" }, 401)
  const parts = new URL(req.url).pathname.replace(/^\/api\/portal\/?/, "").split("/").filter(Boolean)

  // GET /api/portal/me
  if (parts[0] === "me") return json(me)

  // /api/portal/project/:id[/:section]
  if (parts[0] === "project" && parts[1]) {
    const id = parts[1].replace(/[^a-z0-9-]/gi, "").toLowerCase()
    if (me.role !== "admin" && me.project !== id) return json({ error: "forbidden" }, 403)
    const key = `project/${id}`

    if (req.method === "GET") {
      const doc = ((await store().get(key, { type: "json" })) || {}) as Record<string, unknown>
      return json({ id, ...doc })
    }

    if (req.method === "PUT" && parts[2]) {
      const section = parts[2]
      const allowed = me.role === "admin" ? ADMIN_SECTIONS : CLIENT_SECTIONS
      if (!allowed.includes(section)) return json({ error: "forbidden-section" }, 403)
      const body = await req.text()
      if (body.length > 200_000) return json({ error: "too-large" }, 413)
      let value: unknown
      try { value = JSON.parse(body) } catch { return json({ error: "bad-json" }, 400) }
      const doc = ((await store().get(key, { type: "json" })) || {}) as Record<string, unknown>
      doc[section] = value
      doc.updated = { at: new Date().toISOString(), by: me.email, section }
      await store().setJSON(key, doc)
      return json({ ok: true, updated: doc.updated })
    }
    return json({ error: "method" }, 405)
  }

  // POST /api/portal/invite  { email, name, project }  (admins only)
  if (parts[0] === "invite" && req.method === "POST") {
    if (me.role !== "admin") return json({ error: "forbidden" }, 403)
    const { email, name, project } = await req.json()
    const e = String(email || "").trim().toLowerCase()
    const p = String(project || "").replace(/[^a-z0-9-]/gi, "").toLowerCase()
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
