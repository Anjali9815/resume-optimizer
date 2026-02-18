from fastapi import FastAPI
from .routers.resume import router as resume_router

app = FastAPI(title="Resume Optimizer API")
app.include_router(resume_router)
