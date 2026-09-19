import os
import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import Message, Channel, User, Community, CommunityMember
from auth import get_current_user

router = APIRouter()

# Accepts either a bare service origin (what Render injects) or a full
# endpoint URL, so the same setting works locally and in deployment.
MODERATION_PATH = "/api/chat/send"
_moderator = os.environ.get("MODERATOR_URL", "http://127.0.0.1:8001").rstrip("/")
MODERATOR_URL = _moderator if _moderator.endswith(MODERATION_PATH) else _moderator + MODERATION_PATH

ADMIN_ROLES = ("admin", "moderator")


class SendMessage(BaseModel):
    channel_id: int
    message_text: str


class StatusUpdate(BaseModel):
    new_status: str


def serialize(msg: Message, username: str) -> dict:
    return {
        "id": msg.id,
        "user_id": msg.user_id,
        "username": username,
        "channel_id": msg.channel_id_ref,
        "message_text": msg.message_text,
        "status": msg.status or "APPROVED",
        "ai_feedback": msg.ai_feedback,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


def administered_community_ids(db: Session, user: User) -> list:
    """Communities the user owns or helps moderate."""
    owned = [c.id for c in db.query(Community).filter(Community.owner_id == user.id).all()]
    staffed = [
        m.community_id
        for m in db.query(CommunityMember).filter(
            CommunityMember.user_id == user.id,
            CommunityMember.role.in_(ADMIN_ROLES),
        ).all()
    ]
    return sorted(set(owned) | set(staffed))


def moderate(user_id: int, community_id: int, channel_id: int, text: str):
    """Ask the moderator service to classify a message.

    Returns (status, feedback). If the service is unreachable we fail closed to
    FLAGGED so a human still reviews the message, rather than auto-approving it.
    """
    try:
        response = requests.post(
            MODERATOR_URL,
            json={
                "user_id": user_id,
                "group_id": community_id,
                "channel_id": channel_id,
                "message": text,
            },
            timeout=10,
        )
        if response.status_code != 200:
            return "FLAGGED", "System Note: moderation service returned an error; queued for review."
        result = response.json()
        return result.get("action", "FLAGGED"), result.get("feedback")
    except requests.RequestException:
        return "FLAGGED", "System Note: moderation service unreachable; queued for review."


@router.post("/send")
async def send_message(
    data: SendMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = db.query(Channel).filter(Channel.id == data.channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    text = data.message_text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    status, feedback = moderate(current_user.id, channel.community_id, channel.id, text)

    new_msg = Message(
        user_id=current_user.id,
        group_id=channel.community_id,
        channel_id_ref=channel.id,
        message_text=text,
        status=status,
        ai_feedback=feedback,
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    payload = serialize(new_msg, current_user.username)

    # Only push messages that cleared moderation to everyone else in the room.
    if status != "BLOCKED":
        from ws_manager import manager
        await manager.broadcast(payload, channel.id)

    return {
        "status": "success",
        "moderation_result": status,
        "feedback": feedback,
        **payload,
    }


@router.get("/flagged")
def get_flagged(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Review queue, scoped to communities the caller actually administers."""
    community_ids = administered_community_ids(db, current_user)
    if not community_ids:
        return {"status": "success", "messages": []}

    msgs = db.query(Message).filter(
        Message.status == "FLAGGED",
        Message.is_deleted == False,
        Message.group_id.in_(community_ids),
    ).order_by(Message.id.desc()).all()

    users = {u.id: u.username for u in db.query(User).all()}
    return {
        "status": "success",
        "messages": [serialize(m, users.get(m.user_id, "User %s" % m.user_id)) for m in msgs],
    }


@router.get("/admin/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community_ids = administered_community_ids(db, current_user)
    if not community_ids:
        return {"total_messages": 0, "flagged_messages": 0, "safe_messages": 0, "total_channels": 0}

    scoped = db.query(Message).filter(Message.group_id.in_(community_ids))
    return {
        "total_messages": scoped.count(),
        "flagged_messages": scoped.filter(Message.status == "FLAGGED").count(),
        "safe_messages": scoped.filter(Message.status == "APPROVED").count(),
        "total_channels": db.query(Channel).filter(Channel.community_id.in_(community_ids)).count(),
    }


def load_for_moderation(message_id: int, db: Session, current_user: User) -> Message:
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.group_id not in administered_community_ids(db, current_user):
        raise HTTPException(status_code=403, detail="You do not moderate this community")
    return msg


@router.post("/admin/override/{message_id}")
def admin_override_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = load_for_moderation(message_id, db, current_user)
    msg.status = "APPROVED"
    msg.ai_feedback = "System Note: Message forcefully approved by Admin."
    db.commit()
    return {"status": "success", "message_id": msg.id, "new_status": msg.status}


@router.put("/{message_id}/status")
def update_message_status(
    message_id: int,
    data: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    valid = ("APPROVED", "FLAGGED", "BLOCKED")
    if data.new_status not in valid:
        raise HTTPException(status_code=400, detail="Invalid status. Must be one of %s." % (valid,))

    msg = load_for_moderation(message_id, db, current_user)
    msg.status = data.new_status
    db.commit()
    return {"status": "success", "message_id": msg.id, "new_status": msg.status}


@router.delete("/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    is_author = msg.user_id == current_user.id
    if not is_author and msg.group_id not in administered_community_ids(db, current_user):
        raise HTTPException(status_code=403, detail="You can only delete your own messages")

    msg.is_deleted = True
    db.commit()
    return {"status": "deleted", "message_id": message_id}


@router.get("/{channel_id}")
def get_channel_messages(channel_id: int, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    messages = db.query(Message).filter(
        Message.channel_id_ref == channel_id,
        Message.is_deleted == False,
        Message.status != "BLOCKED",
    ).order_by(Message.id.asc()).all()

    users = {u.id: u.username for u in db.query(User).all()}
    return {
        "status": "success",
        "messages": [serialize(m, users.get(m.user_id, "User %s" % m.user_id)) for m in messages],
    }
