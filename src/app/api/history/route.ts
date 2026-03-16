/**
 * GET /api/history
 * - Admin roles (Admin, C-level, SeniorSales, SeniorSMM): все переводы всех
 * - Остальные: только свои
 */
import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { supabase } from "@/lib/supabase"
import { ADMIN_ROLES } from "@/types"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = ADMIN_ROLES.includes(session.role as any)

  let query = supabase
    .from("translator_translations")
    .select("id, created_at, manager_id, manager_name, target_country, target_lang, source_text, translation, total_loops, loops_json, status")
    .order("created_at", { ascending: false })
    .limit(200)

  if (!isAdmin) {
    query = query.eq("manager_id", session.id)
  }

  const { data, error } = await query

  if (error) {
    console.error("History fetch error:", error)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }

  const entries = (data || []).map((row: any) => ({
    id: row.id,
    sourceText: row.source_text,
    targetCountry: row.target_country,
    targetLang: row.target_lang,
    finalTranslation: row.translation,
    totalLoops: row.total_loops,
    timestamp: row.created_at,
    loops: row.loops_json ?? undefined,
    managerName: isAdmin ? row.manager_name : undefined,
    managerId: isAdmin ? row.manager_id : undefined,
  }))

  return NextResponse.json({ entries })
}
