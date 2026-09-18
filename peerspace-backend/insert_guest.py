import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./fallback.db"

engine = create_engine(DATABASE_URL)

def run():
    with engine.connect() as conn:
        try:
            conn.execute(text("INSERT INTO users (id, username, email, password_hash) VALUES (99999, 'Guest', 'guest99999@peerspace.ai', 'none') ON CONFLICT DO NOTHING;"))
            conn.commit()
            print("Guest user inserted.")
        except Exception as e:
            print("Error inserting guest:", e)

if __name__ == '__main__':
    run()
