-- 1. Enable the Vector Extension (Crucial for AI)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the Categories Table (Folders)
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create the Documents Table (Memories)
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT, -- The actual text chunk
  metadata JSONB, -- Filename, type, etc.
  embedding vector(768), -- The math representation (768 dimensions for Nomic)
  category_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Link documents to categories
  CONSTRAINT fk_category
    FOREIGN KEY (category_id)
    REFERENCES categories (id)
    ON DELETE CASCADE -- If folder is deleted, delete all files in it
);

-- 4. Create the Search Function (The "Match" Logic)
-- This function lets API search for similar vectors easily
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_category_id bigint DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  category_id bigint,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    d.category_id,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  AND (filter_category_id IS NULL OR d.category_id = filter_category_id)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Seed Default Categories (Optional but helpful)
INSERT INTO categories (name) VALUES 
  ('General'), 
  ('Finance'), 
  ('Personal'), 
  ('Work')
ON CONFLICT DO NOTHING;