from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import uuid
from sqlalchemy import ARRAY, Column, String, JSON
from sqlalchemy import DateTime as SADateTime
from sqlmodel import SQLModel, Field, DateTime, Relationship

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.Users import User
def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)

class Status(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Emotion(str, Enum):
    HAPPY = "happy"
    CALM = "calm"
    SAD = "sad"
    ANXIOUS = "anxious"
    ANGRY = "angry"
    EXCITED = "excited"
    TIRED = "tired"
    GRATEFUL = "grateful"

class Origin(str, Enum):
    WORK = "work"
    FAMILY = "family"
    RELATIONSHIP = "relationship"
    HEALTH = "health"
    SLEEP = "sleep"
    FINANCES = "finances"
    SOCIAL = "social"
    WEATHER = "weather"
# ── Journal Entry 

class JournalEntryBase(SQLModel):
    title: str | None = Field(default=None, max_length=255)
    body_text: str | None = Field(default=None)



class JournalEntry(JournalEntryBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(index=True, foreign_key="user.id", ondelete="CASCADE")
    created_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    updated_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_column=Column(SADateTime(timezone=True), default=get_datetime_utc, onupdate=get_datetime_utc)
    )
    recorded_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))

    transcription_text: str | None = Field(default=None)
    transcription_status: Status | None = Field(default=None, sa_column=Column(String(50)))
    # these attribute are no colum in DB aka their value is not a singular value like an integer. 
    # Their value is the actual entire object that is related.
    user: "User" = Relationship(back_populates="journal_entries")
    media: list["Media"] | None = Relationship(
        back_populates="entry",
        cascade_delete=True,
        passive_deletes=True,
    )
    mood_log: Optional["MoodLog"]  = Relationship(
        back_populates="entry",
        cascade_delete=True,
        passive_deletes=True,
    )


class JournalEntryPublic(JournalEntryBase):
    id: uuid.UUID
    updated_at: datetime
    recorded_at: datetime | None = None
    media: list["MediaPublic"] | None = Field(default_factory=list)
    mood_log: Optional["MoodLogPublic"] = None

class JournalEntriesPublic(SQLModel):
    entries: list[JournalEntryPublic]
    count: int
    page : int | None = None
    page_size : int | None = None
    next_cursor: str | None = None


class JournalEntryCreate(JournalEntryBase):
    pass  

class JournalEntryUpdate(SQLModel):
    title: str | None = Field(default=None, max_length=255)
    body_text: str | None = Field(default=None)
    recorded_at: datetime | None = None
    #  media, mood_log —> have their own endpoints
    

# ── Media Attachment ─────────────────────────────────────────────

class MediaBase(SQLModel):
    media_type: str = Field(max_length=50)
    mime_type: str = Field(max_length=255)
    file_size: int | None = Field(default=None)
    duration: float | None = Field(default=None)
    media_metadata: dict | None = Field(default=None, sa_column=Column(JSON))


class Media(MediaBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    entry_id: uuid.UUID = Field(index=True, foreign_key="journalentry.id", ondelete="CASCADE")
    s3_key: str = Field(max_length=500)
    uploaded_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    entry: JournalEntry = Relationship(back_populates="media")


class MediaPublic(MediaBase):
    id: uuid.UUID
    url: str | None = None
    uploaded_at: datetime

class MediaCreate(MediaBase):
    s3_key: str = Field(max_length=500)

class MediaUpdate(SQLModel):
    file_size: int | None = Field(default=None)
    duration: float | None = Field(default=None)
    media_metadata: dict | None = Field(default=None, sa_column=Column(JSON))


# ── Mood Log ─────────────────────────────────────────────────────

class MoodLogBase(SQLModel):
    mood_score: int = Field(ge=1, le=10)
    emotions: list[Emotion] = Field(default_factory=list, sa_column=Column(ARRAY(String)))
    origins: list[Origin] = Field(default_factory=list, sa_column=Column(ARRAY(String)))


class MoodLog(MoodLogBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    entry_id: uuid.UUID = Field(foreign_key="journalentry.id", unique=True, ondelete="CASCADE")
    logged_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    entry: JournalEntry = Relationship(back_populates="mood_log")

class MoodLogCreate(MoodLogBase):
    pass

class MoodLogUpdate(SQLModel):
    mood_score: int | None = Field(default=None, ge=1, le=10)
    emotions: list[Emotion] | None = None
    origins: list[Origin] | None = None

class MoodLogPublic(MoodLogBase):
    id: uuid.UUID
    logged_at: datetime
