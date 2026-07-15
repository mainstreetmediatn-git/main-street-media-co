import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const allowedOrigins = new Set([
  "https://mainstreetmedia.pages.dev",
  "https://www.mainstreetmedia.co",
  "https://mainstreetmedia.co",
  "http://localhost:5173",
])

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && allowedOrigins.has(origin)
    ? origin
    : "https://mainstreetmedia.pages.dev"

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  }
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
    },
  })
}

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin")

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) })
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin)
  }

  if (origin && !allowedOrigins.has(origin)) {
    return json({ error: "Origin not allowed" }, 403, origin)
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin)
  }

  if (clean(payload.company_website_confirm, 100)) {
    return json({ ok: true }, 200, origin)
  }

  const businessName = clean(payload.business_name ?? payload.businessName, 160)
  const contactName = clean(payload.contact_name ?? payload.contactName ?? payload.name, 160)
  const email = clean(payload.email, 320).toLowerCase()
  const phone = clean(payload.phone, 50)
  const website = clean(payload.website, 500)
  const businessCategory = clean(payload.business_category ?? payload.businessCategory, 160)
  const city = clean(payload.city, 120)
  const state = clean(payload.state, 80)
  const notes = clean(payload.notes ?? payload.message, 2000)

  if (businessName.length < 2) {
    return json({ error: "Business name is required" }, 422, origin)
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "A valid email is required" }, 422, origin)
  }

  if (!phone && !website) {
    return json({ error: "Provide a phone number or website" }, 422, origin)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server configuration error" }, 500, origin)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: duplicate, error: duplicateError } = await supabase
    .from("audit_requests")
    .select("id")
    .eq("email", email)
    .eq("business_name", businessName)
    .gte("created_at", fiveMinutesAgo)
    .limit(1)
    .maybeSingle()

  if (duplicateError) {
    console.error("duplicate-check", duplicateError.message)
  }

  if (duplicate) {
    return json({ ok: true, duplicate: true, request_id: duplicate.id }, 200, origin)
  }

  const { data, error } = await supabase
    .from("audit_requests")
    .insert({
      user_id: null,
      business_name: businessName,
      contact_name: contactName || null,
      email,
      phone: phone || null,
      website: website || null,
      business_category: businessCategory || null,
      city: city || null,
      state: state || null,
      notes: notes || null,
      source: "website",
      status: "pending",
    })
    .select("id")
    .single()

  if (error) {
    console.error("audit-request insert", error.message)
    return json({ error: "Unable to submit request" }, 500, origin)
  }

  return json(
    {
      ok: true,
      request_id: data.id,
      message: "Your complimentary visibility audit request was received.",
    },
    201,
    origin,
  )
})
