"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

  // 📂 Handle File Upload
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

      if (res.ok && data.result?.[0]?.text) {
        setContent(data.result[0].text)
        setHighlightedContent(data.result[0].text)
        setUploaded(true)
      } else {
        setError(data.error || "Failed to extract content.")
      }
    } catch (err) {
      setError("Upload failed. Please try again.")
      setUploading(false)
    }
  }

  // 🟨 Highlight function
  const highlightSources = (text: string, sources: any[]) => {
    let highlighted = text
    sources.forEach((s) => {
      if (s.text) {
        // take a slice to make matching easier
        const snippet = s.text.slice(0, 80)
        const escaped = snippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const regex = new RegExp(escaped, "i")
        highlighted = highlighted.replace(
          regex,
          `<mark class="bg-yellow-200 px-1 rounded">${snippet}</mark>`
        )
      }
    })
    return highlighted
  }

  // 💬 Handle Chat with Docs
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
      setHighlightedContent(highlightSources(content, data.sources || []))
    } catch (err) {
      setAnswer("Error fetching answer.")
    } finally {
      setLoadingAnswer(false)
      setQuery("") // clear input after asking
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 space-y-8">
      {/* === Upload Section === */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} />
          {file && <p className="text-sm text-gray-600">Selected: {file.name}</p>}

          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload & Parse"}
          </Button>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {content && (
            <div
              className="mt-6 border p-4 rounded-md bg-gray-50 max-h-[400px] overflow-auto prose dark:prose-invert"
              dangerouslySetInnerHTML={{
                __html: highlightedContent.replace(/\n/g, "<br/>"),
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* === Chat Section === */}
      {uploaded ? (
        <Card>
          <CardHeader>
            <CardTitle>Chat with Your Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
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
              <div className="p-4 border rounded-md bg-gray-50">
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
          </CardContent>
        </Card>
      ) : (
        <div className="text-center text-gray-500 italic">
          Upload a document above to start chatting with it.
        </div>
      )}
    </div>
  )
}
