import asyncio
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings


@dataclass
class UploadResult:
    s3_key: str
    file_size: int | None


class StorageService:
    def __init__(self):
        self.bucket_name = settings.S3_BUCKET_NAME
        self.s3_client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

    def build_journal_media_key(
        self,
        *,
        user_id: str,
        entry_id: str,
        filename: str,
        recorded_at: datetime,
    ) -> str:
        date = recorded_at or datetime.now(timezone.utc)
        extension = Path(filename).suffix.lower()
        return (
            f"journal_media/"
            f"year={date.year}/month={date.month:02d}/day={date.day:02d}/"
            f"user_id={user_id}/"
            f"entry_id={entry_id}/"
            f"{uuid.uuid4()}{extension}"
        )

    async def upload_file_to_s3(self, *, file: UploadFile, s3_key: str) -> UploadResult:
        try:
            contents = await file.read()
            file_size = len(contents)
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=contents,
                    ContentType=file.content_type,
                )
            )
            return UploadResult(s3_key=s3_key, file_size=file_size)
        except ClientError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file to S3",
            ) from e

    async def generate_presigned_url(self, s3_key: str, expires_in: int = 3600) -> str:
        try:
            return await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.s3_client.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={"Bucket": self.bucket_name, "Key": s3_key},
                    ExpiresIn=expires_in,
                )
            )
        except ClientError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate media URL",
            ) from e

    async def delete_file_from_s3(self, s3_key: str) -> None:
        try:
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.s3_client.delete_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                )
            )
        except ClientError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete file from S3",
            ) from e