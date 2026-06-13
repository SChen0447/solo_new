from pydantic import BaseModel
from typing import List


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
