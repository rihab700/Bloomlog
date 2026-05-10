import asyncio
import logging

from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.db import engine, init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def main() -> None:
    logger.info("Creating initial data")
    async with async_session() as session:
        await init_db(session)
    logger.info("Initial data created")


if __name__ == "__main__":
    asyncio.run(main())