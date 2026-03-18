import { NextResponse } from "next/server"
import { AgentStep, TranslationLoop } from "@/types"
import { getSession } from "@/lib/session"
import { supabase } from "@/lib/supabase"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_DEFAULT_MODEL =
  process.env.OPENROUTER_DEFAULT_MODEL || "google/gemini-2.5-flash"
const OPENROUTER_DRAFT_MODEL =
  process.env.OPENROUTER_DRAFT_MODEL || OPENROUTER_DEFAULT_MODEL
const MAX_LOOPS = 3

// ── OpenRouter call ───────────────────────────────────────────────────────────
async function askAI(content: string, model?: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://astrotranslator.web",
      "X-Title": "AstroTranslator Web",
    },
    body: JSON.stringify({
      model: model || OPENROUTER_DEFAULT_MODEL,
      messages: [{ role: "user", content }],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenRouter error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content.trim()
}

function makeStep(
  name: AgentStep["name"],
  nameRu: string,
  description: string,
  prompt: string,
  output: string
): AgentStep {
  return { name, nameRu, description, prompt, output, status: "completed" }
}

// ── Template renderer — replaces {{var}} placeholders ────────────────────────
function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "")
}

// ── Load prompts from Supabase (required) ────────────────────────────────────
async function loadPrompts(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("translator_prompts")
    .select("key, template")

  if (error || !data || data.length === 0) {
    throw new Error("Промпты не найдены в БД. Выполни SQL из supabase_translator.sql")
  }

  return Object.fromEntries(data.map((p: any) => [p.key, p.template]))
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { text, targetCountry, targetLang } = await req.json()

    if (!text || !targetCountry) {
      return NextResponse.json({ error: "Missing text or targetCountry" }, { status: 400 })
    }
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 })
    }

    const lang = targetLang || targetCountry
    const dbPrompts = await loadPrompts()
    const loops: TranslationLoop[] = []
    const steps: AgentStep[] = []

    // Stage 1: Translator (Draft)
    const tp = render(dbPrompts["translator"], { targetLang: lang, targetCountry, userText: text })
    const translatorOutput = await askAI(tp, OPENROUTER_DRAFT_MODEL)
    steps.push(makeStep("translator", "Переводчик", "Создаёт первичный черновик перевода", tp, translatorOutput))

    // Stage 2 & 3: Critic and Terminologist (Parallel execution)
    const cp = render(dbPrompts["critic"], { targetCountry, userText: text, translator: translatorOutput })
    const termP = render(dbPrompts["terminologist"], { targetCountry, userText: text, translator: translatorOutput })
    
    const [criticOutput, terminologistOutput] = await Promise.all([
      askAI(cp),
      askAI(termP)
    ])
    
    steps.push(makeStep("critic", "Критик (Cultural & Context)", "Пишет замечания по контексту и стилю", cp, criticOutput))
    steps.push(makeStep("terminologist", "Специалист по терминам", "Проверяет терминологию и имена", termP, terminologistOutput))

    // Stage 4: Refiner
    const rp = render(dbPrompts["refiner"], { targetCountry, userText: text, translator: translatorOutput, critic: criticOutput, terminologist: terminologistOutput })
    const finalTranslation = await askAI(rp)
    steps.push(makeStep("refiner", "Редактор (Final Refiner)", "Формирует финальный текст", rp, finalTranslation))

    const loopCount = 1
    loops.push({ loopNumber: loopCount, steps, qualityPassed: true })

    // Save to Supabase
    try {
      await supabase.from("translator_translations").insert({
        manager_id:     session.id,
        manager_name:   session.name,
        target_country: targetCountry,
        target_lang:    lang,
        source_text:    text,
        translation:    finalTranslation,
        total_loops:    loopCount,
        loops_json:     loops,
        status:         "completed",
      })
    } catch (dbErr) {
      console.error("Failed to save translation:", dbErr)
    }

    return NextResponse.json({ translation: finalTranslation, loops, totalLoops: loopCount })

  } catch (err: any) {
    console.error("API Error:", err)
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 })
  }
}
