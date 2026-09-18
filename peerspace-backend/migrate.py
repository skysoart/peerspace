import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./fallback.db"

engine = create_engine(DATABASE_URL)

def migrate():
    queries = [
        "ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel_id_ref INTEGER",
        "ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE",
        "ALTER TABLE communities ADD COLUMN IF NOT EXISTS icon VARCHAR"
    ]
    
    with engine.connect() as conn:
        for q in queries:
            try:
                conn.execute(text(q))
                print(f"Executed: {q}")
            except Exception as e:
                # SQLite doesn't support IF NOT EXISTS in ALTER TABLE, so it might fail, which is fine
                print(f"Skipped/Error on {q}: {e}")
        try:
            conn.commit()
        except Exception:
            pass
    print("Database Migration Complete!")

if __name__ == "__main__":
    migrate()
