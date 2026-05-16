from datetime import datetime
import uuid

from fastapi import APIRouter, HTTPException, Query, status
from app.api.deps import CurrentUser, sessionDep
from app.models.JournalEntry import JournalEntry, JournalEntriesPublic,JournalEntryCreate, JournalEntryPublic, JournalEntryUpdate
from sqlmodel import select
from sqlalchemy.orm import selectinload

from sqlalchemy import func

from app.models.Users import User

def entry_with_relations():
    return (
        select(JournalEntry)
        .options(
            selectinload(JournalEntry.media),
            selectinload(JournalEntry.mood_log)
        )
    )

router = APIRouter(prefix="/journal-entries", tags=["Journal Entries"])
@router.get("/", response_model=JournalEntriesPublic)
async def get_journal_entries(*, session:sessionDep, current_user: CurrentUser,user_id: uuid.UUID = None,offset: int = 0, limit: int = Query(default=10, le=100),from_date: datetime | None = None, to_date: datetime | None = None):
    """
    Retrieve all journal entries for the current user.
    """
    if user_id and user_id != current_user.id:
        if not current_user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access other user's journal entries")
        user = await session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    else:
        user_id = current_user.id        
    
    statement = (
        entry_with_relations()
        .where(JournalEntry.user_id == user_id)
    )
    if from_date:
        statement = statement.where(JournalEntry.recorded_at >= from_date)
    if to_date:
        statement = statement.where(JournalEntry.recorded_at <= to_date)
    statement = statement.order_by(JournalEntry.recorded_at.desc()).offset(offset).limit(limit)
    result = await session.exec(statement)
    entries = result.all()
    count_statement = select(func.count()).select_from(JournalEntry).where(JournalEntry.user_id == user_id)

    if from_date:
        count_statement = count_statement.where(JournalEntry.recorded_at >= from_date)
    if to_date:
        count_statement = count_statement.where(JournalEntry.recorded_at <= to_date)

    count_result = await session.exec(count_statement)
    count = count_result.one()
    next_cursor=entries[-1].recorded_at.isoformat() if len(entries) == limit else None

    return JournalEntriesPublic(entries=entries, count=count, page=offset // limit + 1, page_size=limit, next_cursor=next_cursor)



@router.post("/", response_model=JournalEntryPublic)
async def create_journal_entry(*, session: sessionDep, current_user: CurrentUser, entry_in: JournalEntryCreate):
    """
    Create a new journal entry for the current user.
    """
    entry = JournalEntry(**entry_in.model_dump(exclude_unset=True), user_id=current_user.id)
    session.add(entry)
    await session.commit()
    await session.refresh(entry,attribute_names=["media", "mood_log"])
    return entry

@router.get("/{entry_id}", response_model=JournalEntryPublic)
async def get_journal_entry(*, session: sessionDep, current_user: CurrentUser, entry_id: uuid.UUID):
    """
    Retrieve a specific journal entry by its ID.
    """
    statement = entry_with_relations().where(JournalEntry.id == entry_id)
    result = await session.exec(statement)
    entry = result.one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    if entry.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this journal entry")
    return entry

@router.patch("/{entry_id}", response_model=JournalEntryPublic)
async def update_journal_entry(*, session: sessionDep, current_user: CurrentUser, entry_id: uuid.UUID, entry_in: JournalEntryUpdate):
    """
    Update a specific journal entry by its ID.
    """
    statement = entry_with_relations().where(JournalEntry.id == entry_id)
    result = await session.exec(statement)
    entry = result.one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    if entry.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this journal entry")
    
    entry_data = entry_in.model_dump(exclude_unset=True)
    entry.sqlmodel_update(entry_data)
    session.add(entry)
    await session.commit()
    await session.refresh(entry, attribute_names=["media", "mood_log"])
    return entry

@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journal_entry(*, session: sessionDep, current_user: CurrentUser, entry_id: uuid.UUID):
    """
    Delete a specific journal entry by its ID.
    """
    statement = entry_with_relations().where(JournalEntry.id == entry_id)
    result = await session.exec(statement)
    entry = result.one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    if entry.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this journal entry")
    
    await session.delete(entry)
    await session.commit()

