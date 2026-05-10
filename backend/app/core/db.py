from sqlmodel import select,SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app import crud
from app.models.Users import User, UserCreate
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(str(settings.SQLALCHEMY_DATABASE_URI), echo=True)


async def init_db(session: AsyncSession) -> None:
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next lines
    # This works because the models are already imported and registered from app.models
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    query = await session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    )
    user = query.first()
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
        )
        user = await crud.create_user(session=session, user_create=user_in)