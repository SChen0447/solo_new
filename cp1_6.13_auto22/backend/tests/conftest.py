import json
import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture
def test_data_dir(tmp_path, monkeypatch):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    books_file = data_dir / "books.json"
    initial_data = {
        "books": [
            {
                "id": "test-book-1",
                "title": "测试图书A",
                "author": "作者甲",
                "coverUrl": "https://example.com/a.jpg",
                "description": "测试图书A的描述",
                "currentHolder": "张三",
                "currentHolderContact": "zhangsan@test.com",
                "status": "available",
                "likes": 5,
                "likedBy": ["user-1", "user-2"],
                "driftHistory": [
                    {
                        "id": "rec-1",
                        "bookId": "test-book-1",
                        "eventType": "publish",
                        "date": "2026-01-01T00:00:00Z",
                        "holderName": "张三",
                        "holderContact": "zhangsan@test.com",
                        "description": "首次发布",
                    }
                ],
                "createdAt": "2026-01-01T00:00:00Z",
                "updatedAt": "2026-01-01T00:00:00Z",
            },
            {
                "id": "test-book-2",
                "title": "测试图书B",
                "author": "作者乙",
                "coverUrl": "https://example.com/b.jpg",
                "description": "测试图书B的描述",
                "currentHolder": "李四",
                "currentHolderContact": "lisi@test.com",
                "status": "available",
                "likes": 3,
                "likedBy": [],
                "driftHistory": [
                    {
                        "id": "rec-2",
                        "bookId": "test-book-2",
                        "eventType": "publish",
                        "date": "2026-02-01T00:00:00Z",
                        "holderName": "李四",
                        "holderContact": "lisi@test.com",
                        "description": "首次发布",
                    }
                ],
                "createdAt": "2026-02-01T00:00:00Z",
                "updatedAt": "2026-02-01T00:00:00Z",
            },
            {
                "id": "test-book-3",
                "title": "不可交换图书",
                "author": "作者丙",
                "coverUrl": "https://example.com/c.jpg",
                "description": "状态为exchanging的图书",
                "currentHolder": "王五",
                "currentHolderContact": "wangwu@test.com",
                "status": "exchanging",
                "likes": 0,
                "likedBy": [],
                "driftHistory": [],
                "createdAt": "2026-03-01T00:00:00Z",
                "updatedAt": "2026-03-01T00:00:00Z",
            },
        ],
        "metadata": {"version": "1.0.0", "lastUpdated": "2026-06-13T00:00:00Z", "totalBooks": 3},
    }
    with open(books_file, "w", encoding="utf-8") as f:
        json.dump(initial_data, f, ensure_ascii=False, indent=2)

    import main as app_module

    monkeypatch.setattr(app_module, "BASE_DIR", tmp_path)
    monkeypatch.setattr(app_module, "DATA_DIR", data_dir)
    monkeypatch.setattr(app_module, "BOOKS_FILE", books_file)
    monkeypatch.setattr(app_module, "LOCK_FILE", data_dir / "books.json.lock")

    yield tmp_path


@pytest.fixture
def client(test_data_dir):
    from main import app

    with TestClient(app) as c:
        yield c
