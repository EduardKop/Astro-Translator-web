export interface Country {
  id: string
  code: string
  name: string
  nameRu: string
  lang: string
  emoji: string
  currency_code: string
  shift_start: string
  shift_end: string
  is_active: boolean
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

// ── Step within a single loop iteration ─────────────────────────────────────
export type StepName = "translator" | "critic" | "terminologist" | "refiner"

export interface AgentStep {
  name: StepName
  nameRu: string
  description: string
  prompt: string
  output: string
  status: "pending" | "in_progress" | "completed" | "error"
}

// ── One complete loop ────────────────────────────────────────────────────────
export interface TranslationLoop {
  loopNumber: number
  steps: AgentStep[]
  qualityPassed: boolean | null
}

// ── Top-level log entry per user message ────────────────────────────────────
export interface AgentLog {
  id: string
  sourceText: string
  targetCountry: string
  loops: TranslationLoop[]
  finalTranslation: string
  totalLoops: number
  status: "pending" | "in_progress" | "completed" | "error"
  timestamp: string
}

// ── History entry ────────────────────────────────────────────────────────────
export interface HistoryEntry {
  id: string
  sourceText: string
  targetCountry: string
  targetLang?: string
  finalTranslation: string
  totalLoops: number
  timestamp: string
  loops?: TranslationLoop[]
  // populated for admin roles
  managerName?: string
  managerId?: string
}

// ── Auth / User ──────────────────────────────────────────────────────────────
export type UserRole =
  | "Admin"
  | "C-level"
  | "SeniorSales"
  | "SeniorSMM"
  | "Sales"
  | "Consultant"
  | "SMM"

export const ADMIN_ROLES: UserRole[] = ["Admin", "C-level", "SeniorSales", "SeniorSMM"]

export interface Manager {
  id: string
  name: string
  role: UserRole
  avatar_url?: string
  telegram_id: string
  telegram_username?: string
  status: string
}

// ── Prompt (editable via settings) ──────────────────────────────────────────
export type PromptKey = "translator" | "critic" | "terminologist" | "refiner"

export interface TranslatorPrompt {
  id: string
  key: PromptKey
  name_ru: string
  description: string
  template: string
  updated_at: string
}

// ── Analytics ────────────────────────────────────────────────────────────────
export interface DailyStats {
  date: string          // YYYY-MM-DD
  count: number
  manager_id?: string
  manager_name?: string
}
