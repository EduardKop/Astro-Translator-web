"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Globe, Loader2, Shield } from "lucide-react"
import { Suspense } from "react"

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "Astro_Translator_Auth_bot"

// ── Main page (wrapped in Suspense for useSearchParams) ───────────────────────
function LoginContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const widgetRef = useRef<HTMLDivElement>(null)

  const errorCode = searchParams.get("error")

  // Show error from redirect params
  useEffect(() => {
    if (errorCode === "denied") {
      setStatus("error")
      setErrorMsg("У тебя нет доступа. Обратись к администратору.")
    } else if (errorCode === "invalid" || errorCode === "expired") {
      setStatus("error")
      setErrorMsg("Ссылка устарела или невалидна. Попробуй ещё раз.")
    }
  }, [errorCode])

  // Inject Telegram Login Widget script
  useEffect(() => {
    if (!widgetRef.current) return
    widgetRef.current.innerHTML = ""

    const script = document.createElement("script")
    script.src = "https://telegram.org/js/telegram-widget.js?22"
    script.setAttribute("data-telegram-login", BOT_USERNAME)
    script.setAttribute("data-size", "large")
    script.setAttribute("data-auth-url", "/api/auth/telegram-widget")
    script.setAttribute("data-request-access", "write")
    script.async = true

    widgetRef.current.appendChild(script)
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[360px]">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
            <Globe className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Astro Translator</h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-1">
              Expert SMM Localization
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">

          {/* Card header */}
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border/50">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Вход через Telegram</span>
          </div>

          <div className="p-5 space-y-5">

            {(status === "idle" || status === "error") && (
              <>
                {status === "error" && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <p className="text-sm text-red-400 font-semibold mb-1">Нет доступа</p>
                    <p className="text-xs text-red-400/70">{errorMsg}</p>
                  </div>
                )}

                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Доступ только для авторизованных сотрудников. Нажми кнопку ниже и войди через Telegram.
                </p>

                {/* Telegram Login Widget */}
                <div className="flex justify-center" ref={widgetRef} />
              </>
            )}

            {status === "loading" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Проверяем доступ...</p>
              </div>
            )}

          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/30 mt-5">
          Astro Translator · Только для внутреннего использования
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
