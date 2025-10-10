import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { pineconeIndex } from "@/lib/pinecone"
import dotenv from "dotenv"

dotenv.config()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 })
    }

    // 1️⃣ Embed the user query
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    })
    const embedding = embeddingRes.data[0].embedding

    // 2️⃣ Query Pinecone
    // 2️⃣ Query Pinecone
    const result = await pineconeIndex.namespace("uploaded-docs").query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    })

    console.log("🔍 Raw Pinecone matches:", result.matches?.length)

    const matches = result.matches || []

    const contextText = matches
      .map((m) => m.metadata?.chunk || "")
      .filter(Boolean)
      .join("\n\n")

    if (!contextText || contextText.length < 10) {
      return NextResponse.json({ answer: "No context found for this query (after extraction)." })
    }

    // 3️⃣ Ask GPT with context
    const chatRes = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an assistant who answers based only on the provided context.",
        },
        {
          role: "user",
          content: `Context:\n${contextText}\n\nQuestion: ${query}`,
        },
      ],
    })

    const answer = chatRes.choices[0].message.content

    return NextResponse.json({
      answer,
      sources: matches.map((m) => ({
        text: m.metadata?.chunk || "[No chunk]",
        fileName: m.metadata?.fileName || "[Unknown file]",
        score: m.score,
      })),
    })


  } catch (error) {
    console.error("❌ Error in /api/query:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
