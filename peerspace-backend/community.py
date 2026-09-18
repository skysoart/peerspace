"""
Community management: members, settings, join/leave.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Community, CommunityMember, User, Channel

router = APIRouter(prefix="/communities", tags=["communities"])


class CommunityCreate(BaseModel):
    name: str
    description: str = ""
    owner_id: int = 1
    icon: str = ""


class CommunityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None


@router.post("/create")
def create_community(data: CommunityCreate, db: Session = Depends(get_db)):
    community = Community(
        name=data.name,
        description=data.description,
        owner_id=data.owner_id,
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
        user_id=data.owner_id,
        role="admin"
    )
    db.add(member)

    db.commit()
    return {"id": community.id, "name": community.name, "description": community.description, "icon": community.icon}


@router.get("/")
def get_communities(db: Session = Depends(get_db)):
    communities = db.query(Community).all()
    return [{"id": c.id, "name": c.name, "description": c.description, "icon": getattr(c, 'icon', c.name[0].upper() if c.name else "?")} for c in communities]


@router.get("/{community_id}")
def get_community(community_id: int, db: Session = Depends(get_db)):
    c = db.query(Community).filter(Community.id == community_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Community not found")
    return {"id": c.id, "name": c.name, "description": c.description, "icon": getattr(c, 'icon', c.name[0].upper()), "owner_id": c.owner_id}


@router.put("/{community_id}")
def update_community(community_id: int, data: CommunityUpdate, db: Session = Depends(get_db)):
    c = db.query(Community).filter(Community.id == community_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Community not found")
    if data.name: c.name = data.name
    if data.description is not None: c.description = data.description
    if data.icon is not None: c.icon = data.icon
    db.commit()
    return {"id": c.id, "name": c.name, "description": c.description, "icon": c.icon}


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
def join_community(community_id: int, user_id: int, db: Session = Depends(get_db)):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    existing = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id
    ).first()
    if existing:
        return {"status": "already_member"}

    member = CommunityMember(community_id=community_id, user_id=user_id, role="member")
    db.add(member)
    db.commit()
    return {"status": "joined", "community_id": community_id}


@router.post("/{community_id}/leave")
def leave_community(community_id: int, user_id: int, db: Session = Depends(get_db)):
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Not a member")

    db.delete(member)
    db.commit()
    return {"status": "left", "community_id": community_id}


@router.delete("/{community_id}/members/{user_id}")
def remove_member(community_id: int, user_id: int, db: Session = Depends(get_db)):
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"status": "removed"}