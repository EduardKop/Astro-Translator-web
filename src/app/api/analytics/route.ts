/**
 * GET /api/analytics
 * Только для admin-ролей.
 * Возвращает переводы по дням + по менеджерам.
 */
import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { supabase } from "@/lib/supabase"
import { ADMIN_ROLES } from "@/types"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = ADMIN_ROLES.includes(session.role as any)

  // Fetch last 30 days of translations
  const since = new Date()
  since.setDate(since.getDate() - 30)

  let query = supabase
    .from("translator_translations")
    .select("id, created_at, manager_id, manager_name")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true })

  if (!isAdmin) {
    query = query.eq("manager_id", session.id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 })

  const rows = data || []

  // Group by date
  const byDate: Record<string, number> = {}
  // Group by manager
  const byManager: Record<string, { name: string; count: number }> = {}

  for (const row of rows) {
    const date = row.created_at.slice(0, 10) // YYYY-MM-DD
    byDate[date] = (byDate[date] || 0) + 1

    if (isAdmin && row.manager_id) {
      if (!byManager[row.manager_id]) {
        byManager[row.manager_id] = { name: row.manager_name || "—", count: 0 }
      }
      byManager[row.manager_id].count++
    }
  }

  const daily = Object.entries(byDate).map(([date, count]) => ({ date, count }))
  const managers = Object.entries(byManager).map(([id, v]) => ({
    manager_id: id,
    manager_name: v.name,
    count: v.count,
  })).sort((a, b) => b.count - a.count)

  return NextResponse.json({ daily, managers, isAdmin })
}
