-- ============================================================
-- Astro Translator — Supabase SQL
-- Запускать в Supabase → SQL Editor
-- ============================================================

-- 1. История переводов
CREATE TABLE IF NOT EXISTS translator_translations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  manager_id    uuid NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
  manager_name  text NOT NULL,
  target_country text NOT NULL,
  target_lang   text NOT NULL,
  source_text   text NOT NULL,
  translation   text NOT NULL,
  total_loops   int NOT NULL DEFAULT 1,
  loops_json    jsonb,                 -- полный лог агентов
  status        text NOT NULL DEFAULT 'completed'
);

CREATE INDEX IF NOT EXISTS idx_translator_translations_manager
  ON translator_translations(manager_id);
CREATE INDEX IF NOT EXISTS idx_translator_translations_created
  ON translator_translations(created_at DESC);

-- RLS
ALTER TABLE translator_translations ENABLE ROW LEVEL SECURITY;

-- Видят свои — Sales, Consultant, SMM
CREATE POLICY "own_translations" ON translator_translations
  FOR SELECT USING (
    manager_id = (
      SELECT id FROM managers
      WHERE telegram_id = current_setting('app.telegram_id', true)
    )
  );

-- Видят все — C-level, Admin, SeniorSales, SeniorSMM
CREATE POLICY "admin_all_translations" ON translator_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM managers
      WHERE telegram_id = current_setting('app.telegram_id', true)
        AND role IN ('Admin', 'C-level', 'SeniorSales', 'SeniorSMM')
    )
  );

-- INSERT разрешён для всех аутентифицированных
CREATE POLICY "insert_own" ON translator_translations
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- 2. Промпты (редактируемые через настройки)
-- ============================================================
CREATE TABLE IF NOT EXISTS translator_prompts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  key         text UNIQUE NOT NULL,   -- 'draft' | 'critique' | 'polish' | 'quality'
  name_ru     text NOT NULL,
  description text,
  template    text NOT NULL           -- текст промпта с плейсхолдерами {{targetCountry}} и т.д.
);

-- Вставляем дефолтные промпты
INSERT INTO translator_prompts (key, name_ru, description, template) VALUES
(
  'draft',
  'Переводчик',
  'Чистый 1:1 перевод без добавлений',
  'You are a professional translator. Translate the text below into {{targetLang}} ({{targetCountry}}).
{{feedbackBlock}}
Rules:
- Output ONLY the translated text. Nothing else.
- Do NOT add greetings, conclusions, explanations, or any text not in the original.
- Do NOT remove any sentences. Every sentence in = every sentence out.
- Keep all emojis and paragraph breaks exactly as they are.
- Use the natural, modern dialect spoken in {{targetCountry}}.
- Address the recipient informally (singular "you"). Never use formal address.
- The recipient is female. Use feminine verb/adjective forms where applicable.

Text to translate:
{{userText}}'
),
(
  'critique',
  'Нейтивный редактор',
  'Ищет роботизированные фразы и предлагает замены',
  'You are a native SMM editor from {{targetCountry}}.

Read the translation below. Your only job is to identify phrases that sound robotic, translated, or unnatural — and suggest a warmer, more native alternative for each one.

Rules:
- Do NOT rewrite the full text.
- Do NOT add new sentences or ideas.
- Output ONLY bullet points: [original phrase] → [suggested fix].
- Focus on tone: it should feel warm, soulful, effortless — like a real person wrote it.

Translation:
{{draft}}'
),
(
  'polish',
  'Контент-криэйтор',
  'Убирает признаки ИИ, адаптирует под менталитет страны',
  'You are rewriting a translated text to remove all traces of AI and machine translation.

Your only job: make the text sound exactly like a real person from {{targetCountry}} wrote it — using the natural communication style, expressions, rhythm, and emotional warmth typical of that country''s culture.

Rules:
- Output ONLY the final text. No labels, no comments, no preamble.
- Do NOT add any sentences not present in the draft. Do NOT remove any sentences.
- Eliminate any phrasing that sounds robotic, overly formal, or like it came from a machine.
- Use the specific speech patterns, colloquialisms, and emotional register of {{targetCountry}}.
- The result must feel like a real person from {{targetCountry}} typed this — not a translation.
- Preserve all emojis and paragraph formatting exactly as in the draft.

--- DRAFT ---
{{draft}}

--- CRITIQUE NOTES ---
{{critique}}'
),
(
  'quality',
  'Контроль качества',
  'PASS или FAIL — финальная проверка',
  'You are a quality reviewer for SMM translations targeting {{targetCountry}}.

Compare the translation to the original. Return ONLY one of:
- "PASS" — translation is accurate, native-sounding, feminine, warm, and matches the original 1:1.
- "FAIL: <brief bullet list of specific issues>" — if any critical problems remain.

Criteria:
1. No additions or omissions — every sentence maps 1:1.
2. Sounds like a real native wrote it, not a translation.
3. Feminine verb/adjective forms used where applicable.
4. Informal address only — no formal pronouns.
5. Tone is warm and natural, matching how women in {{targetCountry}} actually speak.
6. No AI-sounding or robotic phrasing.

--- ORIGINAL ---
{{originalText}}

--- TRANSLATION ---
{{polishedText}}

Your verdict (PASS or FAIL: ...):'
)
ON CONFLICT (key) DO NOTHING;

-- Триггер updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER translator_prompts_updated_at
  BEFORE UPDATE ON translator_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS для промптов
ALTER TABLE translator_prompts ENABLE ROW LEVEL SECURITY;

-- Читают все
CREATE POLICY "prompts_read_all" ON translator_prompts FOR SELECT USING (true);

-- Редактируют только Admin/C-level/SeniorSMM/SeniorSales
CREATE POLICY "prompts_write_admin" ON translator_prompts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM managers
      WHERE telegram_id = current_setting('app.telegram_id', true)
        AND role IN ('Admin', 'C-level', 'SeniorSales', 'SeniorSMM')
    )
  );
