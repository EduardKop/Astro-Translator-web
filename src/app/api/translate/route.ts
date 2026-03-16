import { NextResponse } from "next/server"
import { AgentStep, TranslationLoop } from "@/types"
import { getSession } from "@/lib/session"
import { supabase } from "@/lib/supabase"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_DEFAULT_MODEL =
  process.env.OPENROUTER_DEFAULT_MODEL || "google/gemini-2.5-flash"
const MAX_LOOPS = 3

// ── OpenRouter call ───────────────────────────────────────────────────────────
async function askAI(content: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://astrotranslator.web",
      "X-Title": "AstroTranslator Web",
    },
    body: JSON.stringify({
      model: OPENROUTER_DEFAULT_MODEL,
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

// ── Load prompts from Supabase (fallback to hardcoded) ───────────────────────
async function loadPrompts(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase
      .from("translator_prompts")
      .select("key, template")
    if (data && data.length > 0) {
      return Object.fromEntries(data.map((p: any) => [p.key, p.template]))
    }
  } catch {}
  return {} // fallback: will use inline builders below
}

// ── Template renderer — replaces {{var}} placeholders ────────────────────────
function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "")
}

// ── Inline prompt builders (fallback if DB is empty) ────────────────────────
function draftPrompt(targetCountry: string, targetLang: string, userText: string, feedbackBlock: string) {
  return `You are a professional translator. Translate the text below into ${targetLang} (${targetCountry}).
${feedbackBlock}
Rules:
- Output ONLY the translated text. Nothing else.
- Do NOT add greetings, conclusions, explanations, or any text not in the original.
- Do NOT remove any sentences. Every sentence in = every sentence out.
- Keep all emojis and paragraph breaks exactly as they are.
- Use the natural, modern dialect spoken in ${targetCountry}.
- Address the recipient informally (singular "you"). Never use formal address.
- The recipient is female. Use feminine verb/adjective forms where applicable.

Text to translate:
${userText}`
}

function critiquePrompt(targetCountry: string, draft: string) {
  return `You are a native SMM editor from ${targetCountry}.

Read the translation below. Your only job is to identify phrases that sound robotic, translated, or unnatural — and suggest a warmer, more native alternative for each one.

Rules:
- Do NOT rewrite the full text.
- Do NOT add new sentences or ideas.
- Output ONLY bullet points: [original phrase] → [suggested fix].
- Focus on tone: it should feel warm, soulful, effortless — like a real person wrote it.

Translation:
${draft}`
}

function polishPrompt(targetCountry: string, draft: string, critique: string) {
  return `You are rewriting a translated text to remove all traces of AI and machine translation.

Your only job: make the text sound exactly like a real person from ${targetCountry} wrote it — using the natural communication style, expressions, rhythm, and emotional warmth typical of that country's culture.

Rules:
- Output ONLY the final text. No labels, no comments, no preamble.
- Do NOT add any sentences not present in the draft. Do NOT remove any sentences.
- Eliminate any phrasing that sounds robotic, overly formal, or like it came from a machine.
- Use the specific speech patterns, colloquialisms, and emotional register of ${targetCountry}.
- The result must feel like a real person from ${targetCountry}} typed this — not a translation.
- Preserve all emojis and paragraph formatting exactly as in the draft.

--- DRAFT ---
${draft}

--- CRITIQUE NOTES ---
${critique}`
}

function qualityPrompt(targetCountry: string, originalText: string, polishedText: string) {
  return `You are a quality reviewer for SMM translations targeting ${targetCountry}.

Compare the translation to the original. Return ONLY one of:
- "PASS" — translation is accurate, native-sounding, feminine, warm, and matches the original 1:1.
- "FAIL: <brief bullet list of specific issues>" — if any critical problems remain.

Criteria:
1. No additions or omissions — every sentence maps 1:1.
2. Sounds like a real native wrote it, not a translation.
3. Feminine verb/adjective forms used where applicable.
4. Informal address only — no formal pronouns.
5. Tone is warm and natural, matching how women in ${targetCountry} actually speak.
6. No AI-sounding or robotic phrasing.

--- ORIGINAL ---
${originalText}

--- TRANSLATION ---
${polishedText}

Your verdict (PASS or FAIL: ...):`.trim()
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    // Auth check
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

    let previousIssues: string | undefined = undefined
    let finalTranslation = ""
    let loopCount = 0

    for (let i = 0; i < MAX_LOOPS; i++) {
      loopCount = i + 1
      const steps: AgentStep[] = []
      const feedbackBlock = previousIssues
        ? `\n⚠️ PREVIOUS ATTEMPT FAILED QUALITY CHECK. Issues to fix:\n${previousIssues}\n`
        : ""

      // Stage 1: Draft
      const dp = dbPrompts["draft"]
        ? render(dbPrompts["draft"], { targetLang: lang, targetCountry, feedbackBlock, userText: text })
        : draftPrompt(targetCountry, lang, text, feedbackBlock)
      const draft = await askAI(dp)
      steps.push(makeStep("draft", "Переводчик", "Создаёт первичный черновик перевода", dp, draft))

      // Stage 2: Critique
      const cp = dbPrompts["critique"]
        ? render(dbPrompts["critique"], { targetCountry, draft })
        : critiquePrompt(targetCountry, draft)
      const critique = await askAI(cp)
      steps.push(makeStep("critique", "Нейтивный редактор", "Выявляет AI-тени и нативность", cp, critique))

      // Stage 3: Polish
      const pp = dbPrompts["polish"]
        ? render(dbPrompts["polish"], { targetCountry, draft, critique })
        : polishPrompt(targetCountry, draft, critique)
      const polished = await askAI(pp)
      steps.push(makeStep("polish", "Контент-криэйтор", "Убирает признаки перевода и ИИ", pp, polished))

      // Stage 4: Quality
      const qp = dbPrompts["quality"]
        ? render(dbPrompts["quality"], { targetCountry, originalText: text, polishedText: polished })
        : qualityPrompt(targetCountry, text, polished)
      const qualityOutput = await askAI(qp)
      const qualityPassed = qualityOutput.trim().toUpperCase().startsWith("PASS")
      steps.push(makeStep("quality", "Контроль качества", "Финальная проверка точности и нативности", qp, qualityOutput))

      loops.push({ loopNumber: loopCount, steps, qualityPassed })
      finalTranslation = polished

      if (qualityPassed) break
      previousIssues = qualityOutput.replace(/^FAIL[:\s]*/i, "").trim()
    }

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
      // Non-fatal — translation still returns OK
    }

    return NextResponse.json({ translation: finalTranslation, loops, totalLoops: loopCount })

  } catch (err: any) {
    console.error("API Error:", err)
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 })
  }
}
