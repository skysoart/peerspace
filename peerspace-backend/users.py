from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import User
from auth import get_current_user, user_dict

router = APIRouter(prefix="/users", tags=["users"])


class UserUpdate(BaseModel):
    username: Optional[str] = None


@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Never hand out password_hash, which returning the ORM object did.
    return user_dict(user)


@router.put("/{user_id}")
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own profile")

    if data.username:
        current_user.username = data.username

    db.commit()
    db.refresh(current_user)
    return user_dict(current_user)
