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
    // 🟡 Step 1: Validate environment variables
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ Missing OPENAI_API_KEY in environment.")
      return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 500 })
    }

    if (!process.env.LLAMA_CLOUD_API_KEY) {
      console.error("❌ Missing LLAMA_CLOUD_API_KEY in environment.")
      return NextResponse.json({ error: "Missing Llama Cloud API key" }, { status: 500 })
    }

    // 🟡 Step 2: Extract files from FormData
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]

    if (!files?.length) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 })
    }

    const sessionId = req.nextUrl.searchParams.get("sessionId") || "unknown-session"

    // 🧠 Initialize services
    const reader = new LlamaParseReader({
      resultType: "text",
      apiKey: process.env.LLAMA_CLOUD_API_KEY,
    })

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const allDocuments: any[] = []
    const parsedFiles: string[] = []

    // 🔁 Step 3: Parse uploaded files
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const extension = mime.extension(file.type) || "txt"
      const fileName = file.name || `${nanoid()}.${extension}`
      const tempPath = path.join(os.tmpdir(), `${nanoid()}.${extension}`)

      // Save temporarily
      await fs.writeFile(tempPath, buffer)

      try {
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
      } catch (err) {
        console.error(`⚠️ Failed to parse ${fileName}:`, err)
      }
    }

    if (!allDocuments.length) {
      return NextResponse.json({ error: "No content extracted." }, { status: 400 })
    }

    // 🧩 Step 4: Chunk text for embeddings (~1000 chars each)
    const fullText = allDocuments.map((d) => d.text).join("\n\n---\n\n")
    const chunks = fullText.match(/[\s\S]{1,1000}/g) || []

    if (!chunks.length) {
      return NextResponse.json({ error: "Failed to chunk content." }, { status: 500 })
    }

    console.log(`📄 Total Chunks: ${chunks.length} from ${parsedFiles.length} files`)

    // 🧬 Step 5: Generate embeddings
    const vectors: any[] = []
    for (const [i, chunk] of chunks.entries()) {
      try {
        const embeddingRes = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunk,
        })

        vectors.push({
          id: `chunk-${i}-${nanoid()}`,
          values: embeddingRes.data[0].embedding,
          metadata: {
            chunk,
            fileName: parsedFiles[Math.floor(i / (chunks.length / parsedFiles.length))] || parsedFiles[0],
            sessionId,
          },
        })
      } catch (err) {
        console.error(`❌ Embedding failed for chunk ${i}:`, err)
      }
    }

    if (!vectors.length) {
      return NextResponse.json({ error: "No embeddings generated." }, { status: 500 })
    }

    // ⬆️ Step 6: Upsert to Pinecone
    const namespace = "uploaded-docs"
    await pineconeIndex.namespace(namespace).upsert(vectors)

    // ✅ Step 7: Return success JSON
    return NextResponse.json({
      message: "Parsed and embedded successfully",
      sessionId,
      totalFiles: parsedFiles.length,
      totalChunks: chunks.length,
      parsedFiles,
    })
  } catch (error: any) {
    console.error("❌ Error in /api/parse:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
