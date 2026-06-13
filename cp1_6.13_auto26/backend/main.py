import json
import os
import random
import string
from datetime import datetime, timedelta
from typing import List, Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException, CORS
from fastapi.responses import JSONResponse
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
RECIPES_FILE = DATA_DIR / "recipes.json"
FAVORITES_FILE = DATA_DIR / "favorites.json"
SHARES_FILE = DATA_DIR / "shares.json"


class Recipe(BaseModel):
    id: str
    name: str
    image: str
    tags: List[str]
    duration: int
    difficulty: str
    steps: List[str]


class FavoritesResponse(BaseModel):
    recipeIds: List[str]
    recipes: List[Recipe]
    order: List[str]


class FavoriteAddRequest(BaseModel):
    recipeId: str


class OrderUpdateRequest(BaseModel):
    order: List[str]


class ShareResponse(BaseModel):
    shortCode: str
    expiresAt: str
    shareUrl: str


def read_json_file(file_path: Path):
    if not file_path.exists():
        return {}
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json_file(file_path: Path, data):
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_recipes() -> List[dict]:
    return read_json_file(RECIPES_FILE)


def get_recipe_by_id(recipe_id: str) -> Optional[dict]:
    recipes = load_recipes()
    for recipe in recipes:
        if recipe["id"] == recipe_id:
            return recipe
    return None


def generate_short_code(length: int = 6) -> str:
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))


app = FastAPI()

CORS(app, origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/recommend")
async def get_recommendations(count: int = 3):
    recipes = load_recipes()
    if len(recipes) <= count:
        return recipes
    return random.sample(recipes, count)


@app.get("/api/recipes/tag/{tag}")
async def get_recipes_by_tag(tag: str):
    recipes = load_recipes()
    filtered = [r for r in recipes if tag in r.get("tags", [])]
    return filtered


@app.get("/api/favorites")
async def get_favorites():
    favorites_data = read_json_file(FAVORITES_FILE)
    recipe_ids = favorites_data.get("recipeIds", [])
    order = favorites_data.get("order", [])

    recipes = []
    for rid in order:
        recipe = get_recipe_by_id(rid)
        if recipe:
            recipes.append(recipe)

    for rid in recipe_ids:
        if rid not in order:
            recipe = get_recipe_by_id(rid)
            if recipe:
                recipes.append(recipe)

    return JSONResponse(content={
        "recipeIds": recipe_ids,
        "recipes": recipes,
        "order": order if order else recipe_ids
    })


@app.post("/api/favorites")
async def add_favorite(request: FavoriteAddRequest):
    favorites_data = read_json_file(FAVORITES_FILE)
    recipe_ids = favorites_data.get("recipeIds", [])
    order = favorites_data.get("order", [])

    if request.recipeId not in recipe_ids:
        recipe_ids.append(request.recipeId)
        order.append(request.recipeId)

    favorites_data["recipeIds"] = recipe_ids
    favorites_data["order"] = order
    write_json_file(FAVORITES_FILE, favorites_data)

    return {"success": True}


@app.delete("/api/favorites/{recipe_id}")
@app.post("/api/favorites/remove")
async def remove_favorite(recipe_id: Optional[str] = None, request: Optional[FavoriteAddRequest] = None):
    if request:
        recipe_id = request.recipeId
    if not recipe_id:
        raise HTTPException(status_code=400, detail="recipeId is required")

    favorites_data = read_json_file(FAVORITES_FILE)
    recipe_ids = favorites_data.get("recipeIds", [])
    order = favorites_data.get("order", [])

    if recipe_id in recipe_ids:
        recipe_ids.remove(recipe_id)
    if recipe_id in order:
        order.remove(recipe_id)

    favorites_data["recipeIds"] = recipe_ids
    favorites_data["order"] = order
    write_json_file(FAVORITES_FILE, favorites_data)

    return {"success": True}


@app.post("/api/favorites/order")
async def update_order(request: OrderUpdateRequest):
    favorites_data = read_json_file(FAVORITES_FILE)
    favorites_data["order"] = request.order
    write_json_file(FAVORITES_FILE, favorites_data)
    return {"success": True}


@app.post("/api/favorites/share")
async def create_share():
    favorites_data = read_json_file(FAVORITES_FILE)
    recipe_ids = favorites_data.get("recipeIds", [])
    order = favorites_data.get("order", recipe_ids)

    if not recipe_ids:
        raise HTTPException(status_code=400, detail="No favorites to share")

    short_code = generate_short_code()
    expires_at = datetime.utcnow() + timedelta(hours=24)

    shares_data = read_json_file(SHARES_FILE)
    shares_data[short_code] = {
        "recipeIds": order,
        "expiresAt": expires_at.isoformat() + "Z",
        "createdAt": datetime.utcnow().timestamp()
    }
    write_json_file(SHARES_FILE, shares_data)

    return JSONResponse(content={
        "shortCode": short_code,
        "expiresAt": expires_at.isoformat() + "Z",
        "shareUrl": f"/share/{short_code}"
    })


@app.get("/api/share/{short_code}")
async def get_share(short_code: str):
    shares_data = read_json_file(SHARES_FILE)

    if short_code not in shares_data:
        raise HTTPException(status_code=404, detail="Share not found or expired")

    share = shares_data[short_code]
    expires_at = datetime.fromisoformat(share["expiresAt"].replace("Z", "+00:00"))

    if datetime.utcnow() > expires_at.replace(tzinfo=None):
        del shares_data[short_code]
        write_json_file(SHARES_FILE, shares_data)
        raise HTTPException(status_code=404, detail="Share not found or expired")

    recipes = []
    for rid in share["recipeIds"]:
        recipe = get_recipe_by_id(rid)
        if recipe:
            recipes.append(recipe)

    return recipes


@app.get("/api/tags")
async def get_all_tags():
    recipes = load_recipes()
    all_tags = set()
    for recipe in recipes:
        for tag in recipe.get("tags", []):
            all_tags.add(tag)
    return sorted(list(all_tags))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
