import { NextResponse } from "next/server"
import { AgentStep, TranslationLoop } from "@/types"
import { getSession } from "@/lib/session"
import { supabase } from "@/lib/supabase"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_DEFAULT_MODEL =
  process.env.OPENROUTER_DEFAULT_MODEL || "google/gemini-2.5-flash"
const OPENROUTER_DRAFT_MODEL =
  process.env.OPENROUTER_DRAFT_MODEL || OPENROUTER_DEFAULT_MODEL

// ── OpenRouter call ───────────────────────────────────────────────────────────
async function askAI(content: string, model?: string): Promise<{ content: string; modelUsed: string }> {
  const actualModel = model || OPENROUTER_DEFAULT_MODEL
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://astrotranslator.web",
      "X-Title": "AstroTranslator Web",
    },
    body: JSON.stringify({
      model: actualModel,
      messages: [{ role: "user", content }],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenRouter error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0].message.content.trim(),
    modelUsed: data.model || actualModel,
  }
}

function makeStep(
  name: AgentStep["name"],
  nameRu: string,
  description: string,
  prompt: string,
  output: string,
  modelUsed?: string
): AgentStep {
  return { name, nameRu, description, prompt, output, status: "completed", modelUsed }
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

    const { text, targetCountry, targetLang, tone } = await req.json()

    if (!text || !targetCountry) {
      return NextResponse.json({ error: "Missing text or targetCountry" }, { status: 400 })
    }
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 })
    }

    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    const sendEvent = async (event: any) => {
      await writer.write(encoder.encode(JSON.stringify(event) + "\n"))
    }

    // Start background processing
    ;(async () => {
      try {
        const lang = targetLang || targetCountry
        const dbPrompts = await loadPrompts()
        const loops: TranslationLoop[] = []
        const steps: AgentStep[] = []

        // Stage 1: Translator (Draft)
        await sendEvent({ type: "start", agent: "translator" })
        const tp = render(dbPrompts["translator"], { targetLang: lang, targetCountry, userText: text })
        const translatorRes = await askAI(tp, OPENROUTER_DRAFT_MODEL)
        const stepTranslator = makeStep("translator", "Переводчик", "Создаёт первичный черновик перевода", tp, translatorRes.content, translatorRes.modelUsed)
        steps.push(stepTranslator)
        await sendEvent({ type: "done", agent: "translator", step: stepTranslator })

        // Stage 2, 3, 4: Critic, Terminologist and Stylist (Parallel execution)
        await sendEvent({ type: "start", agent: "critic" })
        await sendEvent({ type: "start", agent: "terminologist" })
        await sendEvent({ type: "start", agent: "stylist" })
        
        const cp = render(dbPrompts["critic"], { targetCountry, userText: text, translator: translatorRes.content })
        const termP = render(dbPrompts["terminologist"], { targetCountry, userText: text, translator: translatorRes.content })
        const sp = render(dbPrompts["stylist"], { targetCountry, userText: text, translator: translatorRes.content, tone: tone || "Стандартный перевод" })
        
        const [criticRes, terminologistRes, stylistRes] = await Promise.all([
          askAI(cp),
          askAI(termP),
          askAI(sp)
        ])
        
        const stepCritic = makeStep("critic", "Критик (Cultural & Context)", "Пишет замечания по контексту и стилю", cp, criticRes.content, criticRes.modelUsed)
        const stepTerm = makeStep("terminologist", "Специалист по терминам", "Проверяет терминологию и имена", termP, terminologistRes.content, terminologistRes.modelUsed)
        const stepStylist = makeStep("stylist", "Стилист (Tone & Vibe)", "Оценивает и адаптирует эмоциональный окрас", sp, stylistRes.content, stylistRes.modelUsed)
        
        steps.push(stepCritic)
        steps.push(stepTerm)
        steps.push(stepStylist)
        
        await sendEvent({ type: "done", agent: "critic", step: stepCritic })
        await sendEvent({ type: "done", agent: "terminologist", step: stepTerm })
        await sendEvent({ type: "done", agent: "stylist", step: stepStylist })

        // Stage 5: Refiner
        await sendEvent({ type: "start", agent: "refiner" })
        const rp = render(dbPrompts["refiner"], { 
          targetCountry, 
          userText: text, 
          translator: translatorRes.content, 
          critic: criticRes.content, 
          terminologist: terminologistRes.content,
          stylist: stylistRes.content
        })
        const finalRes = await askAI(rp, OPENROUTER_DRAFT_MODEL)
        const stepRefiner = makeStep("refiner", "Редактор (Final Refiner)", "Формирует финальный текст", rp, finalRes.content, finalRes.modelUsed)
        steps.push(stepRefiner)
        await sendEvent({ type: "done", agent: "refiner", step: stepRefiner })

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
            translation:    finalRes.content,
            total_loops:    loopCount,
            loops_json:     loops,
            status:         "completed",
          })
        } catch (dbErr) {
          console.error("Failed to save translation:", dbErr)
        }

        await sendEvent({ type: "finish", translation: finalRes.content, loops, totalLoops: loopCount })
      } catch (err: any) {
        console.error("Pipeline Error:", err)
        await sendEvent({ type: "error", error: err.message || "Internal Server Error" })
      } finally {
        await writer.close()
      }
    })()

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    })

  } catch (err: any) {
    console.error("API Error:", err)
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 })
  }
}
