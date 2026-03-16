/**
 * GET  /api/prompts        — получить все промпты
 * PATCH /api/prompts/[key] — обновить промпт (только admin)
 */
import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { supabase } from "@/lib/supabase"
import { ADMIN_ROLES } from "@/types"

export async function GET() {
  const { data, error } = await supabase
    .from("translator_prompts")
    .select("id, key, name_ru, description, template, updated_at")
    .order("key")

  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 })
  return NextResponse.json({ prompts: data })
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!ADMIN_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { key, template } = await req.json()
  if (!key || !template) {
    return NextResponse.json({ error: "key and template required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("translator_prompts")
    .update({ template })
    .eq("key", key)
    .select()
    .single()

  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 })
  return NextResponse.json({ prompt: data })
}
