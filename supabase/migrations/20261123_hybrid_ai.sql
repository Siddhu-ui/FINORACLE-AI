CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    title TEXT NOT NULL,
    organization TEXT NOT NULL,
    category TEXT NOT NULL,
    publication_date DATE,
    is_verified_public_source BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 20);

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Knowledge is readable by authenticated users" ON public.knowledge_documents;
CREATE POLICY "Knowledge is readable by authenticated users" ON public.knowledge_documents
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Knowledge chunks are readable by authenticated users" ON public.knowledge_chunks;
CREATE POLICY "Knowledge chunks are readable by authenticated users" ON public.knowledge_chunks
FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.transaction_category_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    original_category TEXT NOT NULL,
    corrected_category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(transaction_id, user_id)
);

ALTER TABLE public.transaction_category_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own category corrections" ON public.transaction_category_corrections
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.match_financial_knowledge(query_embedding vector(1536), match_count integer DEFAULT 5)
RETURNS TABLE(id UUID, document_id UUID, title TEXT, organization TEXT, source_url TEXT, chunk_text TEXT, similarity FLOAT)
LANGUAGE sql STABLE
AS $$
SELECT c.id, c.document_id, d.title, d.organization, d.source_url, c.chunk_text,
       1 - (c.embedding <=> query_embedding) AS similarity
FROM public.knowledge_chunks c
JOIN public.knowledge_documents d ON d.id = c.document_id
WHERE c.embedding IS NOT NULL
ORDER BY c.embedding <=> query_embedding
LIMIT GREATEST(1, match_count);
$$;
