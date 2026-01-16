import { Client } from 'pg';

const OLLAMA_URL = 'http://localhost:11434/api/embeddings';
const DB_CONNECTION_STRING = 'postgres://postgres:mysecretpassword@localhost:5432/rag_db';

// The data we want to save
const sampleNote = {
  content: "The Q1 marketing budget is $50,000.",
  metadata: { author: "Alice" },
  namespace: "finance"
};

async function ingest() {
  console.log(`🔌 Connecting to DB...`);
  const client = new Client({ connectionString: DB_CONNECTION_STRING });
  await client.connect();

  try {
    // 1. Get the Embedding from Ollama (The Eyes)
    console.log(`🧠 Generating embedding for: "${sampleNote.content}"`);
    const embeddingResponse = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: sampleNote.content
      })
    });

    const embeddingData = await embeddingResponse.json();
    
    // Safety check for the "335" issue or empty responses
    if (!embeddingData.embedding || !Array.isArray(embeddingData.embedding)) {
      throw new Error('❌ Invalid response from Ollama. Check if model name is correct.');
    }

    const vector = embeddingData.embedding;
    console.log(`✅ Received vector with ${vector.length} dimensions.`);

    // 2. Save to Postgres (The Memory)
    // pgvector requires the vector to be a string string like "[0.1, -0.2, ...]"
    const vectorString = JSON.stringify(vector);

    console.log(`💾 Saving to namespace: "${sampleNote.namespace}"...`);
    
    const query = `
      INSERT INTO documents (content, metadata, embedding, namespace) 
      VALUES ($1, $2, $3, $4) -- Added $4
      RETURNING id;
    `;
    
    await client.query(query, [
      sampleNote.content, 
      sampleNote.metadata, 
      JSON.stringify(vector),
      sampleNote.namespace // Pass the folder name
    ]);

    console.log(`🎉 Success! Inserted row with ID: ${res.rows[0].id}`);

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

ingest();