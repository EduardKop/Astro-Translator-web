"use client"

import { useState, useEffect, useCallback } from "react"
import { AgentLog, HistoryEntry, Country, Message, TranslationLoop, Manager, ADMIN_ROLES } from "@/types"
import { Navbar } from "@/components/navbar"
import { ChatInterface } from "@/components/chat-interface"
import { LogicPanel } from "@/components/logic-panel"
import { HistoryPanel } from "@/components/history-panel"
import { Terminal, Clock, BarChart2 } from "lucide-react"
import { useRouter } from "next/navigation"

type RightTab = "pipeline" | "history"

export default function Home() {
  const router = useRouter()
  const [messages, setMessages]         = useState<Message[]>([])
  const [logs, setLogs]                 = useState<AgentLog[]>([])
  const [input, setInput]               = useState("")
  const [isLoading, setIsLoading]       = useState(false)
  const [selectedCountry, setSelectedCountry] = useState("")
  const [countries, setCountries]       = useState<Country[]>([])
  const [rightTab, setRightTab]         = useState<RightTab>("pipeline")
  const [history, setHistory]           = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [user, setUser]                 = useState<Manager | null>(null)

  // Load current user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setUser(d.user) })
      .catch(() => {})
  }, [])

  // Load countries + restore from localStorage
  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then((d) => {
        if (d.countries?.length > 0) {
          setCountries(d.countries)
          const saved = localStorage.getItem("selectedCountry")
          const exists = d.countries.find((c: any) => c.name === saved)
          setSelectedCountry(exists ? saved! : d.countries[0].name)
        }
      })
      .catch(() => {})
  }, [])

  // Load history from API
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/history")
      if (res.ok) {
        const d = await res.json()
        setHistory(d.entries || [])
      }
    } catch {}
    finally { setHistoryLoading(false) }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const handleSend = async () => {
    if (!input.trim() || isLoading || !selectedCountry) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setRightTab("pipeline")

    const logId = Date.now().toString()
    const pendingLog: AgentLog = {
      id: logId,
      sourceText: userMessage.content,
      targetCountry: selectedCountry,
      loops: [],
      finalTranslation: "",
      totalLoops: 0,
      status: "in_progress",
      timestamp: new Date().toISOString(),
    }
    setLogs((prev) => [...prev, pendingLog])

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userMessage.content, targetCountry: selectedCountry }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Translation failed")

      const loops: TranslationLoop[] = data.loops ?? []
      const translation: string = data.translation

      setLogs((prev) =>
        prev.map((log) =>
          log.id === logId
            ? { ...log, loops, finalTranslation: translation, totalLoops: data.totalLoops, status: "completed" }
            : log
        )
      )

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: translation },
      ])

      // Refresh history from API
      loadHistory()

    } catch (error) {
      console.error(error)
      setLogs((prev) =>
        prev.map((log) =>
          log.id === logId ? { ...log, status: "error", finalTranslation: "" } : log
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      <Navbar
        selectedCountry={selectedCountry}
        setSelectedCountry={(c) => {
          setSelectedCountry(c)
          localStorage.setItem("selectedCountry", c)
        }}
        countries={countries}
        user={user}
        onLogout={async () => {
          await fetch("/api/auth/logout", { method: "POST" })
          router.push("/login")
        }}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Chat */}
        <div className="flex-1 md:w-1/2 md:min-w-[300px] border-b md:border-b-0 md:border-r border-border flex flex-col overflow-hidden">
          <ChatInterface
            messages={messages}
            input={input}
            setInput={setInput}
            onSend={handleSend}
            isLoading={isLoading}
          />
        </div>

        {/* Right: tabbed panel */}
        <div className="flex-1 md:w-1/2 md:min-w-[300px] flex flex-col overflow-hidden">
          <div className="flex border-b border-border bg-background/80 backdrop-blur-md flex-shrink-0">
            <TabButton
              active={rightTab === "pipeline"}
              onClick={() => setRightTab("pipeline")}
              icon={<Terminal className="w-3.5 h-3.5" />}
              label="Агенты"
            />
            <TabButton
              active={rightTab === "history"}
              onClick={() => setRightTab("history")}
              icon={<Clock className="w-3.5 h-3.5" />}
              label="История"
              badge={history.length || undefined}
            />
            {isAdmin && (
              <TabButton
                active={false}
                onClick={() => router.push("/analytics")}
                icon={<BarChart2 className="w-3.5 h-3.5" />}
                label="Аналитика"
              />
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {rightTab === "pipeline" ? (
              <LogicPanel logs={logs} />
            ) : (
              <HistoryPanel
                entries={history}
                isAdmin={isAdmin}
                loading={historyLoading}
                onRefresh={loadHistory}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function TabButton({
  active, onClick, icon, label, badge,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-0.5 text-[9px] bg-primary/20 text-primary rounded-full px-1.5 py-0.5 font-semibold">
          {badge}
        </span>
      )}
    </button>
  )
}
