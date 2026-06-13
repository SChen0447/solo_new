def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "timestamp" in data


def test_get_books_success(client):
    resp = client.get("/books")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 3
    titles = {b["title"] for b in data}
    assert "测试图书A" in titles
    assert "测试图书B" in titles


def test_get_books_filter_status_valid(client):
    resp = client.get("/books", params={"status": "available"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    for book in data:
        assert book["status"] == "available"


def test_get_books_filter_status_invalid(client):
    resp = client.get("/books", params={"status": "invalid_status"})
    assert resp.status_code == 400
    data = resp.json()
    assert "Invalid status filter" in data["detail"]


def test_get_books_search_by_title(client):
    resp = client.get("/books", params={"search": "图书A"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["title"] == "测试图书A"


def test_get_books_search_by_holder(client):
    resp = client.get("/books", params={"search": "张三"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["currentHolder"] == "张三"


def test_get_book_by_id_success(client):
    resp = client.get("/books/test-book-1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "test-book-1"
    assert data["title"] == "测试图书A"
    assert "driftHistory" in data
    assert len(data["driftHistory"]) >= 1


def test_get_book_by_id_not_found(client):
    resp = client.get("/books/nonexistent-id")
    assert resp.status_code == 404
    data = resp.json()
    assert "not found" in data["detail"]


def test_create_book_success(client):
    payload = {
        "title": "新发布的图书",
        "author": "新作者",
        "coverUrl": "https://example.com/new.jpg",
        "description": "这是一本新发布的测试图书",
        "initialHolder": "测试用户",
        "initialHolderContact": "testuser@test.com",
    }
    resp = client.post("/books", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == payload["title"]
    assert data["author"] == payload["author"]
    assert data["currentHolder"] == payload["initialHolder"]
    assert data["status"] == "available"
    assert data["likes"] == 0
    assert len(data["driftHistory"]) == 1
    assert data["driftHistory"][0]["eventType"] == "publish"

    resp_all = client.get("/books")
    assert len(resp_all.json()) == 4


def test_create_book_missing_required_field(client):
    payload = {
        "title": "",
        "author": "新作者",
        "coverUrl": "https://example.com/new.jpg",
        "initialHolder": "测试用户",
        "initialHolderContact": "testuser@test.com",
    }
    resp = client.post("/books", json=payload)
    assert resp.status_code == 422


def test_create_book_missing_field_author(client):
    payload = {
        "title": "有标题没作者",
        "coverUrl": "https://example.com/new.jpg",
        "initialHolder": "测试用户",
        "initialHolderContact": "testuser@test.com",
    }
    resp = client.post("/books", json=payload)
    assert resp.status_code == 422


def test_toggle_like_add_like(client):
    payload = {"userId": "new-user-999"}
    resp = client.post("/books/test-book-1/like", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["likes"] == 6
    assert "new-user-999" in data["likedBy"]


def test_toggle_like_remove_like(client):
    payload = {"userId": "user-1"}
    resp = client.post("/books/test-book-1/like", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["likes"] == 4
    assert "user-1" not in data["likedBy"]


def test_toggle_like_book_not_found(client):
    payload = {"userId": "user-1"}
    resp = client.post("/books/nonexistent/like", json=payload)
    assert resp.status_code == 404


def test_toggle_like_missing_user_id(client):
    resp = client.post("/books/test-book-1/like", json={})
    assert resp.status_code == 422


def test_exchange_request_success(client):
    payload = {
        "targetBookId": "test-book-1",
        "offeredBookId": "test-book-2",
        "requesterName": "交换请求者",
        "requesterContact": "requester@test.com",
        "reason": "我非常想读这本书，可以用我的图书B来交换",
    }
    resp = client.post("/exchange-request", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["success"] is True
    assert data["targetBook"]["status"] == "exchanging"
    assert data["targetBook"]["currentHolder"] == "交换请求者"
    assert data["offeredBook"]["status"] == "in_transit"
    assert len(data["targetBook"]["driftHistory"]) == 2
    assert data["targetBook"]["driftHistory"][-1]["eventType"] == "exchange"


def test_exchange_request_same_book(client):
    payload = {
        "targetBookId": "test-book-1",
        "offeredBookId": "test-book-1",
        "requesterName": "交换请求者",
        "requesterContact": "requester@test.com",
        "reason": "测试用同一本书交换",
    }
    resp = client.post("/exchange-request", json=payload)
    assert resp.status_code == 400
    assert "cannot be the same" in resp.json()["detail"]


def test_exchange_request_target_not_found(client):
    payload = {
        "targetBookId": "nonexistent-target",
        "offeredBookId": "test-book-2",
        "requesterName": "交换请求者",
        "requesterContact": "requester@test.com",
        "reason": "测试目标不存在",
    }
    resp = client.post("/exchange-request", json=payload)
    assert resp.status_code == 404
    assert "Target book" in resp.json()["detail"]


def test_exchange_request_offered_not_found(client):
    payload = {
        "targetBookId": "test-book-1",
        "offeredBookId": "nonexistent-offered",
        "requesterName": "交换请求者",
        "requesterContact": "requester@test.com",
        "reason": "测试提供图书不存在",
    }
    resp = client.post("/exchange-request", json=payload)
    assert resp.status_code == 404
    assert "Offered book" in resp.json()["detail"]


def test_exchange_request_target_not_available(client):
    payload = {
        "targetBookId": "test-book-3",
        "offeredBookId": "test-book-1",
        "requesterName": "交换请求者",
        "requesterContact": "requester@test.com",
        "reason": "测试目标不可交换",
    }
    resp = client.post("/exchange-request", json=payload)
    assert resp.status_code == 400
    assert "not available" in resp.json()["detail"]


def test_exchange_request_missing_fields(client):
    payload = {
        "targetBookId": "test-book-1",
        "offeredBookId": "test-book-2",
    }
    resp = client.post("/exchange-request", json=payload)
    assert resp.status_code == 422


def test_exchange_request_empty_reason(client):
    payload = {
        "targetBookId": "test-book-1",
        "offeredBookId": "test-book-2",
        "requesterName": "交换请求者",
        "requesterContact": "requester@test.com",
        "reason": "",
    }
    resp = client.post("/exchange-request", json=payload)
    assert resp.status_code == 422
