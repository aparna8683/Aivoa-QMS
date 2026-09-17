from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import Base, engine
from .routes.complaints import router as complaints_router

settings = get_settings()
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AIVOA Complaint Management API", version="1.0.0")
origins = [x.strip() for x in settings.cors_origins.split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(complaints_router)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "aivoa-qms"}
