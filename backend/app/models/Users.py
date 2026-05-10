from datetime import datetime, timezone
import uuid
from sqlmodel import DateTime
from pydantic import EmailStr
from app.models.JournalEntry import JournalEntry

from sqlmodel import SQLModel, Field, Relationship

def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)

class UserBase(SQLModel):
    email: EmailStr = Field(index=True, unique=True,max_length=255)
    is_superuser: bool = False
    is_active: bool = True
    full_name: str | None = Field(max_length=255,default=None)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)

class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(max_length=255,default=None)

class UserUpdate(UserBase):
    email: EmailStr | None = Field(max_length=255,default=None)
    password: str | None = Field(min_length=8, max_length=128,default=None)

class UserUpdateMe(SQLModel):
    email: EmailStr | None = Field(max_length=255,default=None)
    full_name: str | None = Field(max_length=255,default=None)

class UserUpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(default_factory=get_datetime_utc,sa_type=DateTime(timezone=True))   
    journal_entries: list[JournalEntry] | None = Relationship(
        back_populates="user",
        cascade_delete=True,
        passive_deletes=True,
    )

class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None 

    
class UsersPublic(SQLModel):
    users: list[UserPublic]
    count: int  

class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(SQLModel):
    sub: str | None = None

class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
