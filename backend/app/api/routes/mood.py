import uuid
from sqlalchemy import select
from fastapi import APIRouter, HTTPException, status
from app.api.deps import sessionDep, CurrentUser
from app.models.JournalEntry import MoodLog, MoodLogCreate, MoodLogPublic, MoodLogUpdate, JournalEntry,Emotion, Origin


router = APIRouter(prefix="/{entry_id}/mood", tags=["mood"]) 

@router.get("/", response_model=MoodLogPublic)
async def get_mood_log(entry_id: uuid.UUID, current_user: CurrentUser, session: sessionDep):
    statement = (
        select(MoodLog)
        .join(JournalEntry)
        .where(MoodLog.entry_id == entry_id)
        .where(JournalEntry.user_id == current_user.id)
    )

    result = await session.exec(statement)
    mood_log = result.scalar_one_or_none()

    if not mood_log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mood log not found")
    return mood_log

@router.post("/", response_model=MoodLogPublic, status_code=status.HTTP_201_CREATED)
async def create_mood_log(entry_id: uuid.UUID, mood_log_data: MoodLogCreate, current_user: CurrentUser, session: sessionDep):
    entry = await session.get(JournalEntry, entry_id)
    if not entry or entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    result = await session.exec(select(MoodLog).where(MoodLog.entry_id == entry_id))
    existing_mood_log = result.scalar_one_or_none()
    if existing_mood_log:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mood log already exists for this entry try updating it")
    mood_data = MoodLog.model_validate(mood_log_data, update={"entry_id": entry_id})
    session.add(mood_data)
    await session.commit()
    await session.refresh(mood_data)
    return mood_data

@router.patch("/", response_model=MoodLogPublic)
async def update_mood_log(entry_id: uuid.UUID, mood_log_data: MoodLogUpdate, current_user: CurrentUser, session: sessionDep):
    statement = (
        select(MoodLog)
        .join(JournalEntry)
        .where(MoodLog.entry_id == entry_id)
        .where(JournalEntry.user_id == current_user.id)
    )

    result = await session.exec(statement)
    mood_log : MoodLog | None = result.scalar_one_or_none()

    if not mood_log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mood log not found")

    mood_log_update= mood_log_data.model_dump(exclude_unset=True)
    mood_log.sqlmodel_update(mood_log_update)
    session.add(mood_log)
    await session.commit()
    await session.refresh(mood_log)
    return mood_log

@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mood_log(entry_id: uuid.UUID, current_user: CurrentUser, session: sessionDep):
    statement = (
        select(MoodLog)
        .join(JournalEntry)
        .where(MoodLog.entry_id == entry_id)
        .where(JournalEntry.user_id == current_user.id)
    )

    result = await session.exec(statement)
    mood_log : MoodLog | None = result.scalar_one_or_none()

    if not mood_log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mood log not found")

    await session.delete(mood_log)
    await session.commit()  

@router.get("/mood-options")
async def get_mood_options():
    return {
        "emotions": [emotion.value for emotion in Emotion],
        "origins": [origin.value for origin in Origin],
    }