import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure root directory in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.router import api_router
from backend.services.data_loader import DataLoader
from backend.services.risk_service import RiskService

app = FastAPI(
    title="ASTRA PME API",
    description="Project Monitoring Environment with Decision Support - Real PAIMANA/OCMS Machine Learning & Audit Engine",
    version="1.0.0"
)

# Enable CORS for frontend local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes under /api
app.include_router(api_router, prefix="/api")

@app.on_event("startup")
def startup_event():
    print("ASTRA PME backend initializing services and models...")
    DataLoader.get_instance()
    RiskService.get_instance()
    print("ASTRA PME backend ready on port 8000.")

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "ASTRA PME API",
        "version": "1.0.0",
        "active_snapshot": "2026-07"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
