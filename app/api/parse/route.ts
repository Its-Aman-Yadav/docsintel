import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
import { nanoid } from "nanoid"
import mime from "mime-types"
import { LlamaParseReader } from "llama-cloud-services"
import { pineconeIndex } from "@/lib/pinecone"
import OpenAI from "openai"
import dotenv from "dotenv"

dotenv.config()

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Extract multiple files
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const reader = new LlamaParseReader({
      resultType: "text",
      apiKey: process.env.LLAMA_CLOUD_API_KEY!,
    })

    const allDocuments: any[] = []

    // Process each file sequentially (or in parallel using Promise.all if preferred)
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const extension = mime.extension(file.type) || "pdf"
      const fileName = `${nanoid()}.${extension}`
      const tempFilePath = path.join(os.tmpdir(), fileName)

      // Save temporarily
      await fs.writeFile(tempFilePath, buffer)

      // Parse content using LlamaParse
      const documents = await reader.loadData(tempFilePath)
      await fs.unlink(tempFilePath) // cleanup

      if (!documents || documents.length === 0) continue

      // Add filename metadata
      const withMetadata = documents.map((doc) => ({
        ...doc,
        fileName,
      }))

      allDocuments.push(...withMetadata)
    }

    if (allDocuments.length === 0) {
      return NextResponse.json({ error: "No documents returned from parser" }, { status: 400 })
    }

    // 2️⃣ Join parsed text from all files
    const parsedText = allDocuments.map((doc) => doc.text).join("\n\n---\n\n")

    // 3️⃣ Chunk into segments
    const chunks = parsedText.match(/(.|[\r\n]){1,1000}/g) || []

    // 4️⃣ Generate embeddings and upsert into Pinecone
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
    const namespace = "uploaded-docs"
    const vectors: any[] = []

    for (const [idx, chunk] of chunks.entries()) {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      })

      vectors.push({
        id: `multi-${idx}-${nanoid()}`,
        values: response.data[0].embedding,
        metadata: { chunk, source: "multi-doc-upload" },
      })
    }

    await pineconeIndex.namespace(namespace).upsert(vectors)

    // ✅ Response
    return NextResponse.json({
      message: "All documents parsed and embedded successfully",
      result: allDocuments,
      totalFiles: files.length,
      totalChunks: chunks.length,
      namespace,
    })
  } catch (error) {
    console.error("❌ Error in /api/parse:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
