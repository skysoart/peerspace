import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from models import Message, Channel, User, Community

router = APIRouter()

MODERATOR_URL = "http://127.0.0.1:8001/api/chat/send"


class SendMessage(BaseModel):
    user_id: int
    channel_id: int
    message_text: str


class DeleteMessage(BaseModel):
    user_id: int


@router.post("/send")
async def send_message(data: SendMessage, db: Session = Depends(get_db)):
    try:
        channel = db.query(Channel).filter(Channel.id == data.channel_id).first()
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        # Send to AI moderator
        response = requests.post(
            MODERATOR_URL,
            json={
                "user_id": data.user_id,
                "group_id": channel.community_id,
                "channel_id": data.channel_id,
                "message": data.message_text
            },
            timeout=10
        )

        if response.status_code != 200:
            # Fallback: save message with pending status
            status = "APPROVED"
            feedback = None
            msg_id = None
        else:
            result = response.json()
            status = result.get("action", "APPROVED")
            feedback = result.get("feedback")
            msg_id = result.get("id")

        # If moderator didn't save message, save it ourselves
        if not msg_id:
            new_msg = Message(
                user_id=data.user_id,
                group_id=channel.community_id,  # Use community_id for group_id
                channel_id_ref=data.channel_id,
                message_text=data.message_text,
                status=status,
                ai_feedback=feedback
            )
            db.add(new_msg)
            db.commit()
            db.refresh(new_msg)
            msg_id = new_msg.id

        # Broadcast via WebSocket
        from ws_manager import manager
        import json
        user = db.query(User).filter(User.id == data.user_id).first()
        username = user.username if user else f"User {data.user_id}"

        await manager.broadcast(json.dumps({
            "id": msg_id,
            "user_id": data.user_id,
            "username": username,
            "channel_id": data.channel_id,
            "message_text": data.message_text,
            "status": status,
            "ai_feedback": feedback,
            "created_at": datetime.utcnow().isoformat(),
        }), data.channel_id)

        return {
            "status": "success",
            "moderation_result": status,
            "feedback": feedback,
            "id": msg_id,
            "message_text": data.message_text,
            "user_id": data.user_id,
            "created_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Message processing failed: {str(e)}")


@router.get("/{channel_id}")
def get_channel_messages(channel_id: int, db: Session = Depends(get_db)):
    # Lookup community_id from channel
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    # Messages are stored as group_id = community_id
    messages = db.query(Message).filter(
        Message.group_id == channel.community_id,
        Message.is_deleted == False
    ).order_by(Message.id.asc()).all()

    formatted = []
    for msg in messages:
        user = db.query(User).filter(User.id == msg.user_id).first()
        formatted.append({
            "id": msg.id,
            "user_id": msg.user_id,
            "username": user.username if user else f"User {msg.user_id}",
            "channel_id": channel_id,
            "message_text": msg.message_text,
            "status": msg.status or "APPROVED",
            "ai_feedback": msg.ai_feedback,
            "created_at": msg.created_at.isoformat() if hasattr(msg, 'created_at') and msg.created_at else None,
        })

    return {"status": "success", "messages": formatted}


@router.delete("/{message_id}")
def delete_message(message_id: int, user_id: int, db: Session = Depends(get_db)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    # Soft delete
    msg.is_deleted = True
    db.commit()
    return {"status": "deleted", "message_id": message_id}


@router.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    total_messages = db.query(Message).count()
    flagged_messages = db.query(Message).filter(Message.status == 'FLAGGED').count()
    safe_messages = db.query(Message).filter(Message.status == 'APPROVED').count()
    total_channels = db.query(Channel).count()

    return {
        "total_messages": total_messages,
        "flagged_messages": flagged_messages,
        "safe_messages": safe_messages,
        "total_channels": total_channels
    }


@router.post("/admin/override/{message_id}")
def admin_override_message(message_id: int, db: Session = Depends(get_db)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    msg.status = "APPROVED"
    msg.ai_feedback = "System Note: Message forcefully approved by Admin."
    db.commit()

    return {"status": "success", "message_id": message_id}