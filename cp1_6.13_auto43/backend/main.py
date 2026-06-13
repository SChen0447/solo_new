# backend/main.py
# 数据流向: 前端请求 -> FastAPI路由 -> 读写 products.json / cart.json / orders.json -> JSON响应
# 被调用关系: 通过 Vite 代理 /api/* 被前端 apiService 调用

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from pathlib import Path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
PRODUCTS_FILE = BASE_DIR / "products.json"
CART_FILE = BASE_DIR / "cart.json"
ORDERS_FILE = BASE_DIR / "orders.json"


def read_json(filepath: Path) -> dict:
    if not filepath.exists():
        if filepath == PRODUCTS_FILE:
            return {"products": []}
        elif filepath == CART_FILE:
            return {"items": [], "total": 0}
        elif filepath == ORDERS_FILE:
            return {"orders": []}
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(filepath: Path, data: dict) -> None:
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class CartItem(BaseModel):
    productId: int
    quantity: int


class OrderItem(BaseModel):
    productId: int
    name: str
    price: float
    quantity: int


class OrderRequest(BaseModel):
    items: List[OrderItem]
    total: float
    address: str
    deliveryTime: str


# GET /api/products - 获取所有商品，支持按产地筛选
@app.get("/api/products")
def get_products(origin: Optional[str] = None, category: Optional[str] = None):
    data = read_json(PRODUCTS_FILE)
    products = data.get("products", [])

    if origin and origin != "all":
        products = [p for p in products if p.get("origin") == origin]

    if category and category != "all":
        products = [p for p in products if category in p.get("season", [])]

    return {"products": products}


# GET /api/products/{id} - 获取单个商品详情
@app.get("/api/products/{product_id}")
def get_product(product_id: int):
    data = read_json(PRODUCTS_FILE)
    products = data.get("products", [])
    product = next((p for p in products if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    return {"product": product}


# GET /api/cart - 获取购物车
@app.get("/api/cart")
def get_cart():
    return read_json(CART_FILE)


# POST /api/cart - 添加/更新购物车商品
@app.post("/api/cart")
def update_cart(cart_item: CartItem):
    data = read_json(CART_FILE)
    items = data.get("items", [])

    existing = next((i for i in items if i["productId"] == cart_item.productId), None)
    if existing:
        existing["quantity"] += cart_item.quantity
        if existing["quantity"] <= 0:
            items = [i for i in items if i["productId"] != cart_item.productId]
    else:
        if cart_item.quantity > 0:
            items.append({"productId": cart_item.productId, "quantity": cart_item.quantity})

    products_data = read_json(PRODUCTS_FILE)
    products = products_data.get("products", [])
    total = 0.0
    for item in items:
        product = next((p for p in products if p["id"] == item["productId"]), None)
        if product:
            total += product["price"] * item["quantity"]

    result = {"items": items, "total": round(total, 2)}
    write_json(CART_FILE, result)
    return result


# DELETE /api/cart/{product_id} - 删除购物车商品
@app.delete("/api/cart/{product_id}")
def remove_from_cart(product_id: int):
    data = read_json(CART_FILE)
    items = [i for i in data.get("items", []) if i["productId"] != product_id]

    products_data = read_json(PRODUCTS_FILE)
    products = products_data.get("products", [])
    total = 0.0
    for item in items:
        product = next((p for p in products if p["id"] == item["productId"]), None)
        if product:
            total += product["price"] * item["quantity"]

    result = {"items": items, "total": round(total, 2)}
    write_json(CART_FILE, result)
    return result


# GET /api/orders - 获取所有订单
@app.get("/api/orders")
def get_orders():
    return read_json(ORDERS_FILE)


# POST /api/orders - 创建新订单
@app.post("/api/orders")
def create_order(order: OrderRequest):
    data = read_json(ORDERS_FILE)
    orders = data.get("orders", [])

    new_order = {
        "id": len(orders) + 1,
        "items": [i.model_dump() for i in order.items],
        "total": order.total,
        "address": order.address,
        "deliveryTime": order.deliveryTime,
        "status": "已下单",
        "createdAt": __import__("datetime").datetime.now().isoformat()
    }
    orders.append(new_order)
    write_json(ORDERS_FILE, {"orders": orders})

    write_json(CART_FILE, {"items": [], "total": 0})

    return {"success": True, "order": new_order}
