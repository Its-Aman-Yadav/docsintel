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
    // 1️⃣ File extraction
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const extension = mime.extension(file.type) || "pdf"
    const fileName = `${nanoid()}.${extension}`
    const tempFilePath = path.join(os.tmpdir(), fileName)

    // Save file temporarily
    await fs.writeFile(tempFilePath, buffer)

    // 2️⃣ LlamaParse usage
    const reader = new LlamaParseReader({
      resultType: "text", // Use "text" for maximum raw content extraction
      apiKey: process.env.LLAMA_CLOUD_API_KEY!,
    })

    const documents = await reader.loadData(tempFilePath)
    await fs.unlink(tempFilePath) // Clean up temp file

    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: "No documents returned from parser" }, { status: 400 })
    }

    // Join all parsed text together
    const parsedText = documents.map(doc => doc.text).join("\n\n").trim()

    if (!parsedText) {
      return NextResponse.json({ error: "Parsed text is empty" }, { status: 400 })
    }

    console.log("✅ Pages parsed:", documents.length)
    console.log("📏 Total parsed text length:", parsedText.length)
    console.log("📄 Sample parsed text:", parsedText)

    // 3️⃣ Chunking into 1000-character segments
    const chunks = parsedText.match(/(.|[\r\n]){1,1000}/g) || []
    console.log("🔹 Total chunks created:", chunks.length)

    // 4️⃣ Generate embeddings using OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
    const vectors: number[][] = []

    for (const chunk of chunks) {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      })
      vectors.push(response.data[0].embedding)
    }

    // 5️⃣ Upsert into Pinecone
    const namespace = "uploaded-docs"
    const upserts = vectors.map((embedding, idx) => ({
      id: `${fileName}-${idx}`,
      values: embedding,
      metadata: {
        chunk: chunks[idx],
        fileName,
      },
    }))

    await pineconeIndex.namespace(namespace).upsert(upserts)

    // ✅ Success Response
    return NextResponse.json({
      message: "File parsed and embedded successfully",
      result: documents,
      chunks: chunks.length,
      uploadedTo: namespace,
      dimension: vectors[0]?.length || null,
    })

  } catch (error) {
    console.error("❌ Error in /api/parse:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
