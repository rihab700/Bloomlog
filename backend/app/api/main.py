from app.api.routes import users,login
from fastapi import APIRouter

api_router = APIRouter()
api_router.include_router(users.router)
api_router.include_router(login.router)
