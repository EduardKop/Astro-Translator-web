"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Globe, Check, LogOut, Settings, BarChart2, User } from "lucide-react"
import { useEffect, useState } from "react"
import { Country, Manager, ADMIN_ROLES } from "@/types"
import Link from "next/link"

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

  useEffect(() => setMounted(true), [])

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")

  const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false

  // Split into 2 rows
  const valid = countries.filter((c) => c.nameRu)
  const half = Math.ceil(valid.length / 2)
  const row1 = valid.slice(0, half)
  const row2 = valid.slice(half)

  return (
    <nav className="flex items-center gap-3 px-5 border-b bg-card flex-shrink-0 py-2">
      {/* Logo */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_12px_rgba(59,130,246,0.25)]">
          <Globe className="w-4 h-4" />
        </div>
        <div className="leading-none">
          <h1 className="text-sm font-bold tracking-tight whitespace-nowrap">Astro Translator</h1>
          <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">SMM Localization</p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px self-stretch bg-border flex-shrink-0" />

      {/* Country cards — 2 rows */}
      <div className="flex-1 flex flex-col gap-1 py-0.5 min-w-0">
        {[row1, row2].map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-1.5 flex-wrap">
            {row.map((c) => {
              const isSelected = c.name === selectedCountry
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCountry(c.name)}
                  title={c.nameRu}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all duration-150 flex-shrink-0 ${
                    isSelected
                      ? "border-primary bg-primary/15 shadow-[0_0_6px_rgba(59,130,246,0.25)]"
                      : "border-border/40 bg-background/40 hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <span className="text-[15px] leading-none">{c.emoji}</span>
                  <span className={`text-[11px] font-medium whitespace-nowrap ${
                    isSelected ? "text-primary" : "text-foreground/70"
                  }`}>
                    {c.nameRu}
                  </span>
                  {isSelected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-1.5 h-1.5 text-white" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px self-stretch bg-border flex-shrink-0" />

      {/* Right side controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* User info */}
        {user && (
          <div className="flex items-center gap-2 border rounded-lg px-2.5 py-1.5 bg-background/60">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <div className="leading-none">
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

        {/* Settings / Prompts (admin only) */}
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
  )
}
