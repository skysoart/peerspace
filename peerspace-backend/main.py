import os

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from community import router as community_router
from auth import router as auth_router
from chat import router as chat_router
from channels import router as channels_router
from users import router as users_router
from profile import router as profile_router
from ws_manager import manager

app = FastAPI(title="PeerSpace API")

# Allowed browser origins. Defaults to local dev; set FRONTEND_ORIGINS to a
# comma-separated list in deployment or the browser will block the real site.
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

# Create database tables
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(community_router)
app.include_router(channels_router)
app.include_router(profile_router, prefix="/profile", tags=["profile"])
app.include_router(chat_router, prefix="/messages", tags=["messages"])


@app.websocket("/ws/{channel_id}")
async def websocket_endpoint(websocket: WebSocket, channel_id: int):
    await manager.connect(websocket, channel_id)
    try:
        while True:
            # Messages are created over HTTP; this loop just keeps the socket
            # open and lets us notice when the client goes away.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel_id)


@app.get("/")
def root():
    return {"message": "PeerSpace backend running"}
