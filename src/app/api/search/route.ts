import { NextRequest, NextResponse } from "next/server";
import pool from "@/db";

export const runtime = "nodejs";

const OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings";
const OLLAMA_CHAT_URL = "http://localhost:11434/api/chat";

export async function POST(req: NextRequest) {
  try {
    const { query, categoryIds } = await req.json();

    // 1. EMBED
    const embeddingResponse = await fetch(OLLAMA_EMBED_URL, {
      method: "POST",
      body: JSON.stringify({
        model: "nomic-embed-text",
        prompt: query,
      }),
    });
    
    const embeddingData = await embeddingResponse.json();
    
    if (!embeddingData.embedding) {
        return NextResponse.json({ error: "Failed to generate embedding" }, { status: 500 });
    }

    // 2. RETRIEVE
    const filterArray = (categoryIds && categoryIds.length > 0) ? categoryIds : null;
    
    // --- FIX IS HERE: Added 'id' and 'similarity' back ---
    const searchSQL = `
      SELECT id, content, metadata, similarity
      FROM match_documents($1, 0.5, 5, $2);
    `;

    const searchRes = await pool.query(searchSQL, [
      JSON.stringify(embeddingData.embedding), 
      filterArray
    ]);

    const retrievedDocs = searchRes.rows;

    if (retrievedDocs.length === 0) {
      return NextResponse.json({ 
        answer: "I couldn't find any relevant documents to answer that.", 
        sources: [] 
      });
    }

    // 3. GENERATE
    const contextText = retrievedDocs.map((doc: any) => doc.content).join("\n\n---\n\n");

    const systemPrompt = `
      You are a helpful AI assistant. 
      Use the following pieces of context to answer the user's question.
      If the answer is not in the context, say you don't know.
      Keep the answer concise and professional.
      
      Context:
      ${contextText}
    `;

    const chatResponse = await fetch(OLLAMA_CHAT_URL, {
      method: "POST",
      body: JSON.stringify({
        model: "llama3.1", // <--- Updated to match your model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        stream: false
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      return NextResponse.json({ 
        answer: `Error from AI: ${errorText}.`, 
        sources: [] 
      });
    }

    const chatData = await chatResponse.json();
    
    return NextResponse.json({
      answer: chatData.message.content,
      sources: retrievedDocs
    });

  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}