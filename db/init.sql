-- 1. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the Categories (Folders) Table
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create the Documents Table with a Foreign Key
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE, -- <--- Linked!
  content TEXT,
  metadata JSONB,
  embedding VECTOR(768),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Search Function (Updated to filter by ID, not String)
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT,
  filter_category_id BIGINT DEFAULT NULL -- <--- Filter by ID now
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  -- Efficient Integer filtering
  AND (filter_category_id IS NULL OR category_id = filter_category_id)
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- 5. Seed some default categories so the app isn't empty
INSERT INTO categories (name) VALUES ('General'), ('Finance'), ('Personal') ON CONFLICT DO NOTHING;