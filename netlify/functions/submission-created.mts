// Runs automatically when Netlify accepts a website form submission (Netlify skips ones it marks as spam).
// Each "contact" form submission becomes a new lead in the portal (Blobs store "portal", key "leads"),
// and Ashley gets a short email about it. Nothing is sent to the person who filled out the form.
import { getStore, connectLambda } from "@netlify/blobs"

const SITE = "https://sovereign-renovations.com"
const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n)

export const handler = async (event: any) => {
  connectLambda(event)
  let payload: any = {}
  try { payload = JSON.parse(event.body || "{}").payload || {} } catch { return { statusCode: 200, body: "ignored" } }
  if (payload.form_name !== "contact") return { statusCode: 200, body: "not the contact form" }
  const d = payload.data || {}
  if (d["bot-field"]) return { statusCode: 200, body: "spam trap" }

  const lead = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: clip(d.name, 120), phone: clip(d.phone, 40), email: clip(d.email, 150).toLowerCase(), message: clip(d.message, 5000),
    source: "website", status: "new", at: payload.created_at || new Date().toISOString(), submissionId: clip(payload.id, 60), notes: [] as unknown[],
  }
  if (!lead.name && !lead.email && !lead.phone) return { statusCode: 200, body: "empty" }

  const store = getStore({ name: "portal", consistency: "strong" })
  const leads = ((await store.get("leads", { type: "json" })) || []) as any[]
  if (lead.submissionId && leads.some((l) => l.submissionId === lead.submissionId)) return { statusCode: 200, body: "already saved" }
  leads.unshift(lead)
  await store.setJSON("leads", leads.slice(0, 500))

  const key = process.env.RESEND_API_KEY
  if (key) {
    const text = `New lead from the website:\n\n${lead.name || "(no name)"}\nPhone: ${lead.phone || "-"}\nEmail: ${lead.email || "-"}\n\n${lead.message ? `"${lead.message}"\n\n` : ""}See it in your portal: ${SITE}/portal/admin-home.html#leads`
    const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string))
    const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2b2620;font-size:16px;line-height:1.55"><p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8a6a3c">Sovereign Renovations</p>${esc(text).replace(/(https:\/\/\S+)/g, '<a href="$1" style="color:#8a6a3c">$1</a>').replace(/\n/g, "<br>")}</div>`
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.PORTAL_FROM || "Sovereign Renovations <portal@sovereign-renovations.com>", to: [process.env.PORTAL_NOTIFY || "ashley@sovereign-renovations.com"],
        subject: `New website lead: ${lead.name || lead.email || "someone"}`, text, html, ...(lead.email ? { reply_to: lead.email } : {}) }),
    }).catch(() => null)
  }
  return { statusCode: 200, body: "lead saved" }
}
