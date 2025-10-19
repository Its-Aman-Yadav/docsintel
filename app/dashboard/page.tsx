"use client"

import { useState, useEffect } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"

import { FileUploadPanel } from "@/components/FileUploadPanel"
import { ChatPanel } from "@/components/ChatPanel"
import { Sources } from "@/components/Sources"

export default function DocumentUpload() {
  const router = useRouter()
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [user, setUser] = useState<any>(null)

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
  const [sessionId, setSessionId] = useState<string>("")

  // 🔐 Auth check on client
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/auth/login")
      } else {
        setUser(user)
      }
      setLoadingAuth(false)
    })

    return () => unsubscribe()
  }, [router])

  // ✅ Set session ID once on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      let session = sessionStorage.getItem("docsintel_session")
      if (!session) {
        session = crypto.randomUUID()
        sessionStorage.setItem("docsintel_session", session)
      }
      setSessionId(session)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(selectedFiles)
    setError("")
    setContent("")
    setHighlightedContent("")
    setUploaded(false)
    setChatHistory([])
    setSources([])
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one file.")
      return
    }

    const formData = new FormData()
    files.forEach((file) => formData.append("files", file))

    setUploading(true)
    setError("")

    try {
      const res = await fetch(`/api/parse?sessionId=${sessionId}`, {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      console.log("📄 Upload Response:", data)

      if (!res.ok) throw new Error(data.error || "Upload error.")
      if (!Array.isArray(data.result)) throw new Error("Unexpected format.")

      const textData = data.result.map((doc: any) => doc.text).join("\n\n---\n\n")
      if (!textData.trim()) throw new Error("Empty content.")

      setContent(textData)
      setHighlightedContent(textData)
      setUploaded(true)
    } catch (err: any) {
      console.error("❌ Upload Error:", err.message)
      setError(err.message || "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const handleAsk = async () => {
    if (!query.trim()) return

    setChatHistory((prev) => [...prev, { type: "user", message: query }])
    setLoadingAnswer(true)
    setQuery("")
    setSources([])

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, sessionId }),
      })

      const data = await res.json()

      setChatHistory((prev) => [
        ...prev,
        {
          type: "ai",
          message: data.answer || "No answer found.",
          sources: data.citations || [],
        },
      ])

      if (Array.isArray(data.citations)) {
        const mapped = data.citations.map((source: any, i: number) => {
          const matchedFile = files.find((file) =>
            source.documentName?.includes(file.name.split(".")[0])
          )

          return {
            text: source.text || "No text chunk provided.",
            fileName:
              matchedFile?.name ||
              source.fileName ||
              source.documentName ||
              `Source #${i + 1}`,
          }
        })

        setSources(mapped)
      }
    } catch (err) {
      console.error("❌ Query Error:", err)
      setChatHistory((prev) => [
        ...prev,
        { type: "ai", message: "Error fetching answer." },
      ])
    } finally {
      setLoadingAnswer(false)
    }
  }

  if (loadingAuth) {
    return <div className="text-center mt-20 text-blue-600">Checking authentication...</div>
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

      <ChatPanel
        uploaded={uploaded}
        query={query}
        chatHistory={chatHistory}
        loadingAnswer={loadingAnswer}
        onQueryChange={setQuery}
        onAsk={handleAsk}
      />

      <div className="w-[50%] bg-gray-50 overflow-y-auto">
        <Sources sources={sources} />
      </div>
    </div>
  )
}
