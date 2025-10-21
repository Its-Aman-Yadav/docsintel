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
    if (!process.env.OPENAI_API_KEY || !process.env.LLAMA_CLOUD_API_KEY) {
      console.error("❌ Missing API keys.")
      return NextResponse.json({ error: "Missing API keys" }, { status: 500 })
    }

    const formData = await req.formData()
    const files = formData.getAll("files") as File[]
    const sessionId = req.nextUrl.searchParams.get("sessionId") || "unknown-session"

    console.log("📥 Received files:", files.map((f) => f.name))
    if (!files?.length) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 })
    }

    const reader = new LlamaParseReader({
      resultType: "text",
      apiKey: process.env.LLAMA_CLOUD_API_KEY,
    })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const allDocuments: any[] = []
    const parsedFiles: string[] = []

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const extension = mime.extension(file.type) || "txt"
      const fileName = file.name || `${nanoid()}.${extension}`
      const tempPath = path.join(os.tmpdir(), `${nanoid()}.${extension}`)

      console.log(`📄 Saving temp file: ${fileName} at ${tempPath}`)

      await fs.writeFile(tempPath, buffer)

      try {
        const documents = await reader.loadData(tempPath)
        await fs.unlink(tempPath)

        console.log(`✅ Parsed: ${fileName}, Total Docs: ${documents.length}`)

        if (!documents?.length) continue

        const docsWithMeta = documents.map((doc) => ({
          ...doc,
          fileName,
          sessionId,
        }))

        allDocuments.push(...docsWithMeta)
        parsedFiles.push(fileName)
      } catch (err) {
        console.error(`⚠️ Parsing failed for ${fileName}:`, err)
      }
    }

    if (!allDocuments.length) {
      return NextResponse.json({ error: "No content extracted." }, { status: 400 })
    }

    const fullText = allDocuments.map((d) => d.text).join("\n\n---\n\n")
    const chunks = fullText.match(/[\s\S]{1,1000}/g) || []

    console.log(`📑 Total Chunks: ${chunks.length}`)

    if (!chunks.length) {
      return NextResponse.json({ error: "Failed to chunk content." }, { status: 500 })
    }

    const vectors: any[] = []

    for (const [i, chunk] of chunks.entries()) {
      try {
        console.log(`🧬 Generating embedding for chunk ${i}...`)
        const embeddingRes = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunk,
        })

        if (!embeddingRes || !embeddingRes.data?.[0]?.embedding) {
          console.error(`🚨 Invalid embedding format at chunk ${i}:`, embeddingRes)
          continue
        }

        vectors.push({
          id: `chunk-${i}-${nanoid()}`,
          values: embeddingRes.data[0].embedding,
          metadata: {
            chunk,
            fileName: parsedFiles[Math.floor(i / (chunks.length / parsedFiles.length))] || parsedFiles[0],
            sessionId,
          },
        })

        console.log(`✅ Chunk ${i} embedded.`)
      } catch (err) {
        console.error(`❌ Embedding failed for chunk ${i}:`, err)
      }
    }

    if (!vectors.length) {
      return NextResponse.json({ error: "No embeddings generated." }, { status: 500 })
    }

    console.log("⬆️ Uploading to Pinecone...")
    await pineconeIndex.namespace("uploaded-docs").upsert(vectors)
    console.log("✅ Upsert complete.")

    return NextResponse.json({
      message: "Parsed and embedded successfully",
      sessionId,
      totalFiles: parsedFiles.length,
      totalChunks: chunks.length,
      parsedFiles,
    })
  } catch (error: any) {
    console.error("❌ Unhandled Error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
