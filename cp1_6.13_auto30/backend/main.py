import json
import os
import random
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="音乐播放列表 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
SONGS_FILE = os.path.join(DATA_DIR, "songs.json")
PLAYLISTS_FILE = os.path.join(DATA_DIR, "playlists.json")


class Song(BaseModel):
    id: str
    title: str
    artist: str
    album: str
    genre: str
    duration: int
    cover: str


class PlaylistCreate(BaseModel):
    name: str
    song_ids: List[str]


class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    song_ids: Optional[List[str]] = None


class Playlist(BaseModel):
    id: str
    name: str
    song_ids: List[str]
    created_at: str


def load_songs() -> List[dict]:
    with open(SONGS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def load_playlists() -> List[dict]:
    if not os.path.exists(PLAYLISTS_FILE):
        return []
    with open(PLAYLISTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_playlists(playlists: List[dict]):
    with open(PLAYLISTS_FILE, "w", encoding="utf-8") as f:
        json.dump(playlists, f, ensure_ascii=False, indent=2)


@app.get("/api/songs")
def get_songs(genre: Optional[str] = None, search: Optional[str] = None):
    songs = load_songs()
    
    if genre:
        songs = [s for s in songs if s["genre"] == genre]
    
    if search:
        search_lower = search.lower()
        songs = [
            s for s in songs
            if search_lower in s["title"].lower()
            or search_lower in s["artist"].lower()
            or search_lower in s["album"].lower()
        ]
    
    return {"songs": songs}


@app.get("/api/songs/{song_id}")
def get_song(song_id: str):
    songs = load_songs()
    for song in songs:
        if song["id"] == song_id:
            return song
    raise HTTPException(status_code=404, detail="歌曲未找到")


@app.get("/api/genres")
def get_genres():
    songs = load_songs()
    genres = list(set(s["genre"] for s in songs))
    return {"genres": genres}


@app.get("/api/recommendations")
def get_recommendations(song_ids: str = "", limit: int = 3):
    songs = load_songs()
    current_ids = [sid for sid in song_ids.split(",") if sid]
    
    current_songs = [s for s in songs if s["id"] in current_ids]
    
    if not current_songs:
        available = [s for s in songs if s["id"] not in current_ids]
        recommendations = random.sample(available, min(limit, len(available)))
        return {"recommendations": recommendations}
    
    genre_counts = {}
    artist_counts = {}
    for s in current_songs:
        genre_counts[s["genre"]] = genre_counts.get(s["genre"], 0) + 1
        artist_counts[s["artist"]] = artist_counts.get(s["artist"], 0) + 1
    
    available = [s for s in songs if s["id"] not in current_ids]
    
    def score_song(song):
        score = 0
        if song["genre"] in genre_counts:
            score += genre_counts[song["genre"]] * 10
        if song["artist"] in artist_counts:
            score += artist_counts[song["artist"]] * 5
        score += random.random() * 3
        return score
    
    available.sort(key=score_song, reverse=True)
    recommendations = available[:limit]
    
    return {"recommendations": recommendations}


@app.get("/api/playlists")
def get_playlists():
    playlists = load_playlists()
    return {"playlists": playlists}


@app.post("/api/playlists")
def create_playlist(playlist_data: PlaylistCreate):
    import uuid
    from datetime import datetime
    
    playlists = load_playlists()
    
    new_playlist = {
        "id": str(uuid.uuid4()),
        "name": playlist_data.name,
        "song_ids": playlist_data.song_ids,
        "created_at": datetime.now().isoformat(),
    }
    
    playlists.append(new_playlist)
    save_playlists(playlists)
    
    return new_playlist


@app.get("/api/playlists/{playlist_id}")
def get_playlist(playlist_id: str):
    playlists = load_playlists()
    for p in playlists:
        if p["id"] == playlist_id:
            songs = load_songs()
            playlist_songs = [s for s in songs if s["id"] in p["song_ids"]]
            return {"playlist": p, "songs": playlist_songs}
    raise HTTPException(status_code=404, detail="歌单未找到")


@app.put("/api/playlists/{playlist_id}")
def update_playlist(playlist_id: str, update_data: PlaylistUpdate):
    playlists = load_playlists()
    for i, p in enumerate(playlists):
        if p["id"] == playlist_id:
            if update_data.name is not None:
                playlists[i]["name"] = update_data.name
            if update_data.song_ids is not None:
                playlists[i]["song_ids"] = update_data.song_ids
            save_playlists(playlists)
            return playlists[i]
    raise HTTPException(status_code=404, detail="歌单未找到")


@app.delete("/api/playlists/{playlist_id}")
def delete_playlist(playlist_id: str):
    playlists = load_playlists()
    for i, p in enumerate(playlists):
        if p["id"] == playlist_id:
            deleted = playlists.pop(i)
            save_playlists(playlists)
            return {"message": "歌单已删除", "playlist": deleted}
    raise HTTPException(status_code=404, detail="歌单未找到")
