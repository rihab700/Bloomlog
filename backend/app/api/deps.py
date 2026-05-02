from typing import Annotated
from collections.abc import Generator
from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import ValidationError
import jwt
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session
from app.core.db import engine
from app.core.config import settings
from app.core import security
from app.models.Users import User,TokenPayload
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
    )

def get_db()-> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

sessionDep = Annotated[Session, Depends(get_db)]
tokenDep = Annotated[str, Depends(oauth2_scheme)]

def get_current_user(token: tokenDep, session: sessionDep) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ExpiredSignatureError, ValidationError):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token")
    user = session.get(User, token_data.sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

def get_current_super_user(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    return current_user