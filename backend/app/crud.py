from sqlmodel import Session,select

from app.core.security import get_hash_password, verify_password
from app.models.Users import UserCreate,User, UserUpdate

def get_user_by_email(*,session: Session, email: str) -> User | None:
    select_statement = select(User).where(User.email == email)
    user = session.exec(select_statement).first()
    return user

def create_user(*,session: Session, user_create: UserCreate) -> User:
    db_object = User.model_validate(
        user_create, update={"hashed_password": get_hash_password(user_create.password)}
        )
    session.add(db_object)
    session.commit()
    session.refresh(db_object)
    return db_object

def update_user(*,session: Session, db_user: User, user_in: UserUpdate) -> User:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_hash_password(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
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
        session.commit()
        session.refresh(db_user)
    return db_user