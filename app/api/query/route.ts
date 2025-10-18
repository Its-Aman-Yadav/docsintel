import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { pineconeIndex } from "@/lib/pinecone";
import dotenv from "dotenv";

dotenv.config();

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Step 1: Extract query and sessionId from request
    const { query, sessionId } = await req.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    // Step 2: Embed the query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const embedding = embeddingResponse.data[0]?.embedding;

    if (!embedding) {
      throw new Error("Failed to create embedding");
    }

    // Step 3: Query Pinecone with optional sessionId filter
    const filter = sessionId ? { sessionId } : undefined;

    const pineconeResponse = await pineconeIndex.namespace("uploaded-docs").query({
      vector: embedding,
      topK: 8,
      includeMetadata: true,
      filter,
    });

    const matches = pineconeResponse.matches || [];
    console.log("🔍 Pinecone matches:", matches.length);

    // Step 4: Extract context from matched chunks
    const contextText = matches
      .map((m) => m.metadata?.chunk)
      .filter(Boolean)
      .join("\n\n");

    // Step 5: Ask GPT using matched context
    const chatRes = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an intelligent assistant who answers questions strictly based on the provided context in the same language as the query. If the context does not contain the answer, respond with 'I don't know.'",
        },
        {
          role: "user",
          content: `Here is some context extracted from a document:\n\n${contextText}\n\nNow, based on the above, please answer the following:\n\n${query}`,
        },
      ],
    });

    const answer = chatRes.choices[0]?.message?.content || "No answer generated";

    // ✅ Return answer and matches
    return NextResponse.json({ answer, matches });
  } catch (error) {
    console.error("❌ Error in /api/query:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
