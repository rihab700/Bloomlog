from app.api.routes import users,login,media,journal_entries,mood
from fastapi import APIRouter

api_router = APIRouter()
api_router.include_router(users.router)
api_router.include_router(login.router)
api_router.include_router(media.router)
api_router.include_router(journal_entries.router)
api_router.include_router(mood.router)
