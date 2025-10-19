"use client"

import { useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Message {
  type: "user" | "ai"
  message: string
  sources?: {
    id: number
    fileName: string
    pageNumber?: number
    snippet: string
  }[]
}

interface ChatPanelProps {
  uploaded: boolean
  query: string
  chatHistory: Message[]
  loadingAnswer: boolean
  onQueryChange: (value: string) => void
  onAsk: () => void
}

export function ChatPanel({
  uploaded,
  query,
  chatHistory,
  loadingAnswer,
  onQueryChange,
  onAsk,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory, loadingAnswer])

  if (!uploaded) {
    return (
      <div className="w-1/3 p-6 flex flex-col h-full bg-white dark:bg-gray-900 border-l">
        <h2 className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-white">
          Chat
        </h2>
        <p className="text-center text-gray-400 italic mt-10">
          Upload documents to start chatting with them.
        </p>
      </div>
    )
  }

  return (
    <div className="w-1/3 flex flex-col h-full border-l bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-white">Chat</h2>
      </div>

      {/* Chat Window */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`rounded-2xl px-5 py-3 max-w-[75%] text-sm shadow-sm ${
                msg.type === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-bl-none"
              }`}
            >
              {msg.message}
            </div>
          </div>
        ))}

        {loadingAnswer && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 text-gray-700 dark:text-white px-5 py-3 rounded-2xl text-sm shadow-sm">
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex gap-2">
        <Input
          type="text"
          placeholder="Ask something..."
          className="flex-1 rounded-full px-5 py-3 bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAsk()
          }}
        />
        <Button
          onClick={onAsk}
          disabled={loadingAnswer || !query.trim()}
          className="rounded-full px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm"
        >
          Send
        </Button>
      </div>
    </div>
  )
}
