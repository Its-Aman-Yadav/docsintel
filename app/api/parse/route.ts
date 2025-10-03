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
        // 1️⃣ File handling
        const formData = await req.formData()
        const file = formData.get("file") as File
        if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

        const buffer = Buffer.from(await file.arrayBuffer())
        const ext = mime.extension(file.type) || "pdf"
        const fileName = `${nanoid()}.${ext}`
        const tempPath = path.join(os.tmpdir(), fileName)
        await fs.writeFile(tempPath, buffer)

        // 2️⃣ Parse using LlamaParse
        const reader = new LlamaParseReader({
            resultType: "markdown",
            apiKey: process.env.LLAMA_CLOUD_API_KEY!,
        })

        const documents = await reader.loadData(tempPath)
        await fs.unlink(tempPath) // cleanup

        const parsedText = documents?.[0]?.text || ""
        if (!parsedText) {
            return NextResponse.json({ error: "Parsed text is empty" }, { status: 400 })
        }

        // 3️⃣ Chunk the text into 1000-char chunks
        const chunks = parsedText.match(/(.|[\r\n]){1,1000}/g) || []

        // 4️⃣ Generate embeddings using OpenAI official SDK
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
        const vectors: number[][] = []

        for (const chunk of chunks) {
            const res = await openai.embeddings.create({
                model: "text-embedding-3-small", // ✅ 512-dim
                input: chunk,
            })
            vectors.push(res.data[0].embedding)
        }



        // 5️⃣ Upsert to Pinecone
        const namespace = "uploaded-docs"
        const upserts = vectors.map((vector, i) => ({
            id: `${fileName}-${i}`,
            values: vector,
            metadata: {
                chunk: chunks[i],
                fileName,
            },
        }))

        await pineconeIndex.namespace(namespace).upsert(upserts)

        return NextResponse.json({
            result: documents, // ✅ now frontend can read data.result[0].text
            chunks: chunks.length,
            uploadedTo: namespace,
            dimension: vectors[0]?.length,
        })

    } catch (error) {
        console.error("❌ Error during parsing/upload:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
