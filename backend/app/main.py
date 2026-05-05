from app.api.main import api_router
from fastapi import FastAPI
from app.core.config import settings

app = FastAPI()
app.include_router(api_router, prefix = settings.API_V1_STR)