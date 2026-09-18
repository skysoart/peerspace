from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from community import router as community_router
from auth import router as auth_router
from chat import router as chat_router
from channels import router as channels_router
from users import router as users_router

app = FastAPI()

# Allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
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
app.include_router(chat_router, prefix="/messages", tags=["messages"])

from ws_manager import manager
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/{channel_id}")
async def websocket_endpoint(websocket: WebSocket, channel_id: int):
    await manager.connect(websocket, channel_id)
    try:
        while True:
            # wait for messages but do nothing as HTTP handles creation
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel_id)

@app.get("/")
def root():
    return {"message": "PeerSpace backend running"}