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

```bash
cd peerspace-backend
pip install -r requirements.txt
```

Create an environment file and configure the required variables:

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=your_database_url
```

Start the FastAPI server:

```bash
uvicorn main:app --reload
```

### 4. Mobile

Navigate to the Flutter project:

```bash
cd peerspace-mobile/flutter-mobile
flutter pub get
flutter run
```

## Environment Variables

The backend requires environment configuration for external services and database connectivity.

Example:

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=your_database_url
```

Do not commit API keys, passwords, tokens, or other secrets to the repository.

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

* [anshmittal-os](https://github.com/anshmittal-os)
* [Dhruvtilara](https://github.com/Dhruvtilara)
* [SAUBHAGYA7](https://github.com/SAUBHAGYA7)
* [skysoart](https://github.com/skysoart)
* [khushal123supreme](https://github.com/khushal123supreme)

## License

This project is currently not licensed. All rights are reserved by the respective contributors.