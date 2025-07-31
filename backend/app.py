from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import uvicorn
from model import *
from config import *
from sockets import *
from database import *

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def notify_leaderboard_update():
    leaderboard = get_leaderboard()[:10]
    await manager.broadcast_leaderboard(json.dumps({
        "type": "leaderboard_update",
        "data": leaderboard
    }))

@app.websocket("/ws/user/{user_id}")
async def user_websocket(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

@app.websocket("/ws/leaderboard")
async def leaderboard_websocket(websocket: WebSocket):
    await manager.subscribe_to_leaderboard(websocket)
    try:
        leaderboard = get_leaderboard()[:10]
        await websocket.send_text(json.dumps({
            "type": "leaderboard_update",
            "data": leaderboard
        }))
        
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket, "")

@app.post("/register")
async def register(user: User):
    db = read_db()
    if not db.get("users"):
        db["users"] = {}
    
    if user.username in db["users"]:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    db["users"][user.username] = {"score": 0}
    write_db(db)
    await notify_leaderboard_update()
    return {"message": "User registered successfully"}

@app.post("/click")
async def click(request: ClickRequest):
    db = read_db()
    if not db.get("users"):
        db["users"] = {}
    
    if request.username not in db["users"]:
        raise HTTPException(status_code=404, detail="User not found")
    
    points = 10 if request.is_drag else 1
    db["users"][request.username]["score"] = db["users"][request.username].get("score", 0) + points
    write_db(db)
    
    position = get_user_position(request.username)
    leaderboard = get_leaderboard()[:10]
    
    await manager.send_personal_message(json.dumps({
        "type": "score_update",
        "data": {
            "new_score": db["users"][request.username]["score"],
            "position": position
        }
    }), request.username)
    
    await notify_leaderboard_update()
    
    return {
        "new_score": db["users"][request.username]["score"],
        "position": position,
        "leaderboard": leaderboard
    }

@app.get("/leaderboard")
async def leaderboard():
    return get_leaderboard()[:10]

@app.get("/user/{username}")
async def get_user(username: str):
    db = read_db()
    if not db.get("users") or username not in db["users"]:
        raise HTTPException(status_code=404, detail="User not found")
    
    position = get_user_position(username)
    return {
        "username": username,
        "score": db["users"][username].get("score", 0),
        "position": position
    }

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=6543,
        reload=True,
        headers=[("server", "Qualsu Europe")],
        ssl_keyfile=None if os.name == 'nt' else ssl_key,
        ssl_certfile=None if os.name == 'nt' else ssl_cert
    )
