from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(Text, nullable=False)
    email = Column(Text, nullable=False, unique=True, index=True)
    password_hash = Column(Text, nullable=False)
    group_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    profile_picture = Column(Text)


class Community(Base):
    __tablename__ = "communities"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    icon = Column(Text)  # emoji or URL


class CommunityMember(Base):
    """Tracks which users are members of which communities."""
    __tablename__ = "community_members"

    id = Column(Integer, primary_key=True)
    community_id = Column(Integer, ForeignKey("communities.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    joined_at = Column(DateTime, default=datetime.utcnow)
    role = Column(String, default="member")  # admin, moderator, member


class Channel(Base):
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True)
    community_id = Column(Integer, ForeignKey("communities.id"))
    name = Column(String, nullable=False)


class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    community_id = Column(Integer, ForeignKey("communities.id"))


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    group_id = Column(Integer, ForeignKey("communities.id"))
    channel_id_ref = Column(Integer, ForeignKey("channels.id"), nullable=True)
    message_text = Column(String)
    status = Column(String, default="APPROVED")
    ai_feedback = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)


class MessageReaction(Base):
    """Emoji reactions on messages."""
    __tablename__ = "message_reactions"

    id = Column(Integer, primary_key=True)
    message_id = Column(Integer, ForeignKey("messages.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    emoji = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ModerationSetting(Base):
    __tablename__ = "moderation_settings"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("communities.id"), unique=True)
    ai_enabled = Column(Boolean)


class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True)
    rule_type = Column(String)
    group_id = Column(Integer, ForeignKey("communities.id"))
    rule_content = Column(String)
    is_active = Column(Boolean)