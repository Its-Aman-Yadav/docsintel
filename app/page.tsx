"use client"

import { useState } from "react"
import { FileUploadPanel } from "@/components/FileUploadPanel"
import { DocumentPreview } from "@/components/DocumentPreview"
import { ChatPanel } from "@/components/ChatPanel"

export default function DocumentUpload() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [content, setContent] = useState("")
  const [highlightedContent, setHighlightedContent] = useState("")
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [chatHistory, setChatHistory] = useState<
    { type: "user" | "ai"; message: string; sources?: any[] }[]
  >([])

  const [sources, setSources] = useState<any[]>([])
  const [loadingAnswer, setLoadingAnswer] = useState(false)
  const [uploaded, setUploaded] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files || []))
    setError("")
    setContent("")
    setHighlightedContent("")
    setUploaded(false)
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one file.")
      return
    }

    const formData = new FormData()
    files.forEach((file) => formData.append("files", file))
    setUploading(true)

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      setUploading(false)

      if (res.ok && Array.isArray(data.result)) {
        const fullText = data.result.map((doc: any) => doc.text).join("\n\n---\n\n")
        setContent(fullText)
        setHighlightedContent(fullText)
        setUploaded(true)
      } else {
        setError(data.error || "Failed to extract content.")
      }
    } catch (err) {
      setError("Upload failed. Please try again.")
      setUploading(false)
    }
  }

  const highlightSources = (text: string, sources: any[]) => {
    if (!text || sources.length === 0) return text

    let highlighted = text

    sources.forEach((source) => {
      const fullChunk = source.text?.trim()
      if (!fullChunk) return

      const normalizedChunk = fullChunk.replace(/\s+/g, " ").trim()
      const normalizedText = highlighted.replace(/\s+/g, " ")

      const escaped = normalizedChunk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

      try {
        const regex = new RegExp(escaped, "gi")
        if (regex.test(normalizedText)) {
          highlighted = highlighted.replace(
            regex,
            (match) => `<mark class="bg-yellow-200 px-1 rounded">${match}</mark>`
          )
        }
      } catch (e) {
        console.error("❌ Regex error:", e)
      }
    })

    return highlighted
  }

  const handleAsk = async () => {
    if (!query.trim()) return

    // Push user message
    setChatHistory((prev) => [...prev, { type: "user", message: query }])
    setLoadingAnswer(true)
    setQuery("")

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })

      const data = await res.json()

      // Push AI message
      setChatHistory((prev) => [
        ...prev,
        { type: "ai", message: data.answer || "No answer found", sources: data.sources || [] },
      ])

      // Highlight updated content
      const highlighted = highlightSources(content, data.sources || [])
      setHighlightedContent(highlighted)
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { type: "ai", message: "Error fetching answer." },
      ])
    } finally {
      setLoadingAnswer(false)
    }
  }

  return (
    <div className="flex h-[90vh] w-full border rounded-xl overflow-hidden">
      <FileUploadPanel
        files={files}
        onFileChange={handleFileChange}
        onUpload={handleUpload}
        uploading={uploading}
        error={error}
      />
      <DocumentPreview highlightedContent={highlightedContent} />
      <ChatPanel
        uploaded={uploaded}
        query={query}
        chatHistory={chatHistory}
        loadingAnswer={loadingAnswer}
        onQueryChange={setQuery}
        onAsk={handleAsk}
      />

    </div>
  )
}
