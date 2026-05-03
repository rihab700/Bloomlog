

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException,status

from app.models.Users import User, UserPublic, UserUpdateMe, UserUpdatePassword, UsersPublic,UserCreate
from app.api.deps import sessionDep, CurrentUser, get_current_super_user
from sqlmodel import col, select
from sqlalchemy import func
from app.core.security import verify_password, get_hash_password
from app import crud
from app.models import Message


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=UsersPublic, dependencies=[Depends(get_current_super_user)])
def get_current_user(session: sessionDep,offset: int = 0, limit: int = 100) -> Any:
    """Get all users. Only accessible to superusers."""
    count_statement = select(func.count()).select_from(User)
    count = session.exec(count_statement).one()

    statement = (
        select(User).order_by(col(User.created_at).desc()).offset(offset).limit(limit)
    )
    users = session.exec(statement).all()
    users_public = [UserPublic.model_validate(user) for user in users]

    return UsersPublic(users=users_public, count=count)

@router.post("/", response_model=UserPublic, dependencies=[Depends(get_current_super_user)])
def create_user(*, user_in: UserCreate, session: sessionDep) -> Any:
    """Create a new user. Only accessible to superusers."""

    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = crud.create_user(session=session, user_create=user_in)
    return user

@router.patch("/me", response_model=UserPublic)
def update_user_me(*, current_user: CurrentUser,user_in: UserUpdateMe,session: sessionDep) -> Any:
    """Update the current user's information."""

    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user_data = user_in.model_dump(exclude_unset=True)
    current_user.sqlmodel_update(user_data)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user

@router.patch("/me/password", response_model=UserPublic)
def update_user_password(*, current_user: CurrentUser,body: UserUpdatePassword,session: sessionDep) -> Any:
    """Update the current user's password."""

    verified,_ = verify_password(body.current_password, current_user.hashed_password)

    
    if not verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect password")
    if body.current_password == body.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different from the current password")
    

    current_user.hashed_password = get_hash_password(body.new_password)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return Message(message="Password updated successfully")