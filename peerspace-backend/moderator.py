"""AI moderation service.

This process only *decides*; it does not persist chat messages. The main API
(main.py) owns the messages table. Keeping persistence in one place avoids the
two services disagreeing about the schema, which previously meant messages
saved here had no channel reference at all.
"""
import os
import json

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from google import genai
from dotenv import load_dotenv

# 1. LOAD ENVIRONMENT VARIABLES (.env file)
load_dotenv()

# 2. SETUP APP & CORS
app = FastAPI(title="AI Chat Moderator API (HITL Edition)")

DEFAULT_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("FRONTEND_ORIGINS", DEFAULT_ORIGINS).split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. SETUP AI CLIENT
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("WARNING: GEMINI_API_KEY is missing. Every message will be FLAGGED for human review.")

client = genai.Client(api_key=api_key) if api_key else None

MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

# 4. SETUP DATABASE (rules only)
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./fallback.db"
    print("RUNNING ON FALLBACK SQLITE. DATABASE_URL not found.")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ==========================================
# DATABASE MODELS (Tables)
# ==========================================
class RuleDB(Base):
    __tablename__ = "rules"
    id = Column(Integer, primary_key=True, index=True)
    rule_type = Column(String, index=True)  # "GENERIC" or "TOPIC_SPECIFIC"
    group_id = Column(Integer, nullable=True)
    rule_content = Column(String)
    is_active = Column(Boolean, default=True)


Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# PYDANTIC MODELS (Validation)
# ==========================================
class ChatRequest(BaseModel):
    user_id: int
    group_id: int
    channel_id: int
    message: str


class RuleCreate(BaseModel):
    rule_type: str
    group_id: int | None = None
    rule_content: str


# ==========================================
# API ENDPOINTS
# ==========================================

@app.get("/")
def health_check():
    return {"status": "Operational", "service": "AI Moderator API"}


# --- ADMIN RULE ENDPOINTS ---

@app.post("/api/admin/rules")
def add_rule(rule: RuleCreate, db: Session = Depends(get_db)):
    """Add a new moderation rule to the database."""
    new_rule = RuleDB(**rule.model_dump())
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return {"status": "success", "rule": new_rule}


@app.get("/api/admin/rules")
def get_all_rules(db: Session = Depends(get_db)):
    """Fetch all active rules."""
    rules = db.query(RuleDB).filter(RuleDB.is_active == True).all()
    return {"status": "success", "rules": rules}


# --- CORE MODERATION ENDPOINT ---

@app.post("/api/chat/send")
def process_chat_message(request: ChatRequest, db: Session = Depends(get_db)):
    """Classify a message against the stored rules. Returns a decision only."""

    if client is None:
        return {
            "status": "success",
            "action": "FLAGGED",
            "message": request.message,
            "feedback": "System Note: moderation is unconfigured; queued for human review.",
        }

    generic_rules = db.query(RuleDB).filter(
        RuleDB.rule_type == "GENERIC", RuleDB.is_active == True
    ).all()
    topic_rules = db.query(RuleDB).filter(
        RuleDB.rule_type == "TOPIC_SPECIFIC",
        RuleDB.group_id == request.group_id,
        RuleDB.is_active == True,
    ).all()

    generic_text = "\n".join(["- %s" % r.rule_content for r in generic_rules])
    topic_text = "\n".join(["- %s" % r.rule_content for r in topic_rules])

    prompt = f"""
    You are an educational community moderator. Evaluate the user's message against these rules:

    Generic Rules:
    {generic_text if generic_text else "None"}

    Group Specific Rules:
    {topic_text if topic_text else "None"}

    User Message: "{request.message}"

    Classify the message into one of three actions:
    1. "APPROVED": Perfectly fine, violates no rules.
    2. "FLAGGED": Borderline, suspicious, or mildly inappropriate. Needs human admin review.
    3. "BLOCKED": Severe violation (e.g., extreme toxicity, hate speech, obvious spam).

    Respond ONLY with a raw JSON object containing exactly two keys:
    {{
      "action": "APPROVED",  // Must be EXACTLY "APPROVED", "FLAGGED", or "BLOCKED"
      "feedback": "1-sentence explanation if FLAGGED or BLOCKED, else null"
    }}
    """

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )

        clean_json = response.text.replace("```json", "").replace("```", "").strip()
        ai_decision = json.loads(clean_json)

        action = ai_decision.get("action", "FLAGGED")
        if action not in ("APPROVED", "FLAGGED", "BLOCKED"):
            action = "FLAGGED"

        return {
            "status": "success",
            "action": action,
            "message": request.message,
            "feedback": ai_decision.get("feedback"),
        }

    except Exception as e:
        # Fail closed: a moderation outage must not silently approve messages.
        print("Gemini API Error: %s. Falling back to FLAGGED." % e)
        return {
            "status": "success",
            "action": "FLAGGED",
            "message": request.message,
            "feedback": "System Note: Message flagged automatically due to AI service disruption.",
        }
