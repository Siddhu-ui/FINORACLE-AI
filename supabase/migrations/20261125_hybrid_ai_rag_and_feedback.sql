-- ============================================================
-- FinOracle AI — Additive Migration: pgvector RAG, Category Feedback & AI Evidence
-- Safe additive-only migration. Preserves all existing tables and RLS policies.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Authoritative Financial Knowledge Documents (RAG Corpus)
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name TEXT NOT NULL,
    source_title TEXT,
    title TEXT NOT NULL,
    organization TEXT NOT NULL,
    source_url TEXT NOT NULL,
    url TEXT,
    section TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    publication_date DATE,
    publication_or_retrieval_date DATE DEFAULT CURRENT_DATE,
    is_verified_public_source BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Additive column upgrades for existing deployments that ran 20261123_hybrid_ai.sql
ALTER TABLE public.knowledge_documents ADD COLUMN IF NOT EXISTS source_title TEXT;
ALTER TABLE public.knowledge_documents ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.knowledge_documents ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.knowledge_documents ADD COLUMN IF NOT EXISTS publication_or_retrieval_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.knowledge_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

UPDATE public.knowledge_documents
SET source_title = COALESCE(source_title, title),
    url = COALESCE(url, source_url),
    publication_or_retrieval_date = COALESCE(publication_or_retrieval_date, publication_date, CURRENT_DATE)
WHERE source_title IS NULL OR url IS NULL OR publication_or_retrieval_date IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_documents_unique_source
ON public.knowledge_documents (organization, title, source_url);

-- 2. Knowledge Chunks with pgvector Embeddings
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    section TEXT,
    chunk_text TEXT NOT NULL,
    token_count INTEGER DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(document_id, chunk_index)
);

ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS token_count INTEGER DEFAULT 0;
ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 20);

CREATE INDEX IF NOT EXISTS knowledge_chunks_document_idx
ON public.knowledge_chunks (document_id, chunk_index);

-- RLS for Knowledge Tables (public verified read for authenticated users; service role writes)
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Knowledge is readable by authenticated users" ON public.knowledge_documents;
CREATE POLICY "Knowledge is readable by authenticated users" ON public.knowledge_documents
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Knowledge chunks are readable by authenticated users" ON public.knowledge_chunks;
CREATE POLICY "Knowledge chunks are readable by authenticated users" ON public.knowledge_chunks
FOR SELECT TO authenticated USING (true);

-- 3. Semantic Similarity Search RPC (match_knowledge_chunks)
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.35,
    match_count INTEGER DEFAULT 5
)
RETURNS TABLE(
    chunk_id UUID,
    document_id UUID,
    source_title TEXT,
    organization TEXT,
    url TEXT,
    publication_or_retrieval_date DATE,
    section TEXT,
    chunk_text TEXT,
    similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
SELECT
    c.id AS chunk_id,
    c.document_id,
    COALESCE(d.source_title, d.title) AS source_title,
    d.organization,
    COALESCE(d.url, d.source_url) AS url,
    COALESCE(d.publication_or_retrieval_date, d.publication_date, CURRENT_DATE) AS publication_or_retrieval_date,
    COALESCE(c.section, d.section, 'General') AS section,
    c.chunk_text,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity
FROM public.knowledge_chunks c
JOIN public.knowledge_documents d ON d.id = c.document_id
WHERE c.embedding IS NOT NULL
  AND d.is_verified_public_source = true
  AND (1 - (c.embedding <=> query_embedding)) >= match_threshold
ORDER BY c.embedding <=> query_embedding
LIMIT GREATEST(1, LEAST(match_count, 20));
$$;

-- 4. User Transaction Category Corrections (ML Feedback Loop)
CREATE TABLE IF NOT EXISTS public.transaction_category_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    description TEXT,
    original_category TEXT NOT NULL,
    predicted_category TEXT,
    corrected_category TEXT NOT NULL,
    confidence NUMERIC(5, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(transaction_id, user_id)
);

ALTER TABLE public.transaction_category_corrections ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.transaction_category_corrections ADD COLUMN IF NOT EXISTS predicted_category TEXT;
ALTER TABLE public.transaction_category_corrections ADD COLUMN IF NOT EXISTS confidence NUMERIC(5, 4);
ALTER TABLE public.transaction_category_corrections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS idx_txn_corrections_user_id
ON public.transaction_category_corrections (user_id, created_at DESC);

ALTER TABLE public.transaction_category_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own category corrections" ON public.transaction_category_corrections;
CREATE POLICY "Users manage own category corrections" ON public.transaction_category_corrections
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
