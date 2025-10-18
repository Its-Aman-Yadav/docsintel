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
            <div className="w-2/5 p-4 flex flex-col h-full bg-white dark:bg-gray-900">
                <h2 className="text-lg font-semibold mb-2 text-center">Chat</h2>
                <div className="text-center text-gray-500 italic mt-10">
                    Upload documents to start chatting with them.
                </div>
            </div>
        )
    }

    return (
        <div className="w-2/5 flex flex-col h-full border-l bg-white dark:bg-gray-900">
            <div className="px-4 py-2 border-b">
                <h2 className="text-lg font-semibold text-center">Chat</h2>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`px-4 py-2 rounded-lg max-w-[80%] whitespace-pre-wrap text-sm ${msg.type === "user"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
                                }`}
                        >
                            {msg.message}
                            {msg.type === "ai" && msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 border-t pt-2 text-xs text-gray-600 dark:text-gray-300">
                                    <p className="font-semibold mb-1">Sources:</p>
                                    <ol className="list-decimal ml-5 space-y-2">
                                        {msg.sources.slice(0, 2).map((s) => (
                                            <li key={s.id}>
                                                {s.pageNumber && <> — page {s.pageNumber}</>}
                                                <span className="italic text-gray-500">“{s.snippet}”</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                        </div>
                    </div>
                ))}

                {/* Typing... */}
                {loadingAnswer && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg text-sm">
                            Thinking...
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t flex gap-2">
                <Input
                    type="text"
                    placeholder="Ask something..."
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onAsk()
                    }}
                />
                <Button onClick={onAsk} disabled={loadingAnswer || !query.trim()}>
                    Send
                </Button>
            </div>
        </div>
    )
}
