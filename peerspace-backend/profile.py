from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import User
from auth import get_current_user

router = APIRouter()


# ==========================
# Pydantic Models
# ==========================

class UpdateProfileRequest(BaseModel):
    bio: str | None = None
    profile_picture: str | None = None


# ==========================
# Get Profile
# ==========================

@router.get("/{user_id}")
def get_profile(user_id: int, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "bio": user.bio,
        "profile_picture": user.profile_picture
    }


# ==========================
# Update Profile
# ==========================

@router.put("/{user_id}")
def update_profile(
    user_id: int,
    request: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own profile")

    if request.bio is not None:
        current_user.bio = request.bio

    if request.profile_picture is not None:
        current_user.profile_picture = request.profile_picture

    db.commit()
    db.refresh(current_user)

    return {
        "status": "success",
        "message": "Profile updated",
        "profile": {
            "id": current_user.id,
            "username": current_user.username,
            "bio": current_user.bio,
            "profile_picture": current_user.profile_picture
        }
    }
