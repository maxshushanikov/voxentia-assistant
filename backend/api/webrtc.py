from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Optional
import asyncio
import logging
import re

router = APIRouter()
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.pending_candidates: Dict[str, List[dict]] = {}

    async def connect(self, room_id: str, client_id: str, websocket: WebSocket):
        await websocket.accept()
        
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
            self.pending_candidates[room_id] = []
        
        self.active_connections[room_id][client_id] = websocket
        
        for candidate in self.pending_candidates[room_id]:
            await websocket.send_json({
                "type": "ice_candidate",
                "candidate": candidate
            })

    def disconnect(self, room_id: str, client_id: str):
        if room_id in self.active_connections and client_id in self.active_connections[room_id]:
            del self.active_connections[room_id][client_id]
            
        if not self.active_connections.get(room_id):
            del self.active_connections[room_id]
            del self.pending_candidates[room_id]

    async def send_personal_message(self, message: dict, room_id: str, client_id: str):
        if room_id in self.active_connections and client_id in self.active_connections[room_id]:
            await self.active_connections[room_id][client_id].send_json(message)

    async def broadcast(self, message: dict, room_id: str, exclude_client: Optional[str] = None):
        if room_id in self.active_connections:
            for client_id, connection in self.active_connections[room_id].items():
                if client_id != exclude_client:
                    await connection.send_json(message)

    def add_ice_candidate(self, room_id: str, candidate: dict):
        if room_id not in self.pending_candidates:
            self.pending_candidates[room_id] = []
        self.pending_candidates[room_id].append(candidate)

manager = ConnectionManager()

@router.websocket("/ws/{room_id}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, client_id: str):
    await manager.connect(room_id, client_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data["type"] == "offer":
                await manager.broadcast({
                    "type": "offer",
                    "offer": data["offer"],
                    "sender": client_id
                }, room_id, exclude_client=client_id)
                
            elif data["type"] == "answer":
                await manager.broadcast({
                    "type": "answer",
                    "answer": data["answer"],
                    "sender": client_id
                }, room_id, exclude_client=client_id)
                
            elif data["type"] == "ice_candidate":
                manager.add_ice_candidate(room_id, data["candidate"])
                await manager.broadcast({
                    "type": "ice_candidate",
                    "candidate": data["candidate"],
                    "sender": client_id
                }, room_id, exclude_client=client_id)
                
    except WebSocketDisconnect:
        manager.disconnect(room_id, client_id)
        await manager.broadcast({
            "type": "user_disconnected",
            "user_id": client_id
        }, room_id)