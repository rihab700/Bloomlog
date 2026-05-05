from sqlmodel import Session,select

from backend.app.core.security import get_hash_password
from backend.app.models.Users import UserCreate,User, UserUpdate

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