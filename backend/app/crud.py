from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession


from app.core.security import get_hash_password, verify_password
from app.models.Users import UserCreate,User, UserUpdate

async def get_user_by_email(*,session: AsyncSession, email: str) -> User | None:
    select_statement = select(User).where(User.email == email)
    result = await session.exec(select_statement)
    user = result.first()
    return user

async def create_user(*,session: AsyncSession, user_create: UserCreate) -> User:
    db_object = User.model_validate(
        user_create, update={"hashed_password": get_hash_password(user_create.password)}
        )
    session.add(db_object)
    await session.commit()
    await session.refresh(db_object)
    return db_object

async def update_user(*,session: AsyncSession, db_user: User, user_in: UserUpdate) -> User:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_hash_password(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    return db_user

DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


async def authenticate(*, session: AsyncSession, email: str, password: str) -> User | None:
    db_user = await get_user_by_email(session=session, email=email)
    if not db_user:
        # Prevent timing attacks by running password verification even when user doesn't exist
        # This ensures the response time is similar whether or not the email exists
        verify_password(password, DUMMY_HASH)
        return None
    verified, updated_password_hash = verify_password(password, db_user.hashed_password)
    if not verified:
        return None
    if updated_password_hash:
        db_user.hashed_password = updated_password_hash
        session.add(db_user)
        await session.commit()
        await session.refresh(db_user)
    return db_user