/**
 * Three-stage translation pipeline prompts + quality gate.
 *
 * Stage 1 — Draft    : pure 1:1 translation, no additions whatsoever
 * Stage 2 — Polish   : adapt tone to warm/soulful style, still no additions
 * Stage 3 — Mentality: rewrite using the real communication style of that country
 * Stage 4 — Quality  : gate — returns PASS or FAIL:<reason> (drives the loop)
 */

export function buildDraftPrompt(
  targetCountry: string,
  targetLang: string,
  userText: string,
  previousIssues?: string   // feedback from a previous loop's quality gate
): string {
  const feedbackBlock = previousIssues
    ? `\n⚠️ PREVIOUS ATTEMPT FAILED QUALITY CHECK. Issues to fix:\n${previousIssues}\n`
    : ''

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

export function buildCritiquePrompt(targetCountry: string, draft: string): string {
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

export function buildPolishPrompt(
  targetCountry: string,
  draft: string,
  critique: string
): string {
  return `You are rewriting a translated text to remove all traces of AI and machine translation.

Your only job: make the text sound exactly like a real person from ${targetCountry} wrote it — using the natural communication style, expressions, rhythm, and emotional warmth typical of that country's culture.

Rules:
- Output ONLY the final text. No labels, no comments, no preamble.
- Do NOT add any sentences not present in the draft. Do NOT remove any sentences.
- Eliminate any phrasing that sounds robotic, overly formal, or like it came from a machine.
- Use the specific speech patterns, colloquialisms, and emotional register of ${targetCountry}.
- The result must feel like a real person from ${targetCountry} typed this — not a translation.
- Preserve all emojis and paragraph formatting exactly as in the draft.

--- DRAFT ---
${draft}

--- CRITIQUE NOTES ---
${critique}`
}

export function buildQualityCheckPrompt(
  targetCountry: string,
  originalText: string,
  polishedText: string
): string {
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
