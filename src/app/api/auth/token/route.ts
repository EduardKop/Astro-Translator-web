/**
 * POST /api/auth/token
 * Генерирует одноразовый токен, сохраняет в auth_tokens,
 * возвращает { token, botUrl } — ссылка на бота с deep link
 */
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"

// Service role клиент — обходит RLS (нужен SUPABASE_SERVICE_KEY)
// Если нет service key — используем anon key (RLS должна разрешать INSERT)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!
)

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "Astro_Translator_Auth_bot"

export async function POST() {
  const token = randomUUID()

  const { error } = await supabase
    .from("auth_tokens")
    .insert({ token })

  if (error) {
    console.error("Token insert error:", error)
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 })
  }

  const botUrl = `https://t.me/${BOT_USERNAME}?start=${token}`

  return NextResponse.json({ token, botUrl })
}
