from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")


def read_data():
    if not os.path.exists(DATA_FILE):
        return {"pieces": [], "comments": {}}
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def write_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class CommentCreate(BaseModel):
    author: str
    content: str


class PieceCreate(BaseModel):
    title: str
    code: str
    language: str
    author: str
    tags: List[str]


class Comment(BaseModel):
    id: str
    piece_id: str
    author: str
    content: str
    created_at: str


class Piece(BaseModel):
    id: str
    title: str
    code: str
    language: str
    author: str
    tags: List[str]
    likes: int
    favorites: int
    created_at: str


class PieceDetail(Piece):
    comments: List[Comment]


@app.get("/api/pieces")
def get_pieces(
    search: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
):
    data = read_data()
    pieces = data.get("pieces", [])

    if language and language != "all":
        pieces = [p for p in pieces if p["language"].lower() == language.lower()]

    if search:
        search_lower = search.lower()
        pieces = [
            p
            for p in pieces
            if search_lower in p["title"].lower()
            or search_lower in p["code"].lower()
            or any(search_lower in tag.lower() for tag in p["tags"])
        ]

    pieces.sort(key=lambda x: x["created_at"], reverse=True)

    return {"pieces": pieces}


@app.post("/api/pieces")
def create_piece(piece: PieceCreate):
    data = read_data()
    now = datetime.now().isoformat()
    new_id = str(int(datetime.now().timestamp() * 1000))

    new_piece = {
        "id": new_id,
        "title": piece.title,
        "code": piece.code,
        "language": piece.language,
        "author": piece.author,
        "tags": piece.tags,
        "likes": 0,
        "favorites": 0,
        "created_at": now,
    }

    data["pieces"].append(new_piece)
    data["comments"][new_id] = []
    write_data(data)

    return new_piece


@app.get("/api/pieces/{piece_id}")
def get_piece(piece_id: str):
    data = read_data()
    pieces = data.get("pieces", [])
    comments = data.get("comments", {})

    piece = next((p for p in pieces if p["id"] == piece_id), None)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")

    piece_comments = comments.get(piece_id, [])
    piece_comments.sort(key=lambda x: x["created_at"], reverse=True)

    return {**piece, "comments": piece_comments}


@app.post("/api/pieces/{piece_id}/comment")
def add_comment(piece_id: str, comment: CommentCreate):
    data = read_data()
    pieces = data.get("pieces", [])
    comments = data.get("comments", {})

    piece = next((p for p in pieces if p["id"] == piece_id), None)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")

    now = datetime.now().isoformat()
    new_comment_id = str(int(datetime.now().timestamp() * 1000))

    new_comment = {
        "id": new_comment_id,
        "piece_id": piece_id,
        "author": comment.author,
        "content": comment.content,
        "created_at": now,
    }

    if piece_id not in comments:
        comments[piece_id] = []
    comments[piece_id].append(new_comment)

    write_data(data)

    return new_comment


@app.post("/api/pieces/{piece_id}/like")
def like_piece(piece_id: str):
    data = read_data()
    pieces = data.get("pieces", [])

    piece = next((p for p in pieces if p["id"] == piece_id), None)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")

    piece["likes"] = piece.get("likes", 0) + 1
    write_data(data)

    return {"likes": piece["likes"]}


@app.post("/api/pieces/{piece_id}/favorite")
def favorite_piece(piece_id: str):
    data = read_data()
    pieces = data.get("pieces", [])

    piece = next((p for p in pieces if p["id"] == piece_id), None)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")

    piece["favorites"] = piece.get("favorites", 0) + 1
    write_data(data)

    return {"favorites": piece["favorites"]}
