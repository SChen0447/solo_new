import json
import os
import uuid
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from filelock import FileLock

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "src" / "data"
BOOKS_FILE = DATA_DIR / "books.json"
LOCK_FILE = DATA_DIR / "books.json.lock"

DATA_DIR.mkdir(parents=True, exist_ok=True)
if not BOOKS_FILE.exists():
    initial_data = {"books": [], "metadata": {"version": "1.0.0", "lastUpdated": "", "totalBooks": 0}}
    with open(BOOKS_FILE, "w", encoding="utf-8") as f:
        json.dump(initial_data, f, ensure_ascii=False, indent=2)

_lock = threading.Lock()
_file_lock = FileLock(str(LOCK_FILE), timeout=10)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def read_data() -> dict:
    with _lock:
        with _file_lock:
            with open(BOOKS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)


def write_data(data: dict) -> None:
    with _lock:
        with _file_lock:
            temp_file = BOOKS_FILE.with_suffix(".tmp")
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            os.replace(temp_file, BOOKS_FILE)


app = FastAPI(title="书途漂流 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DriftRecord(BaseModel):
    id: str
    bookId: str
    eventType: str
    date: str
    holderName: str
    holderContact: str
    description: str
    fromHolder: Optional[str] = None
    toHolder: Optional[str] = None


class Book(BaseModel):
    id: str
    title: str
    author: str
    coverUrl: str
    description: str
    currentHolder: str
    currentHolderContact: str
    status: str
    likes: int
    likedBy: List[str]
    driftHistory: List[DriftRecord]
    createdAt: str
    updatedAt: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid = {"available", "exchanging", "in_transit"}
        if v not in valid:
            raise ValueError(f"status must be one of {valid}")
        return v


class CreateBookRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    author: str = Field(..., min_length=1, max_length=100)
    coverUrl: str = Field(..., min_length=1)
    description: str = Field(default="", max_length=2000)
    initialHolder: str = Field(..., min_length=1, max_length=50)
    initialHolderContact: str = Field(..., min_length=1, max_length=100)


class ExchangeRequestPayload(BaseModel):
    targetBookId: str = Field(..., min_length=1)
    offeredBookId: str = Field(..., min_length=1)
    requesterName: str = Field(..., min_length=1, max_length=50)
    requesterContact: str = Field(..., min_length=1, max_length=100)
    reason: str = Field(..., min_length=1, max_length=500)


class LikeRequest(BaseModel):
    userId: str = Field(..., min_length=1, max_length=100)


@app.get("/books", response_model=List[Book])
def get_books(status: Optional[str] = None, search: Optional[str] = None):
    data = read_data()
    books = data.get("books", [])
    if status:
        valid = {"available", "exchanging", "in_transit"}
        if status not in valid:
            raise HTTPException(status_code=400, detail=f"Invalid status filter. Must be one of {valid}")
        books = [b for b in books if b["status"] == status]
    if search:
        keyword = search.lower()
        books = [
            b for b in books
            if keyword in b["title"].lower()
            or keyword in b["author"].lower()
            or keyword in b["currentHolder"].lower()
        ]
    return books


@app.post("/books", response_model=Book, status_code=201)
def create_book(payload: CreateBookRequest):
    data = read_data()
    books = data.get("books", [])

    book_id = f"book-{uuid.uuid4().hex[:8]}"
    now = utc_now_iso()
    record_id = f"record-{uuid.uuid4().hex[:8]}"

    new_record = {
        "id": record_id,
        "bookId": book_id,
        "eventType": "publish",
        "date": now,
        "holderName": payload.initialHolder,
        "holderContact": payload.initialHolderContact,
        "description": "首次发布图书",
    }

    new_book = {
        "id": book_id,
        "title": payload.title,
        "author": payload.author,
        "coverUrl": payload.coverUrl,
        "description": payload.description,
        "currentHolder": payload.initialHolder,
        "currentHolderContact": payload.initialHolderContact,
        "status": "available",
        "likes": 0,
        "likedBy": [],
        "driftHistory": [new_record],
        "createdAt": now,
        "updatedAt": now,
    }

    books.insert(0, new_book)
    data["books"] = books
    data["metadata"]["totalBooks"] = len(books)
    data["metadata"]["lastUpdated"] = now
    write_data(data)

    return new_book


@app.get("/books/{book_id}", response_model=Book)
def get_book(book_id: str):
    data = read_data()
    books = data.get("books", [])
    for book in books:
        if book["id"] == book_id:
            return book
    raise HTTPException(status_code=404, detail=f"Book with id '{book_id}' not found")


@app.post("/books/{book_id}/like", response_model=Book)
def toggle_like(book_id: str, payload: LikeRequest):
    data = read_data()
    books = data.get("books", [])
    now = utc_now_iso()

    target_idx = None
    for idx, book in enumerate(books):
        if book["id"] == book_id:
            target_idx = idx
            break

    if target_idx is None:
        raise HTTPException(status_code=404, detail=f"Book with id '{book_id}' not found")

    book = books[target_idx]
    liked_by = set(book.get("likedBy", []))

    if payload.userId in liked_by:
        liked_by.remove(payload.userId)
        book["likes"] = max(0, book.get("likes", 0) - 1)
    else:
        liked_by.add(payload.userId)
        book["likes"] = book.get("likes", 0) + 1

    book["likedBy"] = sorted(liked_by)
    book["updatedAt"] = now
    books[target_idx] = book
    data["books"] = books
    data["metadata"]["lastUpdated"] = now
    write_data(data)

    return book


@app.post("/exchange-request", status_code=201)
def create_exchange_request(payload: ExchangeRequestPayload):
    if payload.targetBookId == payload.offeredBookId:
        raise HTTPException(status_code=400, detail="targetBookId and offeredBookId cannot be the same")

    data = read_data()
    books = data.get("books", [])
    now = utc_now_iso()

    target_idx = None
    offered_idx = None
    for idx, book in enumerate(books):
        if book["id"] == payload.targetBookId:
            target_idx = idx
        if book["id"] == payload.offeredBookId:
            offered_idx = idx

    if target_idx is None:
        raise HTTPException(status_code=404, detail=f"Target book with id '{payload.targetBookId}' not found")
    if offered_idx is None:
        raise HTTPException(status_code=404, detail=f"Offered book with id '{payload.offeredBookId}' not found")

    target_book = books[target_idx]
    offered_book = books[offered_idx]

    if target_book["status"] != "available":
        raise HTTPException(status_code=400, detail=f"Target book '{payload.targetBookId}' is not available for exchange")
    if offered_book["status"] != "available":
        raise HTTPException(status_code=400, detail=f"Offered book '{payload.offeredBookId}' is not available for exchange")

    target_exchange_record = {
        "id": f"record-{uuid.uuid4().hex[:8]}",
        "bookId": payload.targetBookId,
        "eventType": "exchange",
        "date": now,
        "holderName": target_book["currentHolder"],
        "holderContact": target_book["currentHolderContact"],
        "description": f"交换请求: {payload.reason}",
        "fromHolder": target_book["currentHolder"],
        "toHolder": payload.requesterName,
    }
    target_book["driftHistory"].append(target_exchange_record)
    target_book["status"] = "exchanging"
    target_book["currentHolder"] = payload.requesterName
    target_book["currentHolderContact"] = payload.requesterContact
    target_book["updatedAt"] = now

    offered_exchange_record = {
        "id": f"record-{uuid.uuid4().hex[:8]}",
        "bookId": payload.offeredBookId,
        "eventType": "exchange",
        "date": now,
        "holderName": offered_book["currentHolder"],
        "holderContact": offered_book["currentHolderContact"],
        "description": f"作为交换图书提供，理由: {payload.reason}",
        "fromHolder": offered_book["currentHolder"],
        "toHolder": target_book["currentHolder"],
    }
    offered_book["driftHistory"].append(offered_exchange_record)
    offered_book["status"] = "in_transit"
    offered_book["updatedAt"] = now

    books[target_idx] = target_book
    books[offered_idx] = offered_book
    data["books"] = books
    data["metadata"]["lastUpdated"] = now
    write_data(data)

    return {
        "success": True,
        "targetBook": target_book,
        "offeredBook": offered_book,
        "timestamp": now,
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": utc_now_iso()}
