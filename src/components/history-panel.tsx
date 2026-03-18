"use client"

import { HistoryEntry, AgentStep, TranslationLoop } from "@/types"
import {
  Clock, Copy, Check, Globe,
  ChevronDown, ChevronRight, CheckCircle2, XCircle,
  Pen, Search, Sparkles, ShieldCheck, RefreshCw, Loader2, User,
} from "lucide-react"
import { useState } from "react"

// ── Icons per agent step ──────────────────────────────────────────────────────
const STEP_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  draft:    { icon: Pen,         color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/30" },
  critique: { icon: Search,      color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30" },
  polish:   { icon: Sparkles,    color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/30" },
  quality:  { icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
}

function CopyBtn({ text, stopProp = false }: { text: string; stopProp?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => {
        if (stopProp) e.stopPropagation()
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
      title="Скопировать"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
        : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function StepCard({ step }: { step: AgentStep }) {
  const [open, setOpen] = useState(false)
  const meta = STEP_META[step.name] ?? STEP_META.draft
  const Icon = meta.icon
  return (
    <div className={`rounded-lg border transition-all duration-200 ${meta.bg} overflow-hidden`}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left">
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${meta.color}`} />
        <div className="flex-1 min-w-0">
          <span className={`text-[11px] font-semibold ${meta.color}`}>{step.nameRu}</span>
          <p className="text-[10px] text-muted-foreground/70 leading-tight truncate mt-0.5">{step.description}</p>
        </div>
        {step.status === "completed"
          ? <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          : <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />}
        {open ? <ChevronDown className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
               : <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold">Промпт</span>
            <pre className="mt-1 text-[10px] font-mono leading-relaxed text-muted-foreground/70 whitespace-pre-wrap break-words bg-black/20 rounded p-2 max-h-36 overflow-y-auto">
              {step.prompt}
            </pre>
          </div>
          {step.output && (
            <div>
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold">Результат</span>
              <pre className={`mt-1 text-[11px] leading-relaxed whitespace-pre-wrap break-words rounded p-2 max-h-40 overflow-y-auto ${meta.color} bg-black/20`}>
                {step.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LoopBlock({ loop, isLast }: { loop: TranslationLoop; isLast: boolean }) {
  const [collapsed, setCollapsed] = useState(!isLast)
  const passed = loop.qualityPassed
  return (
    <div className="space-y-2">
      <button onClick={() => setCollapsed((v) => !v)} className="w-full flex items-center gap-2">
        <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold flex-shrink-0 border ${
          passed === true ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
          : passed === false ? "border-red-500/50 bg-red-500/10 text-red-400"
          : "border-amber-500/50 bg-amber-500/10 text-amber-400"
        }`}>{loop.loopNumber}</div>
        <span className="text-[11px] font-semibold text-muted-foreground/80">Итерация {loop.loopNumber}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
          passed === true ? "bg-emerald-500/10 text-emerald-400"
          : passed === false ? "bg-red-500/10 text-red-400"
          : "bg-amber-500/10 text-amber-400"
        }`}>{passed === true ? "✓ Принят" : passed === false ? "✗ Повтор" : "Готово"}</span>
        <div className="flex-1 h-px bg-border/50" />
        <RefreshCw className={`w-3 h-3 text-muted-foreground/30 transition-transform ${collapsed ? "" : "rotate-180"}`} />
      </button>
      {!collapsed && (
        <div className="pl-7 space-y-1.5">
          {loop.steps.map((step) => <StepCard key={step.name} step={step} />)}
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export function HistoryPanel({
  entries,
  isAdmin = false,
  loading = false,
  onRefresh,
}: {
  entries: HistoryEntry[]
  isAdmin?: boolean
  loading?: boolean
  onRefresh?: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full bg-[#08080f]">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-background/80 backdrop-blur-md border-b">
        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
        <span className="text-xs sm:text-sm font-semibold">История переводов</span>
        {entries.length > 0 && (
          <span className="ml-1 text-[9px] sm:text-[10px] text-muted-foreground/50">{entries.length}</span>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground/30">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 gap-3 mt-16">
            <Clock className="w-12 h-12" />
            <p className="text-xs text-center">История пуста.<br />Переводы появятся здесь.</p>
          </div>
        ) : (
          entries.map((entry) => {
            const isOpen = expandedId === entry.id
            return (
              <div
                key={entry.id}
                className="group rounded-xl border border-border/50 bg-card/50 hover:border-primary/20 transition-all duration-200 overflow-hidden cursor-pointer"
                onClick={() => setExpandedId(isOpen ? null : entry.id)}
              >
                <div className="flex items-start gap-3 p-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Globe className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider">
                        {entry.targetCountry}
                      </span>
                      {/* Admin: show manager name */}
                      {isAdmin && entry.managerName && (
                        <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/50">
                          <User className="w-2.5 h-2.5" />
                          {entry.managerName}
                        </span>
                      )}
                      <span className="text-[9px] text-muted-foreground/40">
                        {entry.totalLoops > 1 ? `${entry.totalLoops} итерации` : "1 итерация"}
                      </span>
                      <span className="ml-auto text-[9px] text-muted-foreground/40">
                        {formatDate(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60 truncate leading-relaxed">
                      {entry.sourceText}
                    </p>
                    <p className={`text-[11px] text-foreground/80 leading-relaxed mt-1 ${isOpen ? "" : "line-clamp-2"}`}>
                      {entry.finalTranslation}
                    </p>
                  </div>
                  <CopyBtn text={entry.finalTranslation} stopProp />
                </div>

                {isOpen && (
                  <div
                    className="px-3 pb-3 pt-1 border-t border-border/30 space-y-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 mb-1">Оригинал</p>
                      <p className="text-[11px] text-muted-foreground/60 leading-relaxed whitespace-pre-wrap">{entry.sourceText}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 mb-1">Перевод (полный)</p>
                      <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{entry.finalTranslation}</p>
                    </div>
                    {entry.loops && entry.loops.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 mb-2">Агенты</p>
                        <div className="space-y-3">
                          {entry.loops.map((loop, idx) => (
                            <LoopBlock key={loop.loopNumber} loop={loop} isLast={idx === (entry.loops?.length ?? 0) - 1} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
