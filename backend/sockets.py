from typing import Dict, Set
from collections import defaultdict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        self.leaderboard_subscribers: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id].add(websocket)

    async def subscribe_to_leaderboard(self, websocket: WebSocket):
        await websocket.accept()
        self.leaderboard_subscribers.add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
        self.leaderboard_subscribers.discard(websocket)

    async def send_personal_message(self, message: str, user_id: str):
        for connection in self.active_connections.get(user_id, set()):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection, user_id)

    async def broadcast_leaderboard(self, message: str):
        disconnected = set()
        for connection in self.leaderboard_subscribers:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.add(connection)
        
        for connection in disconnected:
            self.leaderboard_subscribers.discard(connection)

manager = ConnectionManager()