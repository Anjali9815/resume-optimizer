from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.resume import router as resume_router

app = FastAPI(title="Resume Optimizer API")

# ✅ Allow your React dev server to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume_router)