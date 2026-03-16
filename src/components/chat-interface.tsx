"use client"

import { Message } from "@/types"
import { SendHorizontal, Loader2 } from "lucide-react"

export function ChatInterface({
  messages,
  input,
  setInput,
  onSend,
  isLoading,
}: {
  messages: Message[]
  input: string
  setInput: (v: string) => void
  onSend: () => void
  isLoading: boolean
}) {
  return (
    <div className="flex flex-col h-full bg-background border-r">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-3xl">✨</span>
            </div>
            <p className="text-sm font-medium">Выбери страну и введи текст для перевода.</p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm text-sm sm:text-[15px] leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-card border text-card-foreground rounded-tl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex w-full justify-start">
            <div className="bg-card border rounded-2xl rounded-tl-sm px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm flex items-center gap-2 sm:gap-3">
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-spin" />
              <span className="text-xs sm:text-sm text-muted-foreground">Перевожу...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-5 bg-card border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSend()
          }}
          className="relative flex items-end gap-2 sm:gap-3"
        >
          <div className="relative flex-1 bg-background border shadow-sm rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <textarea
              className="w-full bg-transparent outline-none p-3 sm:p-4 min-h-[48px] sm:min-h-[56px] max-h-[150px] sm:max-h-[200px] resize-none pb-3 sm:pb-4 text-base"
              placeholder="Введи текст для перевода..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  onSend()
                }
              }}
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <SendHorizontal className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  )
}
