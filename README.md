# PeerSpace

> **Keep conversations in context.**

PeerSpace is a context-aware communication tool designed to keep conversations focused and relevant. It uses AI to evaluate messages against the current conversation context and helps prevent discussions from going out of context.

## Features

* **AI-Powered Moderation**
  Uses AI to analyze messages and determine whether they are relevant to the current context.

* **Context-Aware Conversations**
  Helps keep discussions focused on the current topic instead of allowing unrelated conversations to take over.

* **Rule-Based Moderation**
  Supports custom rules that can be applied globally or to specific spaces.

* **Message Classification**
  Messages can be evaluated as:

  * `APPROVED`
  * `FLAGGED`
  * `BLOCKED`

* **Human Moderation**
  Administrators can review flagged messages and override automated decisions when required.

* **Web Application**
  A modern web interface for interacting with PeerSpace.

* **Mobile Application**
  Flutter-based mobile application for accessing PeerSpace.

* **Backend API**
  FastAPI backend handling communication, moderation, context, and data management.

## How It Works

```text
User sends a message
        |
        v
Current conversation context
        |
        v
AI moderation system
        |
        +------> APPROVED
        |
        +------> FLAGGED
        |
        +------> BLOCKED
        |
        v
Conversation continues with relevant context
```

The goal is not simply to moderate individual messages, but to evaluate them in relation to the surrounding conversation.

## Architecture

```text
                  +----------------------+
                  |       User           |
                  +----------+-----------+
                             |
                +------------+------------+
                |                         |
                v                         v
      +------------------+      +------------------+
      |  Web Frontend    |      |  Mobile App      |
      |    Next.js       |      |    Flutter       |
      +--------+---------+      +--------+---------+
               |                         |
               +------------+------------+
                            |
                            v
                  +----------------------+
                  |     FastAPI API      |
                  +----------+-----------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
      +---------------+             +---------------+
      | AI Moderation |             |   Database    |
      | Gemini API    |             | PostgreSQL /  |
      +---------------+             | SQLite        |
                                    +---------------+
```

## Project Structure

```text
peerspace/
├── peerspace-frontend/       # Next.js web application
├── peerspace-backend/        # FastAPI backend
├── peerspace-mobile/         # Flutter mobile application
├── render.yaml               # Render deployment configuration
└── README.md
```

## Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Zustand (client state)
* TanStack Query (server state)
* Framer Motion
* Lucide Icons

### Backend

* Python
* FastAPI
* SQLAlchemy
* Pydantic
* Google Gemini API

### Mobile

* Flutter
* Dart

### Database

* PostgreSQL
* SQLite

### Deployment

* Render

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/skysoart/peerspace.git
cd peerspace
```

### 2. Frontend

```bash
cd peerspace-frontend
npm install
npm run dev
```

The development server will start locally.

### 3. Backend

The backend is **two** processes: the main API and the AI moderator. The main
API calls the moderator over HTTP, so both must be running.

```bash
cd peerspace-backend
pip install -r requirements.txt
```

Create a `.env` file (see [Environment Variables](#environment-variables)), then
create the tables:

```bash
python create_tables.py
```

If you are upgrading an existing database, apply the additive column changes too:

```bash
python migrate.py
```

Start the main API on port 8000:

```bash
uvicorn main:app --reload --port 8000
```

Start the AI moderator on port 8001, in a second terminal:

```bash
uvicorn moderator:app --reload --port 8001
```

The main API expects the moderator at `http://127.0.0.1:8001` by default;
override with `MODERATOR_URL`. If the moderator is unreachable or has no API
key, messages are **flagged for human review** rather than auto-approved.

### 4. Mobile

Navigate to the Flutter project:

```bash
cd peerspace-mobile/flutter-mobile
flutter pub get
flutter run
```

## Environment Variables

### Backend (`peerspace-backend/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes | Gemini API key used by the moderator. Without it every message is flagged for review. |
| `DATABASE_URL` | no | SQLAlchemy URL. Falls back to a local SQLite file (`fallback.db`) when unset. |
| `SECRET_KEY` | yes in deployment | Signs auth tokens. If unset a random key is generated per process, so every restart logs everyone out. |
| `MODERATOR_URL` | no | Where the main API reaches the moderator. Accepts a bare origin or a full endpoint URL. Defaults to `http://127.0.0.1:8001`. |
| `FRONTEND_ORIGINS` | yes in deployment | Comma-separated browser origins allowed by CORS. Defaults to localhost:3000 only, which blocks a deployed frontend. |
| `GEMINI_MODEL` | no | Overrides the model name. Defaults to `gemini-2.0-flash`. |

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=your_database_url
SECRET_KEY=a_long_random_string
FRONTEND_ORIGINS=https://your-frontend.example.com
```

### Frontend (`peerspace-frontend/.env.local`)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the main API. Defaults to `http://127.0.0.1:8000`. |
| `NEXT_PUBLIC_WS_URL` | WebSocket base URL. Defaults to `ws://localhost:8000`. |

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

Do not commit API keys, passwords, tokens, or other secrets to the repository.

## Authentication

Signing up or logging in returns a JWT plus the user record. The frontend stores
both and sends `Authorization: Bearer <token>` on every request.

The server takes the acting user from that token. It does **not** trust a
`user_id` sent in a request body or query string, so a client cannot act on
another person's behalf.

* `POST /auth/signup` - create an account, returns `{ token, user }`
* `POST /auth/login` - returns `{ token, user }`
* `POST /auth/guest` - starts an anonymous session backed by a real token, so
  "continue as guest" works without weakening the rest of the API
* `GET /auth/me` - resolve the current user from the token alone

Permissions:

| Action | Who |
| --- | --- |
| Send a message | any signed-in user (including guests) |
| Delete a message | its author, or a community admin/moderator |
| Create a channel, edit a community, remove a member | community owner, admin, or moderator |
| Review the flagged queue, change a message status | community owner, admin, or moderator — scoped to communities they administer |

Tokens are valid for one day. When one lapses the frontend clears the session
and returns to the login screen.

## Development

PeerSpace consists of three primary components:

1. **Frontend**
   Provides the web interface and user experience.

2. **Backend**
   Provides APIs, context handling, moderation, authentication, and database interaction.

3. **Mobile**
   Provides a Flutter-based mobile interface.

Changes to one component may require corresponding updates to the API or other clients.

## Deployment

The project includes a `render.yaml` configuration for deployment using Render.

Before deploying, make sure that:

* Required environment variables are configured.
* The database is accessible from the deployed backend.
* The frontend points to the correct backend API.
* API credentials are stored securely as environment variables.

## Roadmap

Potential future improvements include:

* Improved context detection
* More granular moderation controls
* Better moderation explanations
* Conversation analytics
* Improved mobile experience
* Real-time moderation feedback
* Custom AI moderation models
* More configurable conversation rules

## Contributors

* [skysoart](https://github.com/skysoart)
* [anshmittal-os](https://github.com/anshmittal-os)
* [Dhruvtilara](https://github.com/Dhruvtilara)
* [SAUBHAGYA7](https://github.com/SAUBHAGYA7)
* [khushal123supreme](https://github.com/khushal123supreme)

## License

This project is currently not licensed. All rights are reserved by the respective contributors.
