import json
import os
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = Path(__file__).parent / "idea.json"


def read_ideas():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def write_ideas(ideas):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(ideas, f, ensure_ascii=False, indent=2)


class CommentCreate(BaseModel):
    author: str
    authorAvatar: str
    content: str


class IdeaCreate(BaseModel):
    title: str
    description: str
    tags: List[str]
    author: str = "匿名灵感家"
    authorAvatar: str = "https://api.dicebear.com/7.x/fun-emoji/svg?seed=anon"


class IdeaStatusUpdate(BaseModel):
    status: str


@app.get("/api/ideas")
def get_ideas():
    return read_ideas()


@app.get("/api/ideas/{idea_id}")
def get_idea(idea_id: int):
    ideas = read_ideas()
    for idea in ideas:
        if idea["id"] == idea_id:
            return idea
    raise HTTPException(status_code=404, detail="Idea not found")


@app.post("/api/ideas")
def create_idea(idea: IdeaCreate):
    ideas = read_ideas()
    max_id = max((i["id"] for i in ideas), default=0)
    new_idea = {
        "id": max_id + 1,
        "title": idea.title,
        "description": idea.description,
        "tags": idea.tags,
        "likes": 0,
        "liked": False,
        "status": "萌芽",
        "author": idea.author,
        "authorAvatar": idea.authorAvatar,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "comments": [],
    }
    ideas.insert(0, new_idea)
    write_ideas(ideas)
    return new_idea


@app.post("/api/ideas/{idea_id}/like")
def toggle_like(idea_id: int):
    ideas = read_ideas()
    for idea in ideas:
        if idea["id"] == idea_id:
            if idea["liked"]:
                idea["liked"] = False
                idea["likes"] = max(0, idea["likes"] - 1)
            else:
                idea["liked"] = True
                idea["likes"] += 1
            write_ideas(ideas)
            return {"likes": idea["likes"], "liked": idea["liked"]}
    raise HTTPException(status_code=404, detail="Idea not found")


@app.patch("/api/ideas/{idea_id}/status")
def update_status(idea_id: int, body: IdeaStatusUpdate):
    ideas = read_ideas()
    for idea in ideas:
        if idea["id"] == idea_id:
            idea["status"] = body.status
            write_ideas(ideas)
            return {"status": idea["status"]}
    raise HTTPException(status_code=404, detail="Idea not found")


@app.post("/api/ideas/{idea_id}/comments")
def add_comment(idea_id: int, comment: CommentCreate):
    ideas = read_ideas()
    for idea in ideas:
        if idea["id"] == idea_id:
            max_cid = max((c["id"] for c in idea["comments"]), default=0)
            new_comment = {
                "id": max_cid + 1,
                "author": comment.author,
                "authorAvatar": comment.authorAvatar,
                "content": comment.content,
                "createdAt": datetime.now().isoformat(timespec="seconds"),
            }
            idea["comments"].append(new_comment)
            write_ideas(ideas)
            return new_comment
    raise HTTPException(status_code=404, detail="Idea not found")
