import { Client } from 'pg';

const OLLAMA_URL = 'http://localhost:11434/api/embeddings';
const DB_CONNECTION_STRING = 'postgres://postgres:mysecretpassword@localhost:5432/rag_db';

// The question we want to ask our database
const userQuery = "Which database is fast?";

async function search() {
  const client = new Client({ connectionString: DB_CONNECTION_STRING });
  await client.connect();

  try {
    console.log(`🔎 User asked: "${userQuery}"`);

    // 1. Convert the Question into a Vector (The Eyes)
    // We must use the SAME model we used for ingestion (nomic-embed-text)
    const embeddingResponse = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: userQuery
      })
    });

    const embeddingData = await embeddingResponse.json();
    const vector = embeddingData.embedding;
    
    // 2. Run the Semantic Search (The Memory)
    // We call the custom SQL function "match_documents" we created earlier
    console.log(`🧠 Querying database for nearest neighbors...`);
    
    const searchSQL = `
      SELECT * FROM match_documents(
        $1,  -- query_embedding (the vector we just got)
        0.5, -- match_threshold (similarity must be > 50%)
        5    -- match_count (return top 5 results)
      );
    `;

    // Format vector as string for pgvector
    const vectorString = JSON.stringify(vector);
    
    const res = await client.query(searchSQL, [vectorString]);

    // 3. Display Results
    if (res.rows.length > 0) {
      console.log(`\n✅ Found ${res.rows.length} matches:\n`);
      res.rows.forEach((row, index) => {
        console.log(`${index + 1}. Similarity: ${(row.similarity * 100).toFixed(2)}%`);
        console.log(`   Content: "${row.content}"`);
        console.log(`   Metadata: ${JSON.stringify(row.metadata)}\n`);
      });
    } else {
      console.log(`\n❌ No matches found. Try lowering the threshold.`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

search();