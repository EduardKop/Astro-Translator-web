"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart2, ArrowLeft, TrendingUp, Users, Hash } from "lucide-react"

interface DailyEntry { date: string; count: number }
interface ManagerEntry { manager_id: string; manager_name: string; count: number }

const BAR_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
]

function formatDateRu(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [daily, setDaily]       = useState<DailyEntry[]>([])
  const [managers, setManagers] = useState<ManagerEntry[]>([])
  const [isAdmin, setIsAdmin]   = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null }
        if (r.status === 403) { router.push("/"); return null }
        return r.json()
      })
      .then((d) => {
        if (!d) return
        setDaily(d.daily || [])
        setManagers(d.managers || [])
        setIsAdmin(d.isAdmin || false)
      })
      .finally(() => setLoading(false))
  }, [router])

  const maxDaily = Math.max(...daily.map((d) => d.count), 1)
  const totalTranslations = daily.reduce((s, d) => s + d.count, 0)
  const activeDays = daily.filter((d) => d.count > 0).length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <BarChart2 className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-base font-bold">Аналитика переводов</h1>
          <p className="text-xs text-muted-foreground">Последние 30 дней</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Hash, label: "Всего переводов", value: totalTranslations },
              { icon: TrendingUp, label: "Активных дней", value: activeDays },
              { icon: Users, label: "Сотрудников", value: managers.length || 1 },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-card border rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Daily bar chart */}
          <div className="bg-card border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">Переводы по дням</h2>
            {daily.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 text-center py-8">Нет данных</p>
            ) : (
              <div className="flex items-end gap-1 h-40 overflow-x-auto pb-1">
                {daily.map((d) => {
                  const pct = (d.count / maxDaily) * 100
                  const heat =
                    d.count === 0 ? "bg-muted/20" :
                    d.count < maxDaily * 0.33 ? "bg-blue-500/40" :
                    d.count < maxDaily * 0.66 ? "bg-blue-500/70" : "bg-blue-500"
                  return (
                    <div key={d.date} className="flex flex-col items-center gap-1 flex-shrink-0 w-7 group">
                      <div className="relative w-full">
                        <div
                          className={`w-full rounded-t-sm transition-all duration-300 ${heat}`}
                          style={{ height: `${Math.max(pct * 1.4, 4)}px` }}
                          title={`${formatDateRu(d.date)}: ${d.count}`}
                        />
                        {d.count > 0 && (
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {d.count}
                          </span>
                        )}
                      </div>
                      <span className="text-[8px] text-muted-foreground/40 rotate-45 origin-left whitespace-nowrap">
                        {formatDateRu(d.date)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            {/* Legend */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t">
              <span className="text-[10px] text-muted-foreground/40">Интенсивность:</span>
              {[
                { cls: "bg-muted/20",    label: "0" },
                { cls: "bg-blue-500/40", label: "мало" },
                { cls: "bg-blue-500/70", label: "средне" },
                { cls: "bg-blue-500",    label: "много" },
              ].map(({ cls, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-sm ${cls}`} />
                  <span className="text-[10px] text-muted-foreground/50">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Managers leaderboard (admin only) */}
          {isAdmin && managers.length > 0 && (
            <div className="bg-card border rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                По сотрудникам
              </h2>
              <div className="space-y-2.5">
                {managers.map((m, idx) => {
                  const pct = (m.count / (managers[0]?.count || 1)) * 100
                  const color = BAR_COLORS[idx % BAR_COLORS.length]
                  return (
                    <div key={m.manager_id} className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground/40 w-4 text-right flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-[11px] font-medium min-w-[120px] flex-shrink-0 truncate">
                        {m.manager_name}
                      </span>
                      <div className="flex-1 bg-muted/20 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-muted-foreground/70 w-8 text-right flex-shrink-0">
                        {m.count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
