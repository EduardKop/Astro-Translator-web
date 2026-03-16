"use client"

import { useEffect, useRef, useState } from "react"
import { Settings, Save, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react"
import { TranslatorPrompt } from "@/types"

const STEP_META: Record<string, { color: string; dot: string }> = {
  draft:    { color: "text-blue-400",    dot: "bg-blue-400" },
  critique: { color: "text-amber-400",   dot: "bg-amber-400" },
  polish:   { color: "text-violet-400",  dot: "bg-violet-400" },
  quality:  { color: "text-emerald-400", dot: "bg-emerald-400" },
}

export function PromptsModal({ onClose }: { onClose: () => void }) {
  const [prompts, setPrompts] = useState<TranslatorPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const [saved, setSaved]     = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [edited, setEdited]   = useState<Record<string, string>>({})
  const [active, setActive]   = useState<string>("draft")
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((d) => {
        const list: TranslatorPrompt[] = d.prompts || []
        setPrompts(list)
        const init: Record<string, string> = {}
        for (const p of list) init[p.key] = p.template
        setEdited(init)
        if (list.length > 0) setActive(list[0].key)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

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
      // Update local state so isDirty resets
      setPrompts((prev) =>
        prev.map((p) => p.key === key ? { ...p, template: edited[key], updated_at: new Date().toISOString() } : p)
      )
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  const currentPrompt = prompts.find((p) => p.key === active)
  const isDirty = currentPrompt ? edited[active] !== currentPrompt.template : false

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: "calc(100vh - 24px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Настройка промптов</p>
              <p className="text-[10px] text-muted-foreground/60">Редактирование инструкций AI-агентов</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">

            {/* Sidebar — agent tabs */}
            <div className="w-52 flex-shrink-0 border-r border-border/50 bg-background/30 flex flex-col gap-1 p-3">
              {prompts.map((p) => {
                const meta = STEP_META[p.key] || { color: "text-primary", dot: "bg-primary" }
                const isActive = p.key === active
                const hasUnsaved = edited[p.key] !== p.template
                return (
                  <button
                    key={p.key}
                    onClick={() => setActive(p.key)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                      isActive
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-secondary/60 border border-transparent"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-semibold truncate ${isActive ? meta.color : "text-foreground/70"}`}>
                        {p.name_ru}
                      </p>
                      <p className="text-[9px] text-muted-foreground/50 truncate">{p.description}</p>
                    </div>
                    {hasUnsaved && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Editor area */}
            <div className="flex-1 flex flex-col min-w-0">

              {error && (
                <div className="flex items-center gap-2 mx-4 mt-3 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 flex-shrink-0">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              {/* Placeholders hint */}
              <div className="mx-4 mt-3 mb-2 bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2 flex-shrink-0">
                <p className="text-[10px] text-amber-400/70 leading-relaxed">
                  <span className="font-semibold">Плейсхолдеры: </span>
                  {["{{targetCountry}}", "{{targetLang}}", "{{userText}}", "{{draft}}", "{{critique}}", "{{originalText}}", "{{polishedText}}", "{{feedbackBlock}}"].map((ph) => (
                    <code key={ph} className="bg-black/20 px-1 py-0.5 rounded mx-0.5 font-mono">{ph}</code>
                  ))}
                </p>
              </div>

              {/* Textarea */}
              {currentPrompt && (
                <textarea
                  key={active}
                  className="flex-1 bg-background/20 font-mono text-[12.5px] leading-relaxed text-foreground/85 px-5 py-4 resize-none outline-none min-h-0 focus:bg-background/30 transition-colors border-0"
                  value={edited[active] || ""}
                  onChange={(e) => setEdited((prev) => ({ ...prev, [active]: e.target.value }))}
                  spellCheck={false}
                  placeholder="Введи текст промпта..."
                />
              )}

              {/* Footer */}
              {currentPrompt && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 flex-shrink-0 bg-background/20">
                  <p className="text-[9px] text-muted-foreground/30">
                    Обновлено: {new Date(currentPrompt.updated_at).toLocaleString("ru-RU")}
                  </p>
                  <div className="flex items-center gap-2">
                    {isDirty && saved !== active && (
                      <span className="text-[10px] text-amber-400/70">Не сохранено</span>
                    )}
                    {saved === active && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Сохранено
                      </span>
                    )}
                    <button
                      onClick={() => handleSave(active)}
                      disabled={saving === active || !isDirty}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {saving === active
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Save className="w-3 h-3" />}
                      Сохранить
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
