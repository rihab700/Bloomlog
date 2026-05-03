from sqlmodel import Session,select

from backend.app.core.security import get_hash_password
from backend.app.models.Users import UserCreate,User

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