"use client"

import { AgentLog, AgentStep, TranslationLoop } from "@/types"
import {
  Terminal,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Pen,
  Search,
  Sparkles,
} from "lucide-react"
import { useState, useEffect } from "react"

// ── Icons per agent ──────────────────────────────────────────────────────────
const STEP_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  draft: { icon: Pen, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  critique: { icon: Search, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  polish: { icon: Sparkles, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/30" },
  quality: { icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
}

// ── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ text, id }: { text: string; id: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="opacity-50 hover:opacity-100 transition-opacity"
      title="Скопировать"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

// ── Single agent step card ────────────────────────────────────────────────────
function StepCard({ step, index, defaultOpen }: { step: AgentStep; index: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const meta = STEP_META[step.name] ?? STEP_META.draft

  const Icon = meta.icon

  return (
    <div
      className={`rounded-lg border transition-all duration-300 ${meta.bg} overflow-hidden`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left group"
      >
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${meta.color}`} />
        <div className="flex-1 min-w-0">
          <span className={`text-[11px] font-semibold ${meta.color}`}>{step.nameRu}</span>
          <p className="text-[10px] text-muted-foreground/70 leading-tight truncate mt-0.5">
            {step.description}
          </p>
        </div>
        {step.status === "in_progress" ? (
          <Loader2 className="w-3 h-3 text-amber-400 animate-spin flex-shrink-0" />
        ) : step.status === "completed" ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
        ) : (
          <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
        )}
        {open ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
        )}
      </button>

      {/* Expandable body */}
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
                Промпт
              </span>
              <CopyBtn text={step.prompt} id={`${step.name}-prompt`} />
            </div>
            <pre className="text-[10px] font-mono leading-relaxed text-muted-foreground/70 whitespace-pre-wrap break-words bg-black/20 rounded p-2 max-h-36 overflow-y-auto">
              {step.prompt}
            </pre>
          </div>
          {/* Output */}
          {step.output && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
                  Результат
                </span>
                <CopyBtn text={step.output} id={`${step.name}-output`} />
              </div>
              <pre className={`text-[11px] leading-relaxed whitespace-pre-wrap break-words rounded p-2 max-h-40 overflow-y-auto ${meta.color} bg-black/20`}>
                {step.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── One loop block ────────────────────────────────────────────────────────────
function LoopBlock({ loop, isLast }: { loop: TranslationLoop; isLast: boolean }) {
  const [collapsed, setCollapsed] = useState(!isLast)
  const passed = loop.qualityPassed

  return (
    <div className="space-y-2">
      {/* Loop header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 group"
      >
        <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold flex-shrink-0 border ${
          passed === true
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
            : passed === false
            ? "border-red-500/50 bg-red-500/10 text-red-400"
            : "border-amber-500/50 bg-amber-500/10 text-amber-400"
        }`}>
          {loop.loopNumber}
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground/80">
          Итерация {loop.loopNumber}
        </span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
          passed === true
            ? "bg-emerald-500/10 text-emerald-400"
            : passed === false
            ? "bg-red-500/10 text-red-400"
            : "bg-amber-500/10 text-amber-400"
        }`}>
          {passed === true ? "✓ Принят" : passed === false ? "✗ Повтор" : "В процессе"}
        </span>
        <div className="flex-1 h-px bg-border/50" />
        <RefreshCw className={`w-3 h-3 text-muted-foreground/30 transition-transform ${collapsed ? "" : "rotate-180"}`} />
      </button>

      {/* Steps */}
      {!collapsed && (
        <div className="pl-7 space-y-1.5">
          {loop.steps.map((step, idx) => (
            <StepCard
              key={step.name}
              step={step}
              index={idx}
              defaultOpen={step.name === "quality" && !loop.qualityPassed}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main LogicPanel ───────────────────────────────────────────────────────────
export function LogicPanel({ logs }: { logs: AgentLog[] }) {
  return (
    <div className="flex flex-col h-full bg-[#08080f] border-l border-border overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 bg-background/80 backdrop-blur-md border-b">
        <Terminal className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Агентный пайплайн</span>
        {logs.length > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground/50">
            {logs.length} {logs.length === 1 ? "перевод" : "переводов"}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 gap-3 mt-16">
            <Terminal className="w-12 h-12" />
            <p className="text-xs">Отправь текст — здесь появится лог агентов</p>
          </div>
        ) : (
          logs.map((log) => <LogEntry key={log.id} log={log} />)
        )}
      </div>
    </div>
  )
}

// ── Per-message log entry ─────────────────────────────────────────────────────
function LogEntry({ log }: { log: AgentLog }) {
  const isLoading = log.status === "in_progress"

  return (
    <div className="space-y-3">
      {/* Source snippet */}
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${
          log.status === "completed" ? "bg-emerald-400" :
          log.status === "error" ? "bg-red-400" : "bg-amber-400 animate-pulse"
        }`} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-0.5">
            Исходный текст · {log.targetCountry}
          </p>
          <p className="text-[11px] text-muted-foreground/80 truncate">{log.sourceText}</p>
        </div>
        {isLoading && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0 mt-0.5" />}
      </div>

      {/* Loop blocks */}
      {log.loops.length > 0 ? (
        <div className="space-y-3">
          {log.loops.map((loop, idx) => (
            <LoopBlock key={loop.loopNumber} loop={loop} isLast={idx === log.loops.length - 1} />
          ))}
        </div>
      ) : isLoading ? (
        <div className="pl-4 flex items-center gap-2 text-[11px] text-amber-400/70">
          <Loader2 className="w-3 h-3 animate-spin" />
          Агенты работают...
        </div>
      ) : null}

      {/* Final result badge */}
      {log.status === "completed" && (
        <div className="pl-4">
          <div className="text-[9px] uppercase tracking-widest text-emerald-400/60 mb-1">
            Финальный перевод · {log.totalLoops} {log.totalLoops === 1 ? "итерация" : "итерации"}
          </div>
          <div className="text-[11px] text-emerald-300/80 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 leading-relaxed">
            {log.finalTranslation}
          </div>
        </div>
      )}

      {log.status === "error" && (
        <div className="pl-4 text-[11px] text-red-400/70 bg-red-500/5 border border-red-500/10 rounded-lg p-2">
          ⚠️ Ошибка — попробуй ещё раз
        </div>
      )}

      <div className="border-t border-border/30" />
    </div>
  )
}
