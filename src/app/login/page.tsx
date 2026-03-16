"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Globe, Loader2, Shield, Send } from "lucide-react"
import { Suspense } from "react"

// ── Main page ─────────────────────────────────────────────────────────────────
function LoginContent() {
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "waiting" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [botUrl, setBotUrl] = useState("")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tokenRef = useRef<string>("")

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function startLogin() {
    setStatus("waiting")
    setErrorMsg("")

    try {
      // 1. Генерируем токен на сервере
      const res = await fetch("/api/auth/token", { method: "POST" })
      if (!res.ok) throw new Error("Не удалось создать токен")
      const { token, botUrl: url } = await res.json()

      tokenRef.current = token
      setBotUrl(url)

      // 2. Открываем бота с токеном
      window.open(url, "_blank")

      // 3. Polling каждые 2 секунды
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/auth/poll?token=${token}`)
          const d = await r.json()

          if (d.status === "ok") {
            clearInterval(pollRef.current!)
            router.push("/")
            router.refresh()
          } else if (d.status === "expired") {
            clearInterval(pollRef.current!)
            setStatus("error")
            setErrorMsg("Время вышло. Попробуй снова.")
          } else if (d.status === "denied") {
            clearInterval(pollRef.current!)
            setStatus("error")
            setErrorMsg("У тебя нет доступа. Обратись к администратору.")
          }
          // "pending" — продолжаем polling
        } catch {
          // сетевая ошибка — игнорируем, продолжаем
        }
      }, 2000)

      // Таймаут 10 минут
      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current)
          setStatus("error")
          setErrorMsg("Время вышло. Попробуй снова.")
        }
      }, 10 * 60 * 1000)

    } catch (err: any) {
      setStatus("error")
      setErrorMsg(err.message || "Ошибка. Попробуй снова.")
    }
  }

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current)
    setBotUrl("")
    tokenRef.current = ""
    setStatus("idle")
    setErrorMsg("")
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
                <button
                  onClick={startLogin}
                  className="flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl bg-[#229ED9] hover:bg-[#1a8bc2] text-white font-semibold text-sm transition-colors shadow-md"
                >
                  <Send className="w-4 h-4" />
                  Войти через Telegram
                </button>
              </>
            )}

            {status === "waiting" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">Ожидаем подтверждения</p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Напиши боту <span className="text-primary font-semibold">/start</span> в Telegram
                  </p>
                </div>
                {botUrl && (
                  <a
                    href={botUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    <Send className="w-3 h-3" />
                    Открыть бота снова
                  </a>
                )}
                <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
                  Отмена
                </button>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <p className="text-sm text-red-400 font-semibold mb-1">Ошибка входа</p>
                  <p className="text-xs text-red-400/70">{errorMsg}</p>
                </div>
                <button
                  onClick={reset}
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
