// Google reviews for the "Client stories" section.
// Serves at /api/reviews. Needs the env var GOOGLE_PLACES_API_KEY (scope: Functions).
// Optional GOOGLE_PLACE_ID; if missing, the business is looked up by name once per request.
// Netlify's CDN caches the response for a day, so Google is asked about once a day.

const SEARCH = "Sovereign Renovations Raleigh NC"

export default async (req: Request) => {
  const key = Netlify.env.get("GOOGLE_PLACES_API_KEY")
  if (!key) return json({ error: "not-configured" }, 503, 300)

  try {
    const url = new URL(req.url)
    const queries = ["Sovereign Renovations", SEARCH, "Sovereign Renovations Fuquay-Varina NC", "Sovereign Renovations Wake Forest NC"]
    if (url.searchParams.get("find") === "1") {
      if (url.searchParams.get("q")) queries.unshift(url.searchParams.get("q") as string)
      // one-off helper: list what Google finds for each search, so the right business can be confirmed
      const out: any[] = []
      for (const q of queries) {
        const s = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress" },
          body: JSON.stringify({ textQuery: q, maxResultCount: 5, locationBias: { circle: { center: { latitude: 35.78, longitude: -78.64 }, radius: 50000 } } }),
        })
        const sj: any = await s.json()
        out.push({ q, error: sj?.error?.message, places: (sj.places || []).map((p: any) => ({ id: p.id, name: p.displayName?.text, address: p.formattedAddress })) })
      }
      return json({ find: out }, 200, 0)
    }
    // Sovereign Renovations Google Business Profile (from the review link g.page/r/CSr3L3vbrs1WEBM)
    let placeId = Netlify.env.get("GOOGLE_PLACE_ID") || "ChIJqSxCr7FM0CIRKvcve9uuzVY"
    if (!placeId) {
      for (const q of queries) {
        const s = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id" },
          body: JSON.stringify({ textQuery: q, maxResultCount: 1, locationBias: { circle: { center: { latitude: 35.78, longitude: -78.64 }, radius: 50000 } } }),
        })
        const sj: any = await s.json()
        if (sj?.error) return json({ error: "google-error", detail: sj.error.message }, 502, 300)
        placeId = sj?.places?.[0]?.id || ""
        if (placeId) break
      }
      if (!placeId) return json({ error: "place-not-found" }, 502, 300)
    }

    const d = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount,reviews,googleMapsUri",
      },
    })
    const p: any = await d.json()
    if (!d.ok) return json({ error: "google-error", detail: p?.error?.message }, 502, 300)

    const reviews = (p.reviews || []).map((r: any) => ({
      author: r.authorAttribution?.displayName || "Google reviewer",
      authorUri: r.authorAttribution?.uri || "",
      photo: r.authorAttribution?.photoUri || "",
      rating: r.rating || 0,
      text: r.originalText?.text || r.text?.text || "",
      when: r.relativePublishTimeDescription || "",
      time: r.publishTime || "",
    })).filter((r: any) => r.text)

    return json({
      placeId: p.id, name: p.displayName?.text, address: p.formattedAddress,
      rating: p.rating, count: p.userRatingCount, url: p.googleMapsUri, reviews,
    }, 200, 86400)
  } catch (e: any) {
    return json({ error: "failed", detail: String(e?.message || e) }, 500, 60)
  }
}

function json(body: unknown, status: number, cdnSeconds: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=600",
      "Netlify-CDN-Cache-Control": `public, durable, s-maxage=${cdnSeconds}, stale-while-revalidate=3600`,
    },
  })
}

export const config = { path: "/api/reviews" }
