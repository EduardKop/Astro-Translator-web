-- ============================================================
-- Astro Translator — Supabase SQL
-- Запускать в Supabase → SQL Editor
-- ============================================================

-- ============================================================
-- 0. Одноразовые токены для авторизации через Telegram-бота
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_tokens (
  token       text PRIMARY KEY,                        -- UUID v4 одноразовый токен
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  used        boolean NOT NULL DEFAULT false,
  manager_id  uuid REFERENCES managers(id) ON DELETE CASCADE  -- заполняется ботом после верификации
);

-- Автоудаление протухших токенов (опционально, можно чистить по cron)
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at);

-- RLS: доступ только через service_role (anon не читает)
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_only" ON auth_tokens;
CREATE POLICY "service_only" ON auth_tokens USING (false);


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
DROP POLICY IF EXISTS "own_translations" ON translator_translations;
CREATE POLICY "own_translations" ON translator_translations
  FOR SELECT USING (
    manager_id = (
      SELECT id FROM managers
      WHERE telegram_id = current_setting('app.telegram_id', true)
    )
  );

-- Видят все — C-level, Admin, SeniorSales, SeniorSMM
DROP POLICY IF EXISTS "admin_all_translations" ON translator_translations;
CREATE POLICY "admin_all_translations" ON translator_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM managers
      WHERE telegram_id = current_setting('app.telegram_id', true)
        AND role IN ('Admin', 'C-level', 'SeniorSales', 'SeniorSMM')
    )
  );

-- INSERT разрешён для всех аутентифицированных
DROP POLICY IF EXISTS "insert_own" ON translator_translations;
CREATE POLICY "insert_own" ON translator_translations
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- 2. Промпты (редактируемые через настройки)
-- ============================================================
CREATE TABLE IF NOT EXISTS translator_prompts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  key         text UNIQUE NOT NULL,   -- 'translator' | 'critic' | 'terminologist' | 'refiner'
  name_ru     text NOT NULL,
  description text,
  template    text NOT NULL           -- текст промпта с плейсхолдерами {{targetCountry}} и т.д.
);

-- Вставляем дефолтные промпты
INSERT INTO translator_prompts (key, name_ru, description, template) VALUES
(
  'translator',
  'Переводчик',
  'Создаёт первичный черновик перевода, максимально близкий к смыслу',
  'You are a professional translator. Translate the text below into {{targetLang}} ({{targetCountry}}).
Make the translation as accurate and close to the original meaning as possible.

Original text:
{{userText}}'
),
(
  'critic',
  'Критик (Cultural & Context)',
  'Пишет замечания по идиомам, культурному контексту и стилю',
  'You are a Cultural & Context Critic. Review the translation below for a {{targetCountry}} audience.
DO NOT provide a new translation. Instead, provide a list of bullet-point suggestions/corrections focusing on:
- Idioms and cultural context
- Tone and style
- Natural phrasing for {{targetCountry}}

Original text:
{{userText}}

Draft Translation:
{{translator}}'
),
(
  'terminologist',
  'Специалист по терминам',
  'Проверяет терминологию и единообразие имён/названий',
  'You are a Terminology & Glossary Specialist. Review the translation below.
DO NOT provide a new translation. Instead, provide a list of bullet-point suggestions/corrections focusing on:
- Correct translation of technical terms, names, and concepts
- Consistency of terminology

Original text:
{{userText}}

Draft Translation:
{{translator}}'
),
(
  'refiner',
  'Редактор (Final Refiner)',
  'Формирует финальный текст с учётом всех правок',
  'You are an expert Final Refiner. Your task is to produce the final, polished translation for a {{targetCountry}} audience.
You are provided with the original text, a rough draft translation, and feedback from two specialists (a Cultural Critic and a Terminologist).
Use the feedback to improve the draft translation.

Output ONLY the final translation, without any additional explanations or introductory text.

Original text:
{{userText}}

Draft Translation:
{{translator}}

Cultural & Context Feedback:
{{critic}}

Terminology Feedback:
{{terminologist}}'
)
ON CONFLICT (key) DO UPDATE SET
  name_ru = EXCLUDED.name_ru,
  description = EXCLUDED.description,
  template = EXCLUDED.template;

-- Триггер updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS translator_prompts_updated_at ON translator_prompts;
CREATE TRIGGER translator_prompts_updated_at
  BEFORE UPDATE ON translator_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS для промптов
ALTER TABLE translator_prompts ENABLE ROW LEVEL SECURITY;

-- Читают все
DROP POLICY IF EXISTS "prompts_read_all" ON translator_prompts;
CREATE POLICY "prompts_read_all" ON translator_prompts FOR SELECT USING (true);

-- Редактируют только Admin/C-level/SeniorSMM/SeniorSales
DROP POLICY IF EXISTS "prompts_write_admin" ON translator_prompts;
CREATE POLICY "prompts_write_admin" ON translator_prompts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM managers
      WHERE telegram_id = current_setting('app.telegram_id', true)
        AND role IN ('Admin', 'C-level', 'SeniorSales', 'SeniorSMM')
    )
  );
