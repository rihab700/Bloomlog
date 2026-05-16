from typing import Annotated
from collections.abc import AsyncGenerator
from fastapi import Depends, HTTPException, status
from pydantic import ValidationError
import jwt
from fastapi.security import OAuth2PasswordBearer
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from functools import lru_cache
from app.core.db import engine
from app.core.config import settings
from app.core import security
from app.models.Users import User,TokenPayload
from jwt.exceptions import InvalidTokenError

from app.services.storage_service import StorageService
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
    )

async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db()-> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session

@lru_cache
def get_storage_service() -> StorageService:
    return StorageService()

sessionDep = Annotated[AsyncSession, Depends(get_db)]
tokenDep = Annotated[str, Depends(oauth2_scheme)]
StorageDep = Annotated[StorageService, Depends(get_storage_service)]


async def get_current_user(token: tokenDep, session: sessionDep) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await session.get(User, token_data.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

def get_current_super_user(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    return current_user