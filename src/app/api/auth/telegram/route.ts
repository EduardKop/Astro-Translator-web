/**
 * POST /api/auth/telegram
 * Принимает { telegram_id } — проверяет в таблице managers,
 * создаёт JWT-сессию и ставит HttpOnly cookie.
 *
 * Вызывается из Telegram WebApp после верификации пользователя ботом.
 * На фронте: window.Telegram.WebApp.initData содержит user.id
 */
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createSession, sessionCookieOptions } from "@/lib/session"

export async function POST(req: Request) {
  try {
    const { telegram_id } = await req.json()

    if (!telegram_id) {
      return NextResponse.json({ error: "telegram_id required" }, { status: 400 })
    }

    const { data: manager, error } = await supabase
      .from("managers")
      .select("id, name, role, avatar_url, telegram_id, status")
      .eq("telegram_id", String(telegram_id))
      .eq("status", "active")
      .single()

    if (error || !manager) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const token = await createSession({
      id: manager.id,
      name: manager.name,
      role: manager.role,
      telegram_id: manager.telegram_id,
      avatar_url: manager.avatar_url,
    })

    const res = NextResponse.json({
      ok: true,
      user: {
        id: manager.id,
        name: manager.name,
        role: manager.role,
        avatar_url: manager.avatar_url,
      },
    })
    res.cookies.set(sessionCookieOptions(token))
    return res

  } catch (err: any) {
    console.error("Auth error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
