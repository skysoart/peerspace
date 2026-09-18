from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Channel

router = APIRouter(prefix="/channels", tags=["channels"])


class ChannelCreate(BaseModel):
    name: str
    community_id: int


def channel_dict(c: Channel) -> dict:
    return {"id": c.id, "name": c.name, "community_id": c.community_id}


@router.post("/create")
def create_channel(data: ChannelCreate, db: Session = Depends(get_db)):
    channel = Channel(name=data.name, community_id=data.community_id)
    db.add(channel)
    db.commit()
    db.refresh(channel)
    return channel_dict(channel)


@router.get("/detail/{channel_id}")
def get_channel_detail(channel_id: int, db: Session = Depends(get_db)):
    """Return a single channel's details including community_id."""
    c = db.query(Channel).filter(Channel.id == channel_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel_dict(c)


@router.get("/{community_id}")
def get_channels(community_id: int, db: Session = Depends(get_db)):
    """Get all channels for a community."""
    channels = db.query(Channel).filter(Channel.community_id == community_id).all()
    return [channel_dict(c) for c in channels]
