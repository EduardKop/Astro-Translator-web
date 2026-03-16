"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Globe, LogOut, Settings, BarChart2, User, ChevronDown, Search, Check } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Country, Manager, ADMIN_ROLES } from "@/types"
import Link from "next/link"
import { PromptsModal } from "@/components/prompts-modal"

const PROMPTS_ROLES = ["Admin", "C-level", "SeniorSMM"]

// ── Country Picker Modal ──────────────────────────────────────────────────────
function CountryModal({
  countries,
  selected,
  onSelect,
  onClose,
}: {
  countries: Country[]
  selected: string
  onSelect: (name: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const filtered = countries.filter((c) =>
    c.nameRu?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Выбор страны</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border/30 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск страны..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border/50 rounded-lg outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Country grid */}
        <div className="overflow-y-auto flex-1 p-4">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Ничего не найдено</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filtered.map((c) => {
                const isSelected = c.name === selected
                return (
                  <button
                    key={c.id}
                    onClick={() => { onSelect(c.name); onClose() }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                        : "border-border/40 bg-background/40 hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <span className="text-xl leading-none flex-shrink-0">{c.emoji}</span>
                    <span className={`text-[13px] font-medium flex-1 min-w-0 truncate ${
                      isSelected ? "text-primary" : "text-foreground/80"
                    }`}>
                      {c.nameRu}
                    </span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export function Navbar({
  selectedCountry,
  setSelectedCountry,
  countries,
  user,
  onLogout,
}: {
  selectedCountry: string
  setSelectedCountry: (c: string) => void
  countries: Country[]
  user: Manager | null
  onLogout: () => void
}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [promptsOpen, setPromptsOpen] = useState(false)

  useEffect(() => setMounted(true), [])

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")
  const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false
  const canEditPrompts = user ? PROMPTS_ROLES.includes(user.role) : false

  const currentCountry = countries.find((c) => c.name === selectedCountry)

  return (
    <>
      <nav className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 border-b bg-card flex-shrink-0 py-2.5 overflow-x-auto no-scrollbar">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_12px_rgba(59,130,246,0.25)]">
            <Globe className="w-4 h-4" />
          </div>
          <div className="leading-none hidden sm:block">
            <h1 className="text-sm font-bold tracking-tight whitespace-nowrap">Astro Translator</h1>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">SMM Localization</p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px self-stretch bg-border flex-shrink-0" />

        {/* Country picker button */}
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-primary/40 bg-primary/8 hover:bg-primary/12 hover:border-primary/60 transition-all duration-150 shadow-[0_0_8px_rgba(59,130,246,0.12)] group flex-shrink-0"
        >
          {currentCountry ? (
            <>
              <span className="text-lg leading-none">{currentCountry.emoji}</span>
              <div className="leading-none text-left hidden sm:block">
                <p className="text-[12px] font-semibold text-primary">{currentCountry.nameRu}</p>
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">Сменить страну</p>
              </div>
            </>
          ) : (
            <>
              <Globe className="w-4 h-4 text-muted-foreground" />
              <div className="leading-none text-left hidden sm:block">
                <p className="text-[12px] font-semibold text-foreground/70">Выбрать страну</p>
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">Не выбрано</p>
              </div>
            </>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary/60 transition-colors ml-0.5" />
        </button>

        {/* Prompts settings button (Admin / C-level / SeniorSMM only) */}
        {canEditPrompts && (
          <button
            onClick={() => setPromptsOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-border/40 bg-background/40 hover:border-primary/40 hover:bg-primary/5 transition-all duration-150 group flex-shrink-0"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            <div className="leading-none text-left hidden sm:block">
              <p className="text-[12px] font-semibold text-foreground/70 group-hover:text-foreground transition-colors">Настройка промптов</p>
              <p className="text-[9px] text-muted-foreground/50 mt-0.5">AI агенты</p>
            </div>
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Divider */}
        <div className="w-px self-stretch bg-border flex-shrink-0" />

        {/* Right side controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* User info */}
          {user && (
            <div className="flex items-center gap-1.5 sm:gap-2 border rounded-lg px-1.5 sm:px-2.5 py-1 sm:py-1.5 bg-background/60 flex-shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <div className="leading-none hidden sm:block">
                <p className="text-[11px] font-semibold">{user.name.split(" ")[0]}</p>
                <p className="text-[9px] text-muted-foreground/60">{user.role}</p>
              </div>
            </div>
          )}

          {/* Analytics (admin only) */}
          {isAdmin && (
            <Link
              href="/analytics"
              className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title="Аналитика"
            >
              <BarChart2 className="w-4 h-4" />
            </Link>
          )}

          {/* Settings (admin only) */}
          {isAdmin && (
            <Link
              href="/settings/prompts"
              className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title="Настройки промптов"
            >
              <Settings className="w-4 h-4" />
            </Link>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title="Тема"
          >
            {mounted && theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Logout */}
          {user && (
            <button
              onClick={onLogout}
              className="p-2 rounded-md hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </nav>

      {/* Country Modal */}
      {modalOpen && (
        <CountryModal
          countries={countries}
          selected={selectedCountry}
          onSelect={setSelectedCountry}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Prompts Modal */}
      {promptsOpen && (
        <PromptsModal onClose={() => setPromptsOpen(false)} />
      )}
    </>
  )
}
