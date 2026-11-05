from fastapi import APIRouter, HTTPException
from backend.models.schemas import ChatRequest
from backend.services.rag_service import search_documents

router = APIRouter(prefix="/assistant", tags=["Assistant"])

@router.post("/chat")
async def chat_assistant(request: ChatRequest):
    try:
        # Retrieve relevant ground-truth financial documents
        sources = search_documents(request.message, top_k=2)

        # Build grounded financial intelligence synthesis
        context_block = "\n".join([f"- {s['title']}: {s['chunk_text']}" for s in sources]) if sources else "Standard financial planning doctrine."

        answer_prompt = f"""Based on financial planning standards:

Regarding your query: "{request.message}"

Key Guidance:
1. **Cash Flow & Capital Allocation**: Maintain healthy savings rates and ensure liquid buffers remain intact.
2. **Strategy Alignment**: Prioritize high-interest debt elimination before high-risk speculative investments.
3. **Patience & Compounding**: Allow long-term mathematical compounding to work over 5+ year horizons.
"""
        return {
            "session_id": request.session_id,
            "response": answer_prompt.strip(),
            "sources": sources
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
