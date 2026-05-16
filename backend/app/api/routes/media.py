import uuid

from fastapi import APIRouter, HTTPException, UploadFile, status
from sqlalchemy import Enum
from app.api.deps import CurrentUser, sessionDep
from app.models.JournalEntry import JournalEntry,Media, MediaCreate, MediaPublic
from sqlmodel import select
from app.api.deps import StorageDep

class AllowedMediaType(str, Enum):
    # Audio
    AUDIO_MP4 = "audio/mp4"
    AUDIO_MPEG = "audio/mpeg"
    AUDIO_WAV = "audio/wav"
    AUDIO_OGG = "audio/ogg"
    # Image
    IMAGE_PNG = "image/png"
    IMAGE_JPEG = "image/jpeg"
    IMAGE_WEBP = "image/webp"



async def get_entry_and_check_ownership(*,entry_id: uuid.UUID, session: sessionDep, current_user: CurrentUser) -> JournalEntry:
    entry = await session.get(JournalEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    if entry.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add media to this journal entry")
    return entry



router = APIRouter(prefix="/journal-entries/{entry_id}/media", tags=["Media"])

@router.post("/", response_model=MediaPublic)
async def add_media_to_entry(*, session: sessionDep, current_user: CurrentUser, entry_id: uuid.UUID, file: UploadFile, storage_service: StorageDep):
    """
    Add a media attachment to a journal entry.
    """
    try:
        AllowedMediaType(file.content_type)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported media type")

    
    entry = await get_entry_and_check_ownership(entry_id=entry_id, session=session, current_user=current_user)
    s3_key = storage_service.build_journal_media_key(
        user_id=str(current_user.id),
        entry_id=str(entry_id),
        filename=file.filename,
        recorded_at=entry.recorded_at
    )
    upload_result = await storage_service.upload_file_to_s3(
    file=file,
    s3_key=s3_key,
)
    media = Media(
    entry_id=entry_id,
    media_type=AllowedMediaType(file.content_type),
    mime_type=file.content_type,
    s3_key=s3_key,
    file_size=upload_result.file_size,
    )
    session.add(media)
    await session.commit()
    await session.refresh(media)
    url = await storage_service.generate_presigned_url(media.s3_key)

    return MediaPublic(**media.model_dump(), url=url)

@router.get("/", response_model=list[MediaPublic])
async def get_media_for_entry(*, session: sessionDep, current_user: CurrentUser, entry_id: uuid.UUID, storage_service: StorageDep):
    """
    Retrieve all media attachments for a journal entry.
    """
    await get_entry_and_check_ownership(entry_id=entry_id, session=session, current_user=current_user)
    
    statement = select(Media).where(Media.entry_id == entry_id)
    result = await session.exec(statement)
    media_list = result.all()
    result = []
    for media in media_list:
        url = await storage_service.generate_presigned_url(media.s3_key)
        result.append(MediaPublic(**media.model_dump(), url=url))
    return result

@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media_from_entry(*, session: sessionDep, current_user: CurrentUser, entry_id: uuid.UUID, media_id: uuid.UUID, storage_service: StorageDep):
    """
    Delete a specific media attachment from a journal entry.
    """
    await get_entry_and_check_ownership(entry_id=entry_id, session=session, current_user=current_user)
    
    media = await session.get(Media, media_id)
    if not media or media.entry_id != entry_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media attachment not found for this journal entry")
    
    await session.delete(media)
    await session.commit()
    await storage_service.delete_file_from_s3(media.s3_key)



