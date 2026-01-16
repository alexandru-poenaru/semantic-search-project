import { NextRequest, NextResponse } from "next/server";
import pool from "@/db";
import * as mammoth from "mammoth"; // Explicit import style
import * as XLSX from "xlsx";
import Papa from "papaparse";
import PDFParser from "pdf2json";

export const runtime = "nodejs";

const OLLAMA_URL = "http://localhost:11434/api/embeddings";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const categoryId = formData.get("categoryId") as string;

  if (!file || !categoryId) {
    return NextResponse.json({ error: "File and Category ID are required" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    let rawText = "";
    
    // 1. File Parsing Logic (Same as before)
    const mime = file.type;
    const name = file.name.toLowerCase();

    console.log(`📂 Processing: ${file.name} (MIME: ${mime})`);

    if (mime === "application/pdf" || name.endsWith(".pdf")) {
        rawText = await parsePdfBuffer(buffer);
    } 
    else if (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
        name.endsWith(".docx")
    ) {
        const wordData = await mammoth.extractRawText({ buffer });
        rawText = wordData.value;
    } 
    else if (
        mime === "text/markdown" || 
        name.endsWith(".md") || 
        name.endsWith(".markdown")
    ) {
        rawText = buffer.toString("utf-8");
    } 
    else if (
        mime === "application/json" || 
        name.endsWith(".json")
    ) {
        const textContent = buffer.toString("utf-8");
        try {
            // Attempt 1: Try standard JSON (e.g., [{}, {}])
            const jsonData = JSON.parse(textContent);
            rawText = JSON.stringify(jsonData, null, 2);
        } catch (e) {
            // Attempt 2: Try JSON Lines (one object per line)
            console.warn("⚠️ Standard JSON parse failed. Trying JSON Lines format...");
            
            // Split by newline and parse each non-empty line
            const lines = textContent.split(/\n/).filter(line => line.trim() !== "");
            const jsonItems = lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch (err) {
                    return null; // Skip broken lines
                }
            }).filter(item => item !== null);

            if (jsonItems.length > 0) {
                rawText = jsonItems.map(item => JSON.stringify(item)).join("\n");
            } else {
                // If both fail, throw the original error
                throw new Error("Invalid JSON format");
            }
        }
    } 
    else if (
        mime === "text/csv" || 
        name.endsWith(".csv")
    ) {
        const csvText = buffer.toString("utf-8");
        const parsedCsv = Papa.parse(csvText, { header: true });
        rawText = parsedCsv.data.map((row: any) => 
          Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(", ")
        ).join("\n");
    } 
    else if (
        mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
        name.endsWith(".xlsx")
    ) {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0]; 
        const sheet = workbook.Sheets[sheetName];
        const excelData = XLSX.utils.sheet_to_json(sheet);
        rawText = excelData.map((row: any) => 
          Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(", ")
        ).join("\n");
    } 
    else if (mime.startsWith("text/") || name.endsWith(".txt")) {
        rawText = buffer.toString("utf-8");
    } 
    else {
        return NextResponse.json({ error: "Unsupported file type: " + mime }, { status: 400 });
    }

    // 2. Safety Check: Did we actually get any text?
    if (!rawText || rawText.trim().length === 0) {
        return NextResponse.json({ error: "No text text found in file (is it scanned/image-only?)" }, { status: 400 });
    }

    // 3. Chunking & Saving
    const chunks = chunkText(rawText, 1000);
    console.log(`🔪 Split into ${chunks.length} chunks.`);

    let validChunks = 0;

    for (const chunk of chunks) {
        // SKIP empty chunks (This prevents the error!)
        if (!chunk.trim()) continue;

        const embeddingResponse = await fetch(OLLAMA_URL, {
          method: "POST",
          body: JSON.stringify({
            model: "nomic-embed-text",
            prompt: chunk,
          }),
        });
        const embeddingData = await embeddingResponse.json();
        
        // SKIP if embedding is missing or empty (Safety Check)
        if (!embeddingData.embedding || embeddingData.embedding.length === 0) {
            console.warn("⚠️ Skipping chunk: Model returned empty vector");
            continue;
        }

        const query = `
          INSERT INTO documents (content, metadata, embedding, category_id)
          VALUES ($1, $2, $3, $4)
        `;
        
        const metadata = { filename: file.name, type: mime || 'unknown' };
        
        await pool.query(query, [
          chunk, 
          metadata, 
          JSON.stringify(embeddingData.embedding), 
          parseInt(categoryId)
        ]);

        validChunks++;
    }

    return NextResponse.json({ success: true, chunksProcessed: validChunks });

  } catch (error) {
    console.error("Ingest Error:", error);
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}

// --- HELPERS ---

function parsePdfBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, 1);
    parser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
    parser.on("pdfParser_dataReady", () => {
      const text = (parser as any).getRawTextContent();
      resolve(text);
    });
    parser.parseBuffer(buffer);
  });
}

function chunkText(text: string, chunkSize: number): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let currentChunk = "";
  const paragraphs = text.split(/\n+/); 

  for (const paragraph of paragraphs) {
    // Only process non-empty paragraphs
    if (!paragraph.trim()) continue;

    if ((currentChunk.length + paragraph.length) > chunkSize) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = paragraph + "\n";
    } else {
      currentChunk += paragraph + "\n";
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}