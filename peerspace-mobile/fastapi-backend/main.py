import os
import json
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from google import genai
from dotenv import load_dotenv
import sqlite3

# 1. LOAD ENVIRONMENT VARIABLES (.env file)
load_dotenv() 

# 2. SETUP APP & CORS
app = FastAPI(title="AI Chat Moderator API (HITL Edition)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

# 3. SETUP AI CLIENT
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("WARNING: GEMINI_API_KEY is missing from your .env file!")

client = genai.Client(api_key=api_key) if api_key else genai.Client()

# 4. SETUP DATABASE (Cloud PostgreSQL / Supabase)
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./fallback.db"
    print("RUNNING ON FALLBACK SQLITE. DATABASE_URL not found.")

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==========================================
# DATABASE MODELS (Tables)
# ==========================================
class RuleDB(Base):
    __tablename__ = "rules"
    id = Column(Integer, primary_key=True, index=True)
    rule_type = Column(String, index=True) # "GENERIC" or "TOPIC_SPECIFIC"
    group_id = Column(Integer, nullable=True) 
    rule_content = Column(String) 
    is_active = Column(Boolean, default=True)

class MessageDB(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    group_id = Column(Integer)
    message_text = Column(String)
    status = Column(String) # "APPROVED", "FLAGGED", or "BLOCKED"
    ai_feedback = Column(String, nullable=True)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Temporary hook for OLD SQLite signup users
def init_old_db():
    conn = sqlite3.connect('peerspace.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    phone TEXT NOT NULL UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )''')
    conn.commit()
    conn.close()
init_old_db()

# ==========================================
# PYDANTIC MODELS (Validation)
# ==========================================
class ChatRequest(BaseModel):
    user_id: int
    group_id: int
    message: str
    tags: list[str] | None = None
    room_rules: str | None = None

class RuleCreate(BaseModel):
    rule_type: str
    group_id: int | None = None
    rule_content: str

class StatusUpdateRequest(BaseModel):
    new_status: str

class SignupRequest(BaseModel):
    username: str
    phone: str

# ==========================================
# API ENDPOINTS
# ==========================================

@app.get("/")
def health_check():
    return {"status": "Operational", "service": "AI Moderator API"}

# --- BACKWARD COMPATIBILITY SIGNUP ---
@app.post("/signup")
def signup(req: SignupRequest):
    try:
        conn = sqlite3.connect('peerspace.db')
        c = conn.cursor()
        c.execute("INSERT INTO users (username, phone) VALUES (?, ?)", (req.username, req.phone))
        user_id = c.lastrowid
        conn.commit()
        conn.close()
        return {"message": "User created successfully", "userId": user_id}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Phone number already registered")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to register user")

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
    """The Core Brain: AI evaluates message based on DB rules (3-Tier) and dynamic Space Rules."""
    
    generic_rules = db.query(RuleDB).filter(RuleDB.rule_type == "GENERIC", RuleDB.is_active == True).all()
    topic_rules = db.query(RuleDB).filter(RuleDB.rule_type == "TOPIC_SPECIFIC", RuleDB.group_id == request.group_id, RuleDB.is_active == True).all()

    generic_text = "\n".join([f"- {r.rule_content}" for r in generic_rules])
    topic_text = "\n".join([f"- {r.rule_content}" for r in topic_rules])
    
    dynamic_tags_text = ", ".join(request.tags) if request.tags else "None"
    dynamic_rules_text = request.room_rules if request.room_rules else "None"

    prompt = f"""
    You are a strict community moderator. Evaluate the user's message against these rules:
    
    Global Rules:
    {generic_text if generic_text else "None"}
    
    Database Group Rules:
    {topic_text if topic_text else "None"}
    
    Dynamic Space Tags: {dynamic_tags_text}
    Dynamic Space Rules (User Defined): {dynamic_rules_text}
    
    User Message: "{request.message}"
    
    Classify the message into one of three actions:
    1. "APPROVED": Perfectly fine, violates no rules.
    2. "FLAGGED": Borderline, suspicious, or mildly inappropriate. Needs human admin review.
    3. "BLOCKED": Severe violation (like toxicity, spam) OR it directly violates the "Dynamic Space Rules" or "Dynamic Space Tags" provided above.
    
    Respond ONLY with a raw JSON object containing exactly two keys:
    {{
      "action": "APPROVED",  // Must be EXACTLY "APPROVED", "FLAGGED", or "BLOCKED"
      "feedback": "1-sentence explanation if FLAGGED or BLOCKED, else null"
    }}
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        response_text = response.text
        response_text = response_text.replace("```json", "").replace("```", "").strip()
             
        ai_decision = json.loads(response_text)
        
        # Extract the specific action chosen by the AI
        status = ai_decision.get("action", "FLAGGED") 
        
        new_message = MessageDB(
            user_id=request.user_id,
            group_id=request.group_id,
            message_text=request.message,
            status=status,
            ai_feedback=ai_decision.get("feedback")
        )
        db.add(new_message)
        db.commit()

        # Send the exact status back to the Chat Server
        return {
            "status": "success", 
            "action": status, 
            "message": request.message,
            "feedback": ai_decision.get("feedback")
        }

    except Exception as e:
        print(f"Gemini Error: {e}")
        raise HTTPException(status_code=500, detail=f"System Error: {str(e)}")

# --- ADMIN OVERRIDE ENDPOINTS ---

@app.get("/api/admin/messages/flagged")
def get_flagged_messages(db: Session = Depends(get_db)):
    """Admin endpoint to fetch the queue of flagged messages needing review."""
    flagged_msgs = db.query(MessageDB).filter(MessageDB.status == "FLAGGED").all()
    return {"status": "success", "flagged_messages": flagged_msgs}

@app.put("/api/admin/messages/{message_id}/status")
def override_message_status(message_id: int, request: StatusUpdateRequest, db: Session = Depends(get_db)):
    """Admin endpoint to manually unblock, flag, or approve a message."""
    message = db.query(MessageDB).filter(MessageDB.id == message_id).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
        
    valid_statuses = ["APPROVED", "BLOCKED", "FLAGGED"]
    if request.new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status. Must be APPROVED, BLOCKED, or FLAGGED.")
        
    message.status = request.new_status
    db.commit()
    
    return {
        "status": "success", 
        "message_id": message.id, 
        "new_status": message.status,
        "note": "Admin override applied successfully."
    }

if __name__ == "__main__":
    import uvicorn
    import socket
    def get_local_ip():
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(('10.255.255.255', 1))
            IP = s.getsockname()[0]
        except Exception:
            IP = '127.0.0.1'
        finally:
            s.close()
        return IP
    print(f"Server running at http://{get_local_ip()}:5000")
    uvicorn.run(app, host="0.0.0.0", port=5000)
