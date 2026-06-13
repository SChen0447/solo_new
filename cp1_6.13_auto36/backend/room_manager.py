import uuid
import random
import threading
from typing import Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class Player:
    id: str
    name: str
    avatar_index: int
    role: Optional[str] = None
    is_alive: bool = True
    is_online: bool = True


@dataclass
class Room:
    id: str
    players: Dict[str, Player] = field(default_factory=dict)
    game_state: str = "waiting"
    day_count: int = 0
    phase: str = "waiting"
    votes: Dict[str, str] = field(default_factory=dict)
    night_action: Dict[str, str] = field(default_factory=dict)


ROLES = ["狼人", "狼人", "预言家", "女巫", "猎人", "村民", "村民", "村民"]

AVATAR_COLORS = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#FF8C42",
    "#6C5CE7",
]


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self._lock = threading.Lock()

    def create_room(self) -> str:
        with self._lock:
            room_id = str(uuid.uuid4())[:6].upper()
            while room_id in self.rooms:
                room_id = str(uuid.uuid4())[:6].upper()
            self.rooms[room_id] = Room(id=room_id)
            return room_id

    def get_room(self, room_id: str) -> Optional[Room]:
        with self._lock:
            return self.rooms.get(room_id)

    def add_player(self, room_id: str, player_name: str) -> Optional[Player]:
        with self._lock:
            room = self.rooms.get(room_id)
            if not room:
                return None
            if len(room.players) >= 8:
                return None

            player_id = str(uuid.uuid4())
            avatar_index = len(room.players) % len(AVATAR_COLORS)
            player = Player(
                id=player_id,
                name=player_name,
                avatar_index=avatar_index,
            )
            room.players[player_id] = player
            return player

    def remove_player(self, room_id: str, player_id: str) -> bool:
        with self._lock:
            room = self.rooms.get(room_id)
            if not room or player_id not in room.players:
                return False
            del room.players[player_id]
            if len(room.players) == 0:
                del self.rooms[room_id]
            return True

    def start_game(self, room_id: str) -> bool:
        with self._lock:
            room = self.rooms.get(room_id)
            if not room or len(room.players) < 4:
                return False
            if room.game_state != "waiting":
                return False

            room.game_state = "playing"
            room.day_count = 1
            room.phase = "night"

            player_ids = list(room.players.keys())
            random.shuffle(player_ids)
            num_players = len(player_ids)

            role_set = ROLES[:num_players]
            random.shuffle(role_set)

            for i, player_id in enumerate(player_ids):
                room.players[player_id].role = role_set[i]
                room.players[player_id].is_alive = True

            room.votes = {}
            room.night_action = {}

            return True

    def handle_vote(self, room_id: str, voter_id: str, target_id: str) -> bool:
        with self._lock:
            room = self.rooms.get(room_id)
            if not room or room.phase != "day":
                return False
            if voter_id not in room.players or target_id not in room.players:
                return False
            if not room.players[voter_id].is_alive:
                return False

            room.votes[voter_id] = target_id
            return True

    def check_vote_result(self, room_id: str) -> Optional[str]:
        with self._lock:
            room = self.rooms.get(room_id)
            if not room:
                return None

            alive_players = [p for p in room.players.values() if p.is_alive]
            if len(room.votes) < len(alive_players):
                return None

            vote_counts: Dict[str, int] = {}
            for target_id in room.votes.values():
                vote_counts[target_id] = vote_counts.get(target_id, 0) + 1

            max_votes = max(vote_counts.values())
            voted_out = [pid for pid, count in vote_counts.items() if count == max_votes]

            if len(voted_out) == 1:
                room.players[voted_out[0]].is_alive = False
                return voted_out[0]

            return "tie"

    def handle_night_action(self, room_id: str, player_id: str, action: str, target_id: Optional[str] = None) -> bool:
        with self._lock:
            room = self.rooms.get(room_id)
            if not room or room.phase != "night":
                return False
            if player_id not in room.players:
                return False

            player = room.players[player_id]
            if not player.is_alive:
                return False

            if player.role == "狼人" and target_id:
                room.night_action["wolf_kill"] = target_id
            elif player.role == "预言家" and target_id:
                room.night_action["seer_check"] = target_id
            elif player.role == "女巫":
                if action == "save":
                    room.night_action["witch_save"] = True
                elif action == "poison" and target_id:
                    room.night_action["witch_poison"] = target_id
            elif player.role == "猎人":
                pass

            return True

    def next_phase(self, room_id: str) -> bool:
        with self._lock:
            room = self.rooms.get(room_id)
            if not room:
                return False

            if room.phase == "night":
                room.phase = "day"
                if "wolf_kill" in room.night_action and "witch_save" not in room.night_action:
                    target_id = room.night_action["wolf_kill"]
                    if target_id in room.players:
                        room.players[target_id].is_alive = False
                if "witch_poison" in room.night_action:
                    target_id = room.night_action["witch_poison"]
                    if target_id in room.players:
                        room.players[target_id].is_alive = False
                room.votes = {}
                room.night_action = {}
            elif room.phase == "day":
                room.phase = "night"
                room.day_count += 1
                room.votes = {}

            return True

    def check_game_end(self, room_id: str) -> Optional[str]:
        with self._lock:
            room = self.rooms.get(room_id)
            if not room:
                return None

            alive_wolves = [p for p in room.players.values() if p.is_alive and p.role == "狼人"]
            alive_villagers = [p for p in room.players.values() if p.is_alive and p.role != "狼人"]
            alive_all = [p for p in room.players.values() if p.is_alive]

            if len(alive_all) == 0:
                return "draw"

            if len(alive_wolves) == 0:
                return "villagers_win"
            if len(alive_villagers) == 0 and len(alive_wolves) > 0:
                return "wolves_win"
            if len(alive_wolves) >= len(alive_villagers):
                return "wolves_win"

            if len(alive_wolves) == 1 and len(alive_villagers) == 1 and len(alive_all) == 2:
                remaining_villager = alive_villagers[0]
                if remaining_villager.role == "猎人":
                    return "draw"

            return None

    def get_room_state(self, room_id: str, player_id: str) -> Optional[dict]:
        with self._lock:
            room = self.rooms.get(room_id)
            if not room:
                return None

            player = room.players.get(player_id)
            if not player:
                return None

            players_list = []
            for pid, p in room.players.items():
                player_info = {
                    "id": pid,
                    "name": p.name,
                    "avatar_index": p.avatar_index,
                    "is_alive": p.is_alive,
                    "is_online": p.is_online,
                    "role": None,
                }
                if pid == player_id or room.game_state == "ended":
                    player_info["role"] = p.role
                players_list.append(player_info)

            state = {
                "room_id": room.id,
                "game_state": room.game_state,
                "day_count": room.day_count,
                "phase": room.phase,
                "players": players_list,
                "my_role": player.role,
                "votes_count": len(room.votes),
            }

            winner = self.check_game_end(room_id)
            if winner:
                state["winner"] = winner
                room.game_state = "ended"

            return state


room_manager = RoomManager()
