/**
 * GET /api/auth/poll?token=UUID
 * Проверяет статус одноразового токена.
 * Если токен активирован ботом — создаёт сессию и возвращает { ok: true }
 */
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createSession, sessionCookieOptions } from "@/lib/session"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 })
  }

  // Проверяем токен
  const { data: authToken, error } = await supabase
    .from("auth_tokens")
    .select("token, used, expires_at, manager_id")
    .eq("token", token)
    .single()

  if (error || !authToken) {
    return NextResponse.json({ status: "not_found" }, { status: 404 })
  }

  // Протух
  if (new Date(authToken.expires_at) < new Date()) {
    return NextResponse.json({ status: "expired" })
  }

  // Ещё не активирован ботом
  if (!authToken.used || !authToken.manager_id) {
    return NextResponse.json({ status: "pending" })
  }

  // Активирован — загружаем менеджера и создаём сессию
  const { data: manager, error: mErr } = await supabase
    .from("managers")
    .select("id, name, role, avatar_url, telegram_id")
    .eq("id", authToken.manager_id)
    .single()

  if (mErr || !manager) {
    return NextResponse.json({ status: "denied" })
  }

  const jwtToken = await createSession({
    id: manager.id,
    name: manager.name,
    role: manager.role,
    telegram_id: manager.telegram_id,
    avatar_url: manager.avatar_url,
  })

  const res = NextResponse.json({ status: "ok" })
  res.cookies.set(sessionCookieOptions(jwtToken))
  return res
}
