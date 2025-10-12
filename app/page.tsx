"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function DocumentUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [content, setContent] = useState("")
  const [highlightedContent, setHighlightedContent] = useState("")
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [answer, setAnswer] = useState("")
  const [sources, setSources] = useState<any[]>([])
  const [loadingAnswer, setLoadingAnswer] = useState(false)
  const [uploaded, setUploaded] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null)
    setError("")
    setContent("")
    setUploaded(false)
    setHighlightedContent("")
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file.")
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    setUploading(true)
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      setUploading(false)

      if (res.ok && Array.isArray(data.result)) {
        const fullText = data.result.map((doc: any) => doc.text).join("\n\n")
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
    if (!query) return
    setLoadingAnswer(true)
    setAnswer("Thinking...")
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      setAnswer(data.answer || "No answer found")
      setSources(data.sources || [])
      const highlighted = highlightSources(content, data.sources || [])
      setHighlightedContent(highlighted)
    } catch (err) {
      setAnswer("Error fetching answer.")
    } finally {
      setLoadingAnswer(false)
      setQuery("")
    }
  }

  return (
    <div className="flex h-[90vh] w-full border rounded-xl overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-1/5 border-r p-4 flex flex-col items-start justify-start space-y-4 bg-gray-50">
        <Input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} />
        {file && <p className="text-sm text-gray-600">Selected: {file.name}</p>}
        <Button onClick={handleUpload} disabled={uploading} className="w-full">
          {uploading ? "Uploading..." : "Upload Document"}
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Document Preview */}
      <div className="w-2/5 border-r p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-2 text-center">Document Preview</h2>
        <div
          className="prose dark:prose-invert max-h-full"
          dangerouslySetInnerHTML={{
            __html: highlightedContent.replace(/\n/g, "<br/>"),
          }}
        />
      </div>

      {/* Chat Area */}
      <div className="w-2/5 p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-2 text-center">Chat</h2>

        {uploaded ? (
          <>
            <div className="flex gap-2 mb-4">
              <Input
                type="text"
                placeholder="Ask something about your document..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button onClick={handleAsk} disabled={loadingAnswer || !query.trim()}>
                {loadingAnswer ? "Thinking..." : "Ask"}
              </Button>
            </div>

            {answer && (
              <div className="p-4 border rounded-md bg-gray-50 mb-4">
                <p className="font-semibold mb-1">Answer:</p>
                <p>{answer}</p>
              </div>
            )}

            {sources.length > 0 && (
              <div className="p-4 border rounded-md bg-gray-50">
                <p className="font-semibold mb-2">Sources:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {sources.slice(0, 3).map((s, i) => (
                    <li key={i}>
                      <span className="text-gray-700">{s.text?.slice(0, 100)}...</span>{" "}
                      <span className="text-sm text-gray-500">(from {s.fileName})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500 italic mt-10">
            Upload a document to start chatting with it.
          </div>
        )}
      </div>
    </div>
  )
}
