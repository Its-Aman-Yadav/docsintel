import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
import mime from "mime-types"
import { nanoid } from "nanoid"
import { LlamaParseReader } from "llama-cloud-services"
import { pineconeIndex } from "@/lib/pinecone"
import OpenAI from "openai"
import dotenv from "dotenv"

dotenv.config()

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    // 🟡 Step 1: Extract files from FormData
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]

    if (!files?.length) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 })
    }

    const sessionId = nanoid() // unique ID per upload
    const reader = new LlamaParseReader({
      resultType: "text",
      apiKey: process.env.LLAMA_CLOUD_API_KEY!,
    })

    const allDocuments: any[] = []
    const parsedFiles: string[] = []

    // 🔄 Step 2: Loop through each uploaded file
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const extension = mime.extension(file.type) || "txt"
      const fileName = file.name || `${nanoid()}.${extension}`
      const tempPath = path.join(os.tmpdir(), `${nanoid()}.${extension}`)

      // Write file temporarily to disk
      await fs.writeFile(tempPath, buffer)

      // Parse with LlamaParse
      const documents = await reader.loadData(tempPath)
      await fs.unlink(tempPath)

      if (!documents?.length) continue

      const docsWithMeta = documents.map((doc) => ({
        ...doc,
        fileName,
        sessionId,
      }))

      allDocuments.push(...docsWithMeta)
      parsedFiles.push(fileName)
    }

    if (!allDocuments.length) {
      return NextResponse.json({ error: "No content extracted." }, { status: 400 })
    }

    // 🧱 Step 3: Chunk all text into 1000-character segments
    const fullText = allDocuments.map((d) => d.text).join("\n\n---\n\n")
    const chunks = fullText.match(/(.|[\r\n]){1,1000}/g) || []

    if (!chunks.length) {
      return NextResponse.json({ error: "Failed to chunk content." }, { status: 500 })
    }

    // 🧠 Step 4: Create embeddings for each chunk
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
    const namespace = "uploaded-docs"
    const vectors = []

    for (const [i, chunk] of chunks.entries()) {
      const embeddingRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      })

      vectors.push({
        id: `chunk-${i}-${nanoid()}`,
        values: embeddingRes.data[0].embedding,
        metadata: {
          chunk,
          sessionId,
          fileName: parsedFiles[0], // Change if handling multiple filenames per chunk
        },
      })
    }

    // ⬆️ Step 5: Upsert vectors into Pinecone
    await pineconeIndex.namespace(namespace).upsert(vectors)

    // ✅ Step 6: Return success
    return NextResponse.json({
      message: "Parsed and embedded successfully",
      sessionId,
      totalFiles: parsedFiles.length,
      totalChunks: chunks.length,
      parsedFiles,
      result: allDocuments,
    })
  } catch (error) {
    console.error("❌ Error in /api/parse:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
