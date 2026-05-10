from fastapi import APIRouter, Depends, HTTPException
from app.api.dependencies import get_current_user
from app.models import JournalEntry, JournalEntriesPublic


router = APIRouter(prefix="/journal-entries", tags=["Journal Entries"])
@router.get("/", response_model=list[JournalEntriesPublic])
async def get_journal_entries(current_user=Depends(get_current_user)):
    """
    Retrieve all journal entries for the current user.
    """
    return await JournalEntry.filter(user_id=current_user.id).all()