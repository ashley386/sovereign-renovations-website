// Runs automatically when Netlify accepts a website form submission (Netlify skips ones it marks as spam;
// outside callers can't reach this function). Each "contact" submission is handed to the portal server,
// which saves it as a new lead and emails Ashley. Nothing is sent to the person who filled out the form.
import { createHash } from "node:crypto"

const SITE = "https://sovereign-renovations.com"

export const handler = async (event: any) => {
  try {
    const payload = (JSON.parse(event.body || "{}") || {}).payload || {}
    if (payload.form_name !== "contact") return { statusCode: 200, body: "not the contact form" }
    const d = payload.data || {}
    if (d["bot-field"]) return { statusCode: 200, body: "spam trap" }
    const key = process.env.RESEND_API_KEY || ""
    const proof = createHash("sha256").update(key + ":sovereign-lead-intake").digest("hex")
    const r = await fetch(`${SITE}/api/portal/intake-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Intake": proof },
      body: JSON.stringify({ name: d.name, phone: d.phone, email: d.email, message: d.message, at: payload.created_at, submissionId: payload.id }),
    })
    console.log("lead intake", r.status)
    return { statusCode: 200, body: `lead intake ${r.status}` }
  } catch (e) {
    console.log("lead intake failed", String((e as Error)?.message || e))
    return { statusCode: 200, body: "error logged" }
  }
}
