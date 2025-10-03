import { NextRequest, NextResponse } from "next/server"
import { pineconeIndex } from "@/lib/pinecone"
import OpenAI from "openai"
import dotenv from "dotenv"

dotenv.config()

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    if (!query) {
      return NextResponse.json({ error: "No query provided" }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    // 1️⃣ Embed the user query
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small", // match Pinecone dimension
      input: query,
    })

    const queryVector = embeddingRes.data[0].embedding

    // 2️⃣ Search Pinecone for relevant chunks
    const searchRes = await pineconeIndex.namespace("uploaded-docs").query({
      topK: 1, // get top 5 relevant chunks
      vector: queryVector,
      includeMetadata: true,
    })

    const matches = searchRes.matches || []
    const sources = matches.map((m: any) => m.metadata?.chunk).join("\n---\n")

    // 3️⃣ Ask GPT with retrieved context
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // can use gpt-4o-mini or gpt-4-turbo
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Use the provided context to answer questions. Always cite the relevant sources.",
        },
        {
          role: "user",
          content: `Question: ${query}\n\nContext:\n${sources}`,
        },
      ],
    })

    const answer = completion.choices[0].message.content

    return NextResponse.json({
      answer,
      sources: matches.map((m: any) => ({
        score: m.score,
        fileName: m.metadata?.fileName,
        text: m.metadata?.chunk,
      })),
    })
  } catch (error) {
    console.error("❌ Error in query route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
