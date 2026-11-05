from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import loans, scenarios, assistant

app = FastAPI(
    title="FinOracle AI Backend",
    version="1.0.0",
    description="Financial intelligence API with loan calculations, scenario simulations, and RAG assistant"
)

# Enable CORS for frontend Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount modular routers
app.include_router(loans.router, prefix="/api")
app.include_router(scenarios.router, prefix="/api")
app.include_router(assistant.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "FinOracle AI Financial Intelligence Engine",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
