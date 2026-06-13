import json
from typing import Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from room_manager import room_manager, Room

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, room_id: str, player_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        self.active_connections[room_id][player_id] = websocket

    def disconnect(self, room_id: str, player_id: str):
        if room_id in self.active_connections:
            if player_id in self.active_connections[room_id]:
                del self.active_connections[room_id][player_id]
            if len(self.active_connections[room_id]) == 0:
                del self.active_connections[room_id]

    async def broadcast(self, room_id: str, message: dict):
        if room_id in self.active_connections:
            for player_id, websocket in list(self.active_connections[room_id].items()):
                try:
                    state = room_manager.get_room_state(room_id, player_id)
                    if state:
                        message_copy = message.copy()
                        message_copy["state"] = state
                        await websocket.send_text(json.dumps(message_copy))
                except Exception:
                    self.disconnect(room_id, player_id)

    async def send_to_player(self, room_id: str, player_id: str, message: dict):
        if room_id in self.active_connections and player_id in self.active_connections[room_id]:
            try:
                state = room_manager.get_room_state(room_id, player_id)
                if state:
                    message_copy = message.copy()
                    message_copy["state"] = state
                    await self.active_connections[room_id][player_id].send_text(json.dumps(message_copy))
            except Exception:
                self.disconnect(room_id, player_id)


manager = ConnectionManager()


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/rooms")
async def create_room():
    room_id = room_manager.create_room()
    return {"room_id": room_id}


@app.get("/api/rooms/{room_id}")
async def get_room(room_id: str):
    room = room_manager.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {
        "room_id": room.id,
        "player_count": len(room.players),
        "game_state": room.game_state,
    }


@app.websocket("/ws/{room_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_id: str):
    room = room_manager.get_room(room_id)
    if not room or player_id not in room.players:
        await websocket.close()
        return

    await manager.connect(room_id, player_id, websocket)

    player = room.players[player_id]
    player.is_online = True

    initial_state = room_manager.get_room_state(room_id, player_id)
    await websocket.send_text(json.dumps({
        "type": "state_update",
        "state": initial_state,
    }))

    await manager.broadcast(room_id, {
        "type": "player_joined",
        "player_id": player_id,
        "player_name": player.name,
    })

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await handle_message(room_id, player_id, message)
    except WebSocketDisconnect:
        manager.disconnect(room_id, player_id)
        player.is_online = False
        await manager.broadcast(room_id, {
            "type": "player_left",
            "player_id": player_id,
        })
    except Exception:
        manager.disconnect(room_id, player_id)
        player.is_online = False


async def handle_message(room_id: str, player_id: str, message: dict):
    msg_type = message.get("type")

    if msg_type == "chat":
        content = message.get("content", "")
        if content:
            room = room_manager.get_room(room_id)
            if room and player_id in room.players:
                player = room.players[player_id]
                await manager.broadcast(room_id, {
                    "type": "chat",
                    "player_id": player_id,
                    "player_name": player.name,
                    "avatar_index": player.avatar_index,
                    "content": content,
                })

    elif msg_type == "start_game":
        if room_manager.start_game(room_id):
            await manager.broadcast(room_id, {
                "type": "game_started",
            })

    elif msg_type == "vote":
        target_id = message.get("target_id")
        if target_id and room_manager.handle_vote(room_id, player_id, target_id):
            result = room_manager.check_vote_result(room_id)
            if result:
                if result == "tie":
                    await manager.broadcast(room_id, {
                        "type": "vote_result",
                        "result": "tie",
                    })
                else:
                    room = room_manager.get_room(room_id)
                    voted_player = room.players[result] if room else None
                    await manager.broadcast(room_id, {
                        "type": "vote_result",
                        "result": "eliminated",
                        "player_id": result,
                        "player_name": voted_player.name if voted_player else "",
                    })
                    room_manager.next_phase(room_id)
                    await manager.broadcast(room_id, {
                        "type": "phase_change",
                    })
            else:
                await manager.broadcast(room_id, {
                    "type": "vote_update",
                })

    elif msg_type == "night_action":
        action = message.get("action")
        target_id = message.get("target_id")
        if room_manager.handle_night_action(room_id, player_id, action, target_id):
            await manager.send_to_player(room_id, player_id, {
                "type": "action_confirm",
                "action": action,
            })

    elif msg_type == "next_phase":
        if room_manager.next_phase(room_id):
            await manager.broadcast(room_id, {
                "type": "phase_change",
            })

    elif msg_type == "heartbeat":
        await manager.send_to_player(room_id, player_id, {
            "type": "heartbeat_ack",
        })
