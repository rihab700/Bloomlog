from typing import  Any
import uuid

from fastapi import APIRouter, Depends, HTTPException,status
from fastapi.params import Query

from app.models.Users import User, UserPublic, UserRegister, UserUpdate, UserUpdateMe, UserUpdatePassword, UsersPublic,UserCreate
from app.api.deps import sessionDep, CurrentUser, get_current_super_user
from sqlmodel import col, select
from sqlalchemy import func
from app.core.security import verify_password, get_hash_password
from app import crud
from app.models.Message import Message


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=UsersPublic, dependencies=[Depends(get_current_super_user)])
async def get_all_users(session: sessionDep,offset: int = 0, limit:int = Query(default=20, le=100)) -> Any:
    """Get all users. Only accessible to superusers."""
    count_statement = select(func.count()).select_from(User)
    result = await session.exec(count_statement)
    count = result.one()

    statement = (
        select(User).order_by(col(User.created_at).desc()).offset(offset).limit(limit)
    )
    result = await session.exec(statement)
    users = result.all()
    users_public = [UserPublic.model_validate(user) for user in users]

    return UsersPublic(users=users_public, count=count)

@router.post("/", response_model=UserPublic, dependencies=[Depends(get_current_super_user)])
async def create_user(*, user_in: UserCreate, session: sessionDep) -> Any:
    """Create a new user. Only accessible to superusers."""

    user = await crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = await crud.create_user(session=session, user_create=user_in)
    return user

@router.patch("/me", response_model=UserPublic)
async def update_user_me(*, current_user: CurrentUser,user_in: UserUpdateMe,session: sessionDep) -> Any:
    """Update the current user's information."""

    if user_in.email:
        existing_user = await crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user_data = user_in.model_dump(exclude_unset=True)
    current_user.sqlmodel_update(user_data)
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return current_user

@router.patch("/me/password", response_model=Message)
async def update_user_password(*, current_user: CurrentUser,body: UserUpdatePassword,session: sessionDep) -> Any:
    """Update the current user's password."""

    verified,_ = verify_password(body.current_password, current_user.hashed_password)

    
    if not verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect password")
    if body.current_password == body.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different from the current password")
    

    current_user.hashed_password = get_hash_password(body.new_password)
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return Message(message="Password updated successfully")

@router.get("/me", response_model=UserPublic)
async def read_user_me(current_user: CurrentUser) -> Any:
    """Get the current user's information."""
    return current_user

@router.delete("/me", response_model=Message)
async def delete_user_me(*, current_user: CurrentUser, session: sessionDep) -> Any:
    """Delete the current user's account."""
    if current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superusers cannot delete their own accounts")
    session.delete(current_user)
    await session.commit()
    return Message(message="User account deleted successfully")

@router.post("/signup", response_model=UserPublic)
async def register_user(*, user_in: UserRegister, session: sessionDep) -> Any:
    """Register a new user without authentication."""
    user = await crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user_create = UserCreate.model_validate(user_in)
    user = await crud.create_user(session=session, user_create=user_create)
    return user

@router.get("/{user_id}", response_model=UserPublic)
async def get_user_by_id(*, user_id: str, session: sessionDep,current_user: CurrentUser) -> Any:
    """Get a user by ID. Only accessible to superusers."""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        return user
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user

@router.patch("/{user_id}",dependencies=[Depends(get_current_super_user)], response_model=UserPublic)
async def update_user(*, user_id: uuid.UUID, user_in: UserUpdate, session: sessionDep) -> Any:
    """Update a user's information. Only accessible to superusers."""
    db_user = await session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_in.email:
        existing_user = await crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != db_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    db_user = await crud.update_user(session=session, db_user=db_user, user_in=user_in)
    return db_user

@router.delete("/{user_id}", response_model=Message, dependencies=[Depends(get_current_super_user)])
async def delete_user(*, user_id: uuid.UUID, session: sessionDep) -> Any:
    """Delete a user. Only accessible to superusers."""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superusers cannot be deleted")
    await session.delete(user)
    await session.commit()
    return Message(message="User deleted successfully")