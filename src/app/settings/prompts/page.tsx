"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Settings, ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { TranslatorPrompt } from "@/types"

const STEP_META: Record<string, { color: string }> = {
  translator:    { color: "text-blue-400" },
  critic:        { color: "text-amber-400" },
  terminologist: { color: "text-violet-400" },
  refiner:       { color: "text-emerald-400" },
}

export default function PromptsSettingsPage() {
  const router = useRouter()
  const [prompts, setPrompts]   = useState<TranslatorPrompt[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<string | null>(null)
  const [saved, setSaved]       = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [edited, setEdited]     = useState<Record<string, string>>({})

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null }
        return r.json()
      })
      .then((d) => {
        if (!d) return
        setPrompts(d.prompts || [])
        const init: Record<string, string> = {}
        for (const p of d.prompts || []) init[p.key] = p.template
        setEdited(init)
      })
      .finally(() => setLoading(false))
  }, [router])

  async function handleSave(key: string) {
    setSaving(key)
    setError(null)
    try {
      const res = await fetch("/api/prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, template: edited[key] }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Ошибка сохранения")
      }
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

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
        <Settings className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-base font-bold">Настройки промптов</h1>
          <p className="text-xs text-muted-foreground">Редактирование инструкций для AI-агентов</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="flex-1 p-6 space-y-6 max-w-4xl mx-auto w-full">

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="bg-card/50 border border-amber-500/20 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-400/80">
              <strong>Плейсхолдеры:</strong> используй{" "}
              <code className="bg-black/20 px-1 rounded">{"{{targetCountry}}"}</code>{" "}
              <code className="bg-black/20 px-1 rounded">{"{{targetLang}}"}</code>{" "}
              <code className="bg-black/20 px-1 rounded">{"{{userText}}"}</code>{" "}
              <code className="bg-black/20 px-1 rounded">{"{{translator}}"}</code>{" "}
              <code className="bg-black/20 px-1 rounded">{"{{critic}}"}</code>{" "}
              <code className="bg-black/20 px-1 rounded">{"{{terminologist}}"}</code>
            </p>
          </div>

          {prompts.map((p) => {
            const meta = STEP_META[p.key] || { color: "text-primary" }
            const isSaving = saving === p.key
            const isSaved  = saved === p.key
            const isDirty  = edited[p.key] !== p.template

            return (
              <div key={p.key} className="bg-card border rounded-xl overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-3 border-b bg-background/40">
                  <div>
                    <span className={`text-sm font-bold ${meta.color}`}>{p.name_ru}</span>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{p.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDirty && !isSaved && (
                      <span className="text-[10px] text-amber-400/70">Не сохранено</span>
                    )}
                    {isSaved && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Сохранено
                      </span>
                    )}
                    <button
                      onClick={() => handleSave(p.key)}
                      disabled={isSaving || !isDirty}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSaving
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Save className="w-3 h-3" />}
                      Сохранить
                    </button>
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  className="w-full bg-transparent font-mono text-[12px] leading-relaxed text-foreground/80 p-5 resize-none outline-none min-h-[200px] focus:bg-primary/2"
                  value={edited[p.key] || ""}
                  onChange={(e) => setEdited((prev) => ({ ...prev, [p.key]: e.target.value }))}
                  spellCheck={false}
                />

                <div className="px-5 py-2 border-t bg-background/20">
                  <p className="text-[9px] text-muted-foreground/30">
                    Обновлено: {new Date(p.updated_at).toLocaleString("ru-RU")}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
