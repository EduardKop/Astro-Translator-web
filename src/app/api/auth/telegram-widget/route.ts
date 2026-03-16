/**
 * GET /api/auth/telegram-widget
 * Handles Telegram Login Widget redirect with HMAC verification.
 */
import { NextResponse } from "next/server"
import { createHmac } from "crypto"
import { supabase } from "@/lib/supabase"
import { createSession, sessionCookieOptions } from "@/lib/session"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const hash = searchParams.get("hash") || ""
  const params = Object.fromEntries(searchParams.entries())
  delete params.hash

  // Verify Telegram signature
  const dataCheckString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("\n")

  const botToken = process.env.BOT_TOKEN || ""
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest()
  const expectedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex")

  if (expectedHash !== hash) {
    return NextResponse.redirect(new URL("/login?error=invalid", req.url))
  }

  // Check auth_date not too old (5 min)
  const authDate = parseInt(params.auth_date || "0", 10)
  if (Date.now() / 1000 - authDate > 300) {
    return NextResponse.redirect(new URL("/login?error=expired", req.url))
  }

  const telegramId = params.id
  const { data: manager, error } = await supabase
    .from("managers")
    .select("id, name, role, avatar_url, telegram_id, status")
    .eq("telegram_id", telegramId)
    .eq("status", "active")
    .single()

  if (error || !manager) {
    return NextResponse.redirect(new URL("/login?error=denied", req.url))
  }

  const token = await createSession({
    id: manager.id,
    name: manager.name,
    role: manager.role,
    telegram_id: manager.telegram_id,
    avatar_url: manager.avatar_url,
  })

  const res = NextResponse.redirect(new URL("/", req.url))
  res.cookies.set(sessionCookieOptions(token))
  return res
}
