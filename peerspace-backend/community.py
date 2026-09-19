"""
Community management: members, settings, join/leave.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Community, CommunityMember, User, Channel
from auth import get_current_user

router = APIRouter(prefix="/communities", tags=["communities"])

ADMIN_ROLES = ("admin", "moderator")


class CommunityCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = ""


class CommunityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None


def community_dict(c: Community) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "icon": c.icon or (c.name[0].upper() if c.name else "?"),
        "owner_id": c.owner_id,
    }


def require_admin(db: Session, community: Community, user: User):
    """Owner, or a member carrying an admin/moderator role."""
    if community.owner_id == user.id:
        return
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community.id,
        CommunityMember.user_id == user.id,
        CommunityMember.role.in_(ADMIN_ROLES),
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="You do not administer this community")


@router.post("/create")
def create_community(
    data: CommunityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community = Community(
        name=data.name,
        description=data.description,
        owner_id=current_user.id,
        icon=data.icon or data.name[0].upper()
    )
    db.add(community)
    db.commit()
    db.refresh(community)

    # Auto-create a #general channel
    channel = Channel(community_id=community.id, name="general")
    db.add(channel)

    # Auto-add owner as member/admin
    member = CommunityMember(
        community_id=community.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(member)

    db.commit()
    return community_dict(community)


@router.get("/")
def get_communities(db: Session = Depends(get_db)):
    return [community_dict(c) for c in db.query(Community).all()]


@router.get("/{community_id}")
def get_community(community_id: int, db: Session = Depends(get_db)):
    c = db.query(Community).filter(Community.id == community_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Community not found")
    return community_dict(c)


@router.put("/{community_id}")
def update_community(
    community_id: int,
    data: CommunityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Community).filter(Community.id == community_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Community not found")
    require_admin(db, c, current_user)

    if data.name:
        c.name = data.name
    if data.description is not None:
        c.description = data.description
    if data.icon is not None:
        c.icon = data.icon
    db.commit()
    return community_dict(c)


@router.get("/{community_id}/members")
def get_members(community_id: int, db: Session = Depends(get_db)):
    members = db.query(CommunityMember).filter(CommunityMember.community_id == community_id).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            result.append({
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "role": m.role,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None,
                "profile_picture": user.profile_picture,
            })
    return result


@router.post("/{community_id}/join")
def join_community(
    community_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    existing = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id
    ).first()
    if existing:
        return {"status": "already_member"}

    member = CommunityMember(community_id=community_id, user_id=current_user.id, role="member")
    db.add(member)
    db.commit()
    return {"status": "joined", "community_id": community_id}


@router.post("/{community_id}/leave")
def leave_community(
    community_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Not a member")

    db.delete(member)
    db.commit()
    return {"status": "left", "community_id": community_id}


@router.delete("/{community_id}/members/{user_id}")
def remove_member(
    community_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    require_admin(db, community, current_user)

    if user_id == community.owner_id:
        raise HTTPException(status_code=400, detail="The owner cannot be removed")

    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"status": "removed"}
