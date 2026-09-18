import os
import socket
import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types

app = Flask(__name__)
CORS(app)

# Load Gemini API Key from the environment (never hardcode credentials)
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set. Export it or add it to your .env file.")
client = genai.Client(api_key=GEMINI_API_KEY)

DB_PATH = 'peerspace.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    phone TEXT NOT NULL UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )''')
    conn.commit()
    conn.close()

init_db()

@app.route('/', methods=['GET'])
def index():
    return jsonify({"status": "API is running"})

@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    if not data or 'username' not in data or 'phone' not in data:
        return jsonify({"error": "Username and phone are required"}), 400
    
    username = data['username']
    phone = data['phone']
    
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("INSERT INTO users (username, phone) VALUES (?, ?)", (username, phone))
        user_id = c.lastrowid
        conn.commit()
        conn.close()
        return jsonify({"message": "User created successfully", "userId": user_id}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Phone number already registered"}), 409
    except Exception as e:
        print(f"Error during signup: {e}")
        return jsonify({"error": "Failed to register user"}), 500

@app.route('/moderate', methods=['POST'])
def moderate():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "Text to moderate is required"}), 400
    
    text = data['text']
    tags = data.get('tags', [])
    room_rules = data.get('room_rules', '')
    
    prompt = f'''You are an AI moderator for a specific chat room. You must enforce the room's specific rules and topic tags.
    
Room Tags (Topics): {', '.join(tags) if tags else 'None'}
Room Custom Rules: {room_rules if room_rules else 'None'}

Your ONLY job is to determine if the message violates the Room Custom Rules or is completely off-topic from the Room Tags.

If there are room rules defined, you MUST enforce them STRICTLY. If a rule says "no talking about studying", and the user says "I like study", you MUST BLOCK IT.

Return a JSON object EXACTLY in this format, and nothing else (do not wrap in markdown):
{{
    "is_appropriate": <boolean, false if it violates rules or tags, true otherwise>,
    "reason": "<string explaining why it complies or violates the specific rules>"
}}

Text to analyze: "{text}"'''
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        # We try to parse the JSON from Gemini or just return the text
        import json
        import re
        
        # Try to extract JSON from markdown if Gemini encapsulates it
        response_text = response.text
        match = re.search(r'```json\n(.*?)\n```', response_text, re.DOTALL)
        if match:
            response_text = match.group(1)
            
        try:
            moderation_result = json.loads(response_text)
        except json.JSONDecodeError:
            # Fallback if not proper JSON
            moderation_result = {"is_appropriate": True, "reason": response.text}

        return jsonify({
            "text": text,
            "moderation": moderation_result
        })
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return jsonify({"error": "Failed to moderate text"}), 500

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == '__main__':
    local_ip = get_local_ip()
    print(f"Server is starting...")
    print(f"Make sure to point your Flutter app's baseUrl to: http://{local_ip}:5000")
    print("Running on http://0.0.0.0:5000 ...")
    app.run(host='0.0.0.0', port=5000)
