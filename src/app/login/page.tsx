"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Globe, Loader2, Shield, Send, ExternalLink } from "lucide-react"
import { Suspense } from "react"

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "Astro_Translator_Auth_bot"

// ── Main page (wrapped in Suspense for useSearchParams) ───────────────────────
function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")


  const errorCode = searchParams.get("error")

  // Auto-login if inside Telegram WebApp
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.initDataUnsafe?.user?.id) {
      doLogin(String(tg.initDataUnsafe.user.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  async function doLogin(telegramId: string) {
    setStatus("loading")
    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegram_id: telegramId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Нет доступа")
      }
      router.push("/")
      router.refresh()
    } catch (err: any) {
      setStatus("error")
      setErrorMsg(err.message)
    }
  }

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

            {status === "idle" && (
              <>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Доступ только для авторизованных сотрудников.
                </p>

                {/* Primary: open bot in Telegram */}
                <a
                  href={`https://t.me/${BOT_USERNAME}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl bg-[#229ED9] hover:bg-[#1a8bc2] text-white font-semibold text-sm transition-colors shadow-md"
                >
                  <Send className="w-4 h-4" />
                  Открыть в Telegram
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>

                <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed">
                  Напиши боту{" "}
                  <span className="font-semibold text-primary">
                    @{BOT_USERNAME}
                  </span>{" "}
                  команду <span className="font-semibold text-primary">/start</span>{" "}
                  — он откроет переводчик прямо в Telegram
                </p>


              </>
            )}

            {status === "loading" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Проверяем доступ...</p>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <p className="text-sm text-red-400 font-semibold mb-1">Нет доступа</p>
                  <p className="text-xs text-red-400/70">{errorMsg}</p>
                </div>
                <button
                  onClick={() => { setStatus("idle"); setErrorMsg("") }}
                  className="w-full text-sm text-primary hover:underline py-1"
                >
                  Попробовать снова
                </button>
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
